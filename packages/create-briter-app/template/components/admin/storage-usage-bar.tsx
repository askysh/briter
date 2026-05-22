function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageUsageBar({
  usedBytes,
  capBytes,
}: {
  usedBytes: number;
  capBytes: number;
}) {
  const ratio = Math.max(0, Math.min(1, usedBytes / capBytes));
  const percentage = Math.round(ratio * 100);

  return (
    <div className="section-stack" style={{ gap: "0.5rem" }}>
      <div className="split-note">
        <strong>Upload storage</strong>
        <span className="tiny">
          {formatBytes(usedBytes)} / {formatBytes(capBytes)} ({percentage}%)
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "var(--briter-panel-strong)" }}>
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            borderRadius: 999,
            background: percentage >= 95 ? "var(--briter-accent-strong)" : "var(--briter-accent)",
          }}
        />
      </div>
    </div>
  );
}
