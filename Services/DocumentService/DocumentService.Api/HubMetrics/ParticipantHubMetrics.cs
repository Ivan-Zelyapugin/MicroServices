using Prometheus;

namespace DocumentService.Api.HubMetrics
{
    public static class ParticipantHubMetrics
    {
        public static readonly Counter UsersAddedToDocument = Metrics.CreateCounter(
            "document_users_added_total",
            "Общее количество добавлений пользователей в документы");

        public static readonly Counter UsersRemovedFromDocument = Metrics.CreateCounter(
            "document_users_removed_total",
            "Общее количество удалённых пользователей из документов");

        public static readonly Counter UserRolesChanged = Metrics.CreateCounter(
            "document_user_roles_changed_total",
            "Общее количество изменений ролей пользователей в документах");

        public static readonly Gauge ActiveConnections = Metrics.CreateGauge(
            "participanthub_active_connections",
            "Текущее количество активных подключений к ParticipantHub");

        public static readonly Histogram AddUsersDuration = Metrics.CreateHistogram(
            "document_add_users_duration_seconds",
            "Время выполнения операции добавления пользователей в документ (в секундах)",
            new HistogramConfiguration
            {
                Buckets = Histogram.ExponentialBuckets(start: 0.01, factor: 2, count: 10)
            });

        public static readonly Histogram RemoveUserDuration = Metrics.CreateHistogram(
            "document_remove_user_duration_seconds",
            "Время выполнения операции удаления пользователя из документа (в секундах)",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(start: 0.01, width: 0.05, count: 20)
            });

        public static readonly Histogram ChangeUserRoleDuration = Metrics.CreateHistogram(
            "document_change_user_role_duration_seconds",
            "Время выполнения операции изменения роли пользователя в документе (в секундах)",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(start: 0.01, width: 0.05, count: 20)
            });
    }
}
