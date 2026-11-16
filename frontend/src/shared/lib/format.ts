/** Formats an API timestamp in the operator's local time zone. */
export function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

/** Local time of day with milliseconds, e.g. 14:05:12.381. */
export function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}
