// Cursor helpers baseados em createdAt + id
export interface CursorParts { createdAt: Date; id: string }

export function encodeCursor(parts: CursorParts): string {
  const raw = `${parts.createdAt.toISOString()}_${parts.id}`;
  return Buffer.from(raw, 'utf8').toString('base64url');
}

export function decodeCursor(cursor?: string | null): CursorParts | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const idx = raw.lastIndexOf('_');
    if (idx <= 0) return null;
    const iso = raw.slice(0, idx);
    const id = raw.slice(idx + 1);
    const createdAt = new Date(iso);
    if (isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

