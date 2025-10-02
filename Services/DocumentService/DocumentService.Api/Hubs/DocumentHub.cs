using DocumentService.DataAccess.Models;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Document;
using DocumentService.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

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
            try
            {
                request.CreatorId = Id;

                Console.WriteLine("CreatorId - " + request.CreatorId);

                var users = request.Email != null && request.Email.Any()
                    ? await userRepository.GetUsersByEmailsAsync(request.Email)
                    : new List<DbUser>();

                Console.WriteLine("users - " + users);

                request.UserIds = users?.Select(u => u.Id).ToList() ?? new List<int>();

                Console.WriteLine("request.UserIds - " + request.UserIds);

                var document = await documentService.CreateDocument(request);

                Console.WriteLine("document - " + document);

                var connectionIds = connectionTracker.SelectConnectionIds(request.UserIds).Append(Context.ConnectionId);

                Console.WriteLine("connectionIds - " + connectionIds);

                await Task.WhenAll(connectionIds.Select(connectionId => Groups.AddToGroupAsync(connectionId, $"Document{document.Id}")));

                await Clients.Caller.SendAsync("DocumentCreated", document);
                await Clients.Group($"Document{document.Id}").SendAsync("AddedToDocument", request.UserIds);
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public async Task DeleteDocument(int documentId)
        {
            try
            {
                await documentService.DeleteDocument(documentId, Id);
                await Clients.Group($"Document{documentId}").SendAsync("DocumentDeleted", documentId);

                var connectionIds = connectionTracker.SelectConnectionIds(new List<int> { Id });
                await Task.WhenAll(connectionIds.Select(connectionId => Groups.RemoveFromGroupAsync(connectionId, $"Document{documentId}")));
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public async Task RenameDocument(int documentId, string newName)
        {
            try
            {
                await documentService.RenameDocument(documentId, newName, Id);

                await Clients.Group($"Document{documentId}").SendAsync("DocumentRenamed", documentId, newName);
            }
            catch (Exception e)
            {
                throw new HubException(e.Message);
            }
        }

        public override async Task OnConnectedAsync()
        {
            connectionTracker.TrackConnection(Context.ConnectionId, Id);

            var documentParticipants = await documentParticipantService.GetDocumentParticipantsByUserId(Id);
            var documentIds = documentParticipants.Select(x => x.DocumentId);
            await Task.WhenAll(documentIds.Select(documentId => Groups.AddToGroupAsync(Context.ConnectionId, $"Document{documentId}")));

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            connectionTracker.UntrackConnection(Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
