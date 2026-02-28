export function datetimeLocalToUnixSeconds(value: string): number {
  // value like "2026-02-28T12:30" (interpreted in user's local timezone)
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms))
    throw new Error(`Invalid datetime-local value: ${value}`);
  return Math.floor(ms / 1000);
}

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
