using DocumentService.Services.Interfaces;
using DocumentService.Services.Models;
using System.Collections.Concurrent;

namespace DocumentService.Services
{
    public class VoiceSessionManager : IVoiceSessionManager
    {
        private readonly ConcurrentDictionary<int, Dictionary<string, VoiceParticipant>> _sessions = new();

        public IReadOnlyCollection<VoiceParticipant> GetParticipants(int documentId)
        {
            if (!_sessions.TryGetValue(documentId, out var participants))
            {
                return Array.Empty<VoiceParticipant>();
            }

            lock (participants)
            {
                return participants.Values
                    .Select(CloneParticipant)
                    .ToList();
            }
        }

        public IReadOnlyCollection<string> GetConnectionIds(int documentId)
        {
            if (!_sessions.TryGetValue(documentId, out var participants))
            {
                return Array.Empty<string>();
            }

            lock (participants)
            {
                return participants.Keys.ToList();
            }
        }

        public void AddOrUpdateParticipant(int documentId, VoiceParticipant participant)
        {
            var participants = _sessions.GetOrAdd(documentId, _ => new Dictionary<string, VoiceParticipant>());

            lock (participants)
            {
                participants[participant.ConnectionId] = CloneParticipant(participant);
            }
        }

        public VoiceParticipant? RemoveConnection(int documentId, string connectionId)
        {
            if (!_sessions.TryGetValue(documentId, out var participants))
            {
                return null;
            }

            lock (participants)
            {
                if (!participants.Remove(connectionId, out var removed))
                {
                    return null;
                }

                if (participants.Count == 0)
                {
                    _sessions.TryRemove(documentId, out _);
                }

                return CloneParticipant(removed);
            }
        }

        public IReadOnlyCollection<int> RemoveConnectionFromAll(string connectionId)
        {
            var affectedDocumentIds = new List<int>();

            foreach (var kvp in _sessions)
            {
                var participants = kvp.Value;
                lock (participants)
                {
                    if (!participants.Remove(connectionId))
                    {
                        continue;
                    }

                    affectedDocumentIds.Add(kvp.Key);

                    if (participants.Count == 0)
                    {
                        _sessions.TryRemove(kvp.Key, out _);
                    }
                }
            }

            return affectedDocumentIds;
        }

        public bool SetMuted(int documentId, string connectionId, bool isMuted, out VoiceParticipant? participant)
        {
            participant = null;

            if (!_sessions.TryGetValue(documentId, out var participants))
            {
                return false;
            }

            lock (participants)
            {
                if (!participants.TryGetValue(connectionId, out var existingParticipant))
                {
                    return false;
                }

                existingParticipant.IsMuted = isMuted;
                participant = CloneParticipant(existingParticipant);
                return true;
            }
        }

        public bool SetScreenSharing(int documentId, string connectionId, bool isScreenSharing, out VoiceParticipant? participant)
        {
            participant = null;

            if (!_sessions.TryGetValue(documentId, out var participants))
            {
                return false;
            }

            lock (participants)
            {
                if (!participants.TryGetValue(connectionId, out var existingParticipant))
                {
                    return false;
                }

                existingParticipant.IsScreenSharing = isScreenSharing;
                participant = CloneParticipant(existingParticipant);
                return true;
            }
        }

        private static VoiceParticipant CloneParticipant(VoiceParticipant participant)
        {
            return new VoiceParticipant
            {
                ConnectionId = participant.ConnectionId,
                UserId = participant.UserId,
                Username = participant.Username,
                IsMuted = participant.IsMuted,
                IsScreenSharing = participant.IsScreenSharing
            };
        }
    }
}
