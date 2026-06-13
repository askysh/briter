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
  diskFreeBytes = null,
  diskTotalBytes = null,
}: {
  usedBytes: number;
  capBytes: number;
  diskFreeBytes?: number | null;
  diskTotalBytes?: number | null;
}) {
  const hasCap = Number.isFinite(capBytes) && capBytes > 0;
  const ratio = hasCap ? Math.max(0, Math.min(1, usedBytes / capBytes)) : 0;
  const percentage = Math.round(ratio * 100);
  const hasDisk =
    typeof diskFreeBytes === "number" && Number.isFinite(diskFreeBytes);

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
      {hasDisk ? (
        <div className="storage-usage-head">
          <span className="tiny">Disk free</span>
          <span className="tiny">
            {formatBytes(diskFreeBytes as number)}
            {typeof diskTotalBytes === "number" &&
            Number.isFinite(diskTotalBytes)
              ? ` of ${formatBytes(diskTotalBytes)}`
              : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
