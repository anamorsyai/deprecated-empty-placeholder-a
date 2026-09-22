export function timeAgoAr(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `منذ ${diffMin <= 1 ? "دقيقة" : diffMin + " دقيقة"}`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `منذ ${diffH === 1 ? "ساعة" : diffH + " ساعة"}`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `منذ ${diffD === 1 ? "يوم" : diffD + " يوم"}`;
  const diffM = Math.round(diffD / 30);
  if (diffM < 12) return `منذ ${diffM === 1 ? "شهر" : diffM + " شهر"}`;
  const diffY = Math.round(diffM / 12);
  return `منذ ${diffY === 1 ? "سنة" : diffY + " سنة"}`;
}
