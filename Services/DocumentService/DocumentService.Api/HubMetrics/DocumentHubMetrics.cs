using Prometheus;

namespace DocumentService.Api.HubMetrics
{
    public static class DocumentHubMetrics
    {
        public static readonly Counter DocumentsCreated = Metrics.CreateCounter(
            "document_created_total",
            "Общее количество созданных документов");

        public static readonly Counter DocumentsDeleted = Metrics.CreateCounter(
            "document_deleted_total",
            "Общее количество удалённых документов");

        public static readonly Counter DocumentsRenamed = Metrics.CreateCounter(
            "document_renamed_total",
            "Общее количество переименованных документов");

        public static readonly Gauge ActiveConnections = Metrics.CreateGauge(
            "documenthub_active_connections",
            "Текущее количество активных подключений к DocumentHub");

        public static readonly Histogram CreateDocumentDuration = Metrics.CreateHistogram(
            "document_create_duration_seconds",
            "Время выполнения операции создания документа (в секундах)",
            new HistogramConfiguration
            {
                Buckets = Histogram.ExponentialBuckets(start: 0.01, factor: 2, count: 10)
            });

        public static readonly Histogram DeleteDocumentDuration = Metrics.CreateHistogram(
            "document_delete_duration_seconds",
            "Время выполнения операции удаления документа (в секундах)",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(start: 0.01, width: 0.05, count: 20)
            });

        public static readonly Histogram RenameDocumentDuration = Metrics.CreateHistogram(
            "document_rename_duration_seconds",
            "Время выполнения операции переименования документа (в секундах)",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(start: 0.01, width: 0.05, count: 20)
            });
    }
}
