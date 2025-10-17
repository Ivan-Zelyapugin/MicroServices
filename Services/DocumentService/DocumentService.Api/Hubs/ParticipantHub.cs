using DocumentService.Api.HubMetrics;
using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Models.Document;
using DocumentService.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Prometheus;

namespace DocumentService.Api.Hubs
{
    public class ParticipantHub(IConnectionTracker connectionTracker,
        IDocumentService documentService,
        IDocumentParticipantService documentParticipantService,
        IUserRepository userRepository
        ) : BaseHub
    {
        public async Task AddUsersToDocument(AddUsersToDocumentRequest request)
        {
            using (ParticipantHubMetrics.AddUsersDuration.NewTimer())
            {
                try
                {
                    request.RequestingUserId = Id;

                    var users = await userRepository.GetUsersByUsernamesAsync(request.Usernames);
                    if (users == null || !users.Any())
                    {
                        throw new HubException("Не удалось найти пользователей по указанным email");
                    }

                    request.UserIds = users.Select(u => u.Id).ToList();

                    await documentService.AddUsersToDocument(request);

                    var connectionIds = connectionTracker.SelectConnectionIds(request.UserIds);
                    await Task.WhenAll(connectionIds.Select(connectionId =>
                        Groups.AddToGroupAsync(connectionId, $"Document{request.DocumentId}")));

                    await Clients.Group($"Document{request.DocumentId}")
                        .SendAsync("AddedToDocument", request.UserIds);

                    ParticipantHubMetrics.UsersAddedToDocument.Inc();
                }
                catch (Exception e)
                {
                    throw new HubException(e.Message);
                }
            }
        }

        public async Task ChangeUserRoleInDocument(int documentId, int userId, string newRole)
        {
            using (ParticipantHubMetrics.ChangeUserRoleDuration.NewTimer())
            {
                try
                {
                    await documentParticipantService.ChangeUserRoleInDocument(documentId, userId, newRole, Id);

                    await Clients.Group($"Document{documentId}")
                        .SendAsync("UserRoleChanged", documentId, userId, newRole);

                    ParticipantHubMetrics.UserRolesChanged.Inc();
                }
                catch (Exception e)
                {
                    throw new HubException(e.Message);
                }
            }
        }

        public async Task RemoveUserFromDocument(int documentId, int userId)
        {
            using (ParticipantHubMetrics.RemoveUserDuration.NewTimer())
            {
                try
                {
                    await documentParticipantService.RemoveUserFromDocument(documentId, userId, Id);

                    var connectionIds = connectionTracker.SelectConnectionIds(new List<int> { userId });
                    await Task.WhenAll(connectionIds.Select(connectionId =>
                        Groups.RemoveFromGroupAsync(connectionId, $"Document{documentId}")));

                    await Clients.Group($"Document{documentId}")
                        .SendAsync("UserRemoved", documentId, userId);

                    ParticipantHubMetrics.UsersRemovedFromDocument.Inc();
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

            ParticipantHubMetrics.ActiveConnections.Inc();

            var documentParticipants = await documentParticipantService.GetDocumentParticipantsByUserId(Id);
            var documentIds = documentParticipants.Select(x => x.DocumentId);
            await Task.WhenAll(documentIds.Select(documentId =>
                Groups.AddToGroupAsync(Context.ConnectionId, $"Document{documentId}")));

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            connectionTracker.UntrackConnection(Context.ConnectionId);

            ParticipantHubMetrics.ActiveConnections.Dec();

            await base.OnDisconnectedAsync(exception);
        }
    }
}
