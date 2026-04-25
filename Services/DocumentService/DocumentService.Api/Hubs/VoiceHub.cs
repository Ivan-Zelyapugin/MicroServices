using DocumentService.DataAccess.Repositories.Interfaces;
using DocumentService.Services.Interfaces;
using DocumentService.Services.Models;
using Microsoft.AspNetCore.SignalR;

namespace DocumentService.Api.Hubs
{
    public class VoiceHub : BaseHub
    {
        private readonly IVoiceSessionManager _voiceSessionManager;
        private readonly IDocumentParticipantRepository _documentParticipantRepository;
        private readonly ILogger<VoiceHub> _logger;

        public VoiceHub(
            IVoiceSessionManager voiceSessionManager,
            IDocumentParticipantRepository documentParticipantRepository,
            ILogger<VoiceHub> logger)
        {
            _voiceSessionManager = voiceSessionManager;
            _documentParticipantRepository = documentParticipantRepository;
            _logger = logger;
        }

        public async Task<IReadOnlyCollection<VoiceParticipant>> JoinVoice(int documentId)
        {
            _logger.LogInformation(
                "[VoiceHub] JoinVoice START user={UserId} conn={ConnId} doc={DocId}",
                Id, Context.ConnectionId, documentId);

            try
            {
                var isParticipant = await _documentParticipantRepository
                    .IsDocumentParticipantExists(Id, documentId);

                if (!isParticipant)
                {
                    _logger.LogWarning(
                        "[VoiceHub] JoinVoice DENIED user={UserId} doc={DocId}",
                        Id, documentId);

                    throw new HubException("Нет доступа к документу");
                }

                var existingParticipants = _voiceSessionManager.GetParticipants(documentId);

                _logger.LogInformation(
                    "[VoiceHub] JoinVoice existing connections={Count}",
                    existingParticipants.Count);

                var currentParticipant = new VoiceParticipant
                {
                    ConnectionId = Context.ConnectionId,
                    UserId = Id,
                    Username = Username,
                    IsMuted = false,
                    IsScreenSharing = false
                };

                _voiceSessionManager.AddOrUpdateParticipant(documentId, currentParticipant);

                await Groups.AddToGroupAsync(
                    Context.ConnectionId,
                    $"Voice{documentId}");

                _logger.LogInformation(
                    "[VoiceHub] JoinVoice added to group Voice{DocId} conn={ConnId}",
                    documentId, Context.ConnectionId);

                await Clients.Group($"Voice{documentId}")
                    .SendAsync("UserJoinedVoice", currentParticipant);

                _logger.LogInformation(
                    "[VoiceHub] JoinVoice broadcast UserJoinedVoice conn={ConnId}",
                    Context.ConnectionId);

                return existingParticipants;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[VoiceHub] JoinVoice ERROR user={UserId}",
                    Id);

                throw;
            }
        }

        public async Task LeaveVoice(int documentId)
        {
            _logger.LogInformation(
                "[VoiceHub] LeaveVoice user={UserId} conn={ConnId} doc={DocId}",
                Id, Context.ConnectionId, documentId);

            try
            {
                _voiceSessionManager.RemoveConnection(documentId, Context.ConnectionId);

                await Groups.RemoveFromGroupAsync(
                    Context.ConnectionId,
                    $"Voice{documentId}");

                await Clients.Group($"Voice{documentId}")
                    .SendAsync("UserLeftVoice", Context.ConnectionId);

                _logger.LogInformation(
                    "[VoiceHub] LeaveVoice broadcast done conn={ConnId}",
                    Context.ConnectionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[VoiceHub] LeaveVoice ERROR conn={ConnId}",
                    Context.ConnectionId);

                throw;
            }
        }

        public async Task SetMute(int documentId, bool isMuted)
        {
            if (!_voiceSessionManager.SetMuted(documentId, Context.ConnectionId, isMuted, out var participant)
                || participant is null)
            {
                return;
            }

            await Clients.Group($"Voice{documentId}")
                .SendAsync("UserMuteChanged", participant.ConnectionId, participant.IsMuted);
        }

        public async Task SetScreenSharing(int documentId, bool isScreenSharing)
        {
            if (!_voiceSessionManager.SetScreenSharing(documentId, Context.ConnectionId, isScreenSharing, out var participant)
                || participant is null)
            {
                return;
            }

            await Clients.Group($"Voice{documentId}")
                .SendAsync("UserScreenShareChanged", participant.ConnectionId, participant.IsScreenSharing);
        }

        // -------- WebRTC signaling --------

        public async Task SendOffer(string targetConnectionId, string offer)
        {
            _logger.LogInformation(
                "[VoiceHub] SendOffer from={From} to={To}",
                Context.ConnectionId, targetConnectionId);

            try
            {
                if (string.IsNullOrWhiteSpace(targetConnectionId))
                {
                    _logger.LogWarning("[VoiceHub] SendOffer invalid target");
                    return;
                }

                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveOffer", Context.ConnectionId, offer);

                _logger.LogInformation("[VoiceHub] SendOffer OK");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[VoiceHub] SendOffer ERROR");
                throw;
            }
        }

        public async Task SendAnswer(string targetConnectionId, string answer)
        {
            _logger.LogInformation(
                "[VoiceHub] SendAnswer from={From} to={To}",
                Context.ConnectionId, targetConnectionId);

            try
            {
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveAnswer", Context.ConnectionId, answer);

                _logger.LogInformation("[VoiceHub] SendAnswer OK");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[VoiceHub] SendAnswer ERROR");
                throw;
            }
        }

        public async Task SendIceCandidate(string targetConnectionId, string candidate)
        {
            _logger.LogInformation(
                "[VoiceHub] SendIceCandidate from={From} to={To}",
                Context.ConnectionId, targetConnectionId);

            try
            {
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidate);

                _logger.LogInformation("[VoiceHub] SendIceCandidate OK");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[VoiceHub] SendIceCandidate ERROR");
                throw;
            }
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            _logger.LogInformation(
                "[VoiceHub] DISCONNECT conn={ConnId}",
                Context.ConnectionId);

            try
            {
                var affectedDocumentIds = _voiceSessionManager.RemoveConnectionFromAll(Context.ConnectionId);

                foreach (var documentId in affectedDocumentIds)
                {
                    await Clients.Group($"Voice{documentId}")
                        .SendAsync("UserLeftVoice", Context.ConnectionId);
                }

                _logger.LogInformation(
                    "[VoiceHub] Removed from all sessions conn={ConnId}, docs={DocCount}",
                    Context.ConnectionId, affectedDocumentIds.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[VoiceHub] Disconnect cleanup ERROR conn={ConnId}",
                    Context.ConnectionId);
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}