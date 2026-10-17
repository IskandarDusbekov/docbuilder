// Telegram yoki fayl menejeridan "DocBuilder bilan ochish": Android content:// yoki file:// manzil beradi.
// Uni /open ekraniga yo'naltiramiz, qolgan manzillar odatdagidek ishlaydi.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.startsWith('content://') || path.startsWith('file://')) {
    return `/open?uri=${encodeURIComponent(path)}`;
  }
  return path;
}
