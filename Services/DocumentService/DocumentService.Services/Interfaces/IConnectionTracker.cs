namespace DocumentService.Services.Interfaces
{
    public interface IConnectionTracker
    {
        int ConnectionsCount { get; }
        int ConnectedUsersCount { get; }
        void TrackConnection(string connectionId, int userId);
        void UntrackConnection(string connectionId);
        bool IsUserConnected(int userId);
        IEnumerable<int> SelectConnectedUsers(IEnumerable<int> userIds);
        IEnumerable<TUser> SelectConnectedUsers<TUser>(IEnumerable<TUser> users, Func<TUser, int> idGetter);
        IEnumerable<string> SelectConnectionIds(IEnumerable<int> userIds);
    }
}
