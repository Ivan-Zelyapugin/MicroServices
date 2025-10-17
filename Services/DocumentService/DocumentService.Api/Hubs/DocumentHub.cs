using DocumentService.Api.HubMetrics; // подключаем наши метрики
using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Document;
using DocumentService.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Prometheus;

namespace DocumentService.Api.Hubs
{
    public class DocumentHub
        (IConnectionTracker connectionTracker,
        IDocumentService documentService,
        IDocumentParticipantService documentParticipantService,
        IUserRepository userRepository
        ) : BaseHub
    {
        public async Task CreateDocument(CreateDocumentRequest request)
        {
            using (DocumentHubMetrics.CreateDocumentDuration.NewTimer())
            {
                try
                {
                    request.CreatorId = Id;

                    var users = request.Usernames != null && request.Usernames.Any()
                        ? await userRepository.GetUsersByUsernamesAsync(request.Usernames)
                        : new List<DbUser>();

                    request.UserIds = users?.Select(u => u.Id).ToList() ?? new List<int>();

                    var document = await documentService.CreateDocument(request);

                    var connectionIds = connectionTracker
                        .SelectConnectionIds(request.UserIds)
                        .Append(Context.ConnectionId);

                    await Task.WhenAll(connectionIds.Select(connectionId =>
                        Groups.AddToGroupAsync(connectionId, $"Document{document.Id}")));

                    await Clients.Caller.SendAsync("DocumentCreated", document);
                    await Clients.Group($"Document{document.Id}")
                        .SendAsync("AddedToDocument", request.UserIds);

                    DocumentHubMetrics.DocumentsCreated.Inc(); 
                }
                catch (Exception e)
                {
                    throw new HubException(e.Message);
                }
            }
        }

        public async Task DeleteDocument(int documentId)
        {
            using (DocumentHubMetrics.DeleteDocumentDuration.NewTimer())
            {
                try
                {
                    await documentService.DeleteDocument(documentId, Id);
                    await Clients.Group($"Document{documentId}").SendAsync("DocumentDeleted", documentId);

                    var connectionIds = connectionTracker.SelectConnectionIds(new List<int> { Id });
                    await Task.WhenAll(connectionIds.Select(connectionId =>
                        Groups.RemoveFromGroupAsync(connectionId, $"Document{documentId}")));

                    DocumentHubMetrics.DocumentsDeleted.Inc();
                }
                catch (Exception e)
                {
                    throw new HubException(e.Message);
                }
            }
        }

        public async Task RenameDocument(int documentId, string newName)
        {
            using (DocumentHubMetrics.RenameDocumentDuration.NewTimer())
            {
                try
                {
                    await documentService.RenameDocument(documentId, newName, Id);

                    await Clients.Group($"Document{documentId}")
                        .SendAsync("DocumentRenamed", documentId, newName);

                    DocumentHubMetrics.DocumentsRenamed.Inc();
                }
                catch (Exception e)
                {
                    throw new HubException(e.Message);
                }
            }
        }

        public override async Task OnConnectedAsync()
        {
            connectionTracker.TrackConnection(Context.ConnectionId, Id);

            DocumentHubMetrics.ActiveConnections.Inc(); 

            var documentParticipants = await documentParticipantService.GetDocumentParticipantsByUserId(Id);
            var documentIds = documentParticipants.Select(x => x.DocumentId);
            await Task.WhenAll(documentIds.Select(documentId =>
                Groups.AddToGroupAsync(Context.ConnectionId, $"Document{documentId}")));

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            connectionTracker.UntrackConnection(Context.ConnectionId);

            DocumentHubMetrics.ActiveConnections.Dec(); 

            await base.OnDisconnectedAsync(exception);
        }
    }
}
