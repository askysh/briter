function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function StorageUsageBar({
  usedBytes,
  capBytes,
}: {
  usedBytes: number;
  capBytes: number;
}) {
  const hasCap = Number.isFinite(capBytes) && capBytes > 0;
  const ratio = hasCap ? Math.max(0, Math.min(1, usedBytes / capBytes)) : 0;
  const percentage = Math.round(ratio * 100);

  return (
    <div className="storage-usage">
      <div className="storage-usage-head">
        <span className="metric-label">Upload storage</span>
        <span className="tiny">
          {formatBytes(usedBytes)} / {formatBytes(capBytes)}
        </span>
      </div>
      <div className="storage-usage-track">
        <div
          className={`storage-usage-fill${percentage >= 95 ? " storage-usage-fill-warn" : ""}`}
          style={{ width: `${Math.max(percentage, usedBytes > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}
