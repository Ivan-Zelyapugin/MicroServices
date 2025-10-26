using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using VoiceChatService.Application.Interfaces;
using VoiceChatService.Domain.Models;
using VoiceChatService.Domain.Models.Enums;

namespace VoiceChatService.Api.Hubs
{
    public class VoiceChatHub : Hub
    {
        private readonly IVoiceChatService _chatService;

        public VoiceChatHub(IVoiceChatService chatService)
        {
            _chatService = chatService;
        }

        public async Task JoinRoom(int documentId, int userId, string username)
        {
            var connectionId = Context.ConnectionId;
            Console.WriteLine($"[JoinRoom] UserId={userId}, Username={username}, ConnectionId={connectionId}, DocumentId={documentId}");

            var participant = new VoiceParticipant
            {
                UserId = userId,
                Username = username,
                ConnectionId = connectionId,
                Role = VoiceRole.Participant,
                AudioState = MediaState.Active,
                VideoState = MediaState.Inactive,
                IsScreenSharing = false
            };

            await Groups.AddToGroupAsync(connectionId, $"room_{documentId}");

            if (userId <= 0)
            {
                Console.WriteLine($"[JoinRoom] Ошибка: некорректный UserId={userId}");
                await Clients.Caller.SendAsync("JoinRoomError", "Некорректный UserId");
                return;
            }

            var room = await _chatService.JoinRoomAsync(documentId, participant);

            Console.WriteLine($"[JoinRoom] Room state after join: {JsonSerializer.Serialize(room.Participants)}");

            var existing = room.Participants.Values
                .Where(p => p.ConnectionId != connectionId)
                .GroupBy(p => p.UserId)
                .Select(g => g.Last())
                .Select(p => new
                {
                    p.UserId,
                    p.Username,
                    p.Role,
                    p.ConnectionId,
                    p.AudioState,
                    p.VideoState,
                    p.IsScreenSharing
                })
                .ToList();

            Console.WriteLine($"[JoinRoom] Existing participants sent to caller: {JsonSerializer.Serialize(existing)}");

            await Clients.Caller.SendAsync("ExistingParticipants", existing);

            Console.WriteLine($"[JoinRoom] Notifying others about new participant: {JsonSerializer.Serialize(participant)}");

            await Clients.GroupExcept($"room_{documentId}", connectionId)
                .SendAsync("ParticipantJoined", new
                {
                    participant.UserId,
                    participant.Username,
                    participant.Role,
                    participant.ConnectionId,
                    participant.AudioState,
                    participant.VideoState,
                    participant.IsScreenSharing
                });
        }

        public async Task LeaveRoom(int documentId, int userId)
        {
            Console.WriteLine($"[LeaveRoom] UserId={userId}, DocumentId={documentId}");
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.LeaveRoomAsync(documentId, userId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"room_{documentId}");

            Console.WriteLine($"[LeaveRoom] Room state after leave: {JsonSerializer.Serialize(room?.Participants)}");

            await Clients.Group($"room_{documentId}")
                .SendAsync("ParticipantLeft", userId);
        }

        public async Task ToggleAudio(int documentId, int userId, MediaState newState)
        {
            Console.WriteLine($"[ToggleAudio] UserId={userId}, NewState={newState}");
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.SetAudioStateAsync(documentId, userId, newState);
            await Clients.Group($"room_{documentId}")
                .SendAsync("AudioStateChanged", userId, newState);

            Console.WriteLine($"[ToggleAudio] Room state: {JsonSerializer.Serialize(room.Participants)}");
        }

        public async Task ToggleVideo(int documentId, int userId, MediaState newState)
        {
            Console.WriteLine($"[ToggleVideo] UserId={userId}, NewState={newState}");
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.SetVideoStateAsync(documentId, userId, newState);
            await Clients.Group($"room_{documentId}")
                .SendAsync("VideoStateChanged", userId, newState);

            Console.WriteLine($"[ToggleVideo] Room state: {JsonSerializer.Serialize(room.Participants)}");
        }

        public async Task ToggleScreenShare(int documentId, int userId, bool isSharing)
        {
            Console.WriteLine($"[ToggleScreenShare] UserId={userId}, IsSharing={isSharing}");
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.ToggleScreenShareAsync(documentId, userId, isSharing);
            await Clients.Group($"room_{documentId}")
                .SendAsync("ScreenShareStateChanged", userId, isSharing);

            Console.WriteLine($"[ToggleScreenShare] Room state: {JsonSerializer.Serialize(room.Participants)}");
        }

        public async Task SendOffer(string targetConnectionId, string offer)
        {
            Console.WriteLine($"[SendOffer] From={Context.ConnectionId} To={targetConnectionId}, Offer={offer}");
            try
            {
                var offerObj = JsonSerializer.Deserialize<Dictionary<string, string>>(offer);
                var sdp = offerObj?["sdp"] ?? offer; // Если не JSON, используем как есть
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveOffer", Context.ConnectionId, sdp);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendOffer] Error parsing offer: {ex.Message}");
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveOffer", Context.ConnectionId, offer); // Фоллбэк
            }
        }

        public async Task SendAnswer(string targetConnectionId, string answer)
        {
            Console.WriteLine($"[SendAnswer] From={Context.ConnectionId} To={targetConnectionId}, Answer={answer}");
            try
            {
                var answerObj = JsonSerializer.Deserialize<Dictionary<string, string>>(answer);
                var sdp = answerObj?["sdp"] ?? answer;
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveAnswer", Context.ConnectionId, sdp);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendAnswer] Error parsing answer: {ex.Message}");
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveAnswer", Context.ConnectionId, answer);
            }
        }

        public async Task SendIceCandidate(string targetConnectionId, string candidate)
        {
            Console.WriteLine($"[SendIceCandidate] From={Context.ConnectionId} To={targetConnectionId}, Candidate={candidate}");
            try
            {
                var candidateObj = JsonSerializer.Deserialize<Dictionary<string, object>>(candidate);
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidateObj);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendIceCandidate] Error parsing candidate: {ex.Message}");
                await Clients.Client(targetConnectionId)
                    .SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidate);
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"[OnDisconnected] ConnectionId={Context.ConnectionId}");
            var allRooms = await _chatService.GetAllActiveRoomsAsync();
            foreach (var room in allRooms)
            {
                var participant = room.Participants.Values.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (participant != null)
                {
                    Console.WriteLine($"[OnDisconnected] Removing participant UserId={participant.UserId} from RoomId={room.DocumentId}");
                    await _chatService.LeaveRoomAsync(room.DocumentId, participant.UserId);
                    await Clients.Group($"room_{room.DocumentId}")
                        .SendAsync("ParticipantLeft", participant.UserId);

                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"room_{room.DocumentId}");
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
