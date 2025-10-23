using Microsoft.AspNetCore.SignalR;
using VoiceChatService.Application.Interfaces;
using VoiceChatService.Domain.Models;

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
            var participant = new VoiceParticipant
            {
                UserId = userId,
                Username = username,
                ConnectionId = Context.ConnectionId
            };

            var room = await _chatService.JoinRoomAsync(documentId, participant);

            await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomId);

            // уведомляем всех участников
            await Clients.Group(room.RoomId)
                .SendAsync("ParticipantJoined", participant);
        }

        public async Task LeaveRoom(int documentId, int userId)
        {
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.LeaveRoomAsync(documentId, userId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.RoomId);

            await Clients.Group(room.RoomId)
                .SendAsync("ParticipantLeft", userId);
        }

        public async Task ToggleMute(int documentId, int userId, bool mute)
        {
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.MuteParticipantAsync(documentId, userId, mute);
            await Clients.Group(room.RoomId)
                .SendAsync("ParticipantMuted", userId, mute);
        }

        public async Task ToggleCamera(int documentId, int userId, bool cameraOn)
        {
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.ToggleCameraAsync(documentId, userId, cameraOn);
            await Clients.Group(room.RoomId)
                .SendAsync("ParticipantCameraToggled", userId, cameraOn);
        }

        public async Task ToggleScreenShare(int documentId, int userId, bool isSharing)
        {
            var room = await _chatService.GetRoomStateAsync(documentId);
            if (room == null) return;

            await _chatService.ToggleScreenShareAsync(documentId, userId, isSharing);
            await Clients.Group(room.RoomId)
                .SendAsync("ParticipantScreenSharingToggled", userId, isSharing);
        }

        public async Task SendOffer(string targetConnectionId, string offer)
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveOffer", Context.ConnectionId, offer);
        }

        public async Task SendAnswer(string targetConnectionId, string answer)
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveAnswer", Context.ConnectionId, answer);
        }

        public async Task SendIceCandidate(string targetConnectionId, string candidate)
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidate);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // ищем все комнаты, где этот ConnectionId
            var allRooms = await _chatService.GetAllActiveRoomsAsync();
            foreach (var room in allRooms)
            {
                var participant = room.Participants.Values.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (participant != null)
                {
                    await _chatService.LeaveRoomAsync(room.DocumentId, participant.UserId);
                    await Clients.Group(room.RoomId)
                        .SendAsync("ParticipantLeft", participant.UserId);

                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.RoomId);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
