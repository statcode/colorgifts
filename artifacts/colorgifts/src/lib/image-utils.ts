export function getImageUrl(objectPath: string | null | undefined): string {
  if (!objectPath) return '';
  return `/api/storage${objectPath}`;
}
