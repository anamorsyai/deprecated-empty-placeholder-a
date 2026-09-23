export function timeAgoEn(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  const diffM = Math.round(diffD / 30);
  if (diffM < 12) return `${diffM}mo ago`;
  const diffY = Math.round(diffM / 12);
  return `${diffY}y ago`;
}
