export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysFromToday(count: number, startOffset = 0) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + startOffset + index);
    return date;
  });
}

export function formatCalendarDay(date: Date) {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function formatAppointmentDate(value: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

export function formatAppointmentTime(value: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function combineLocalDateTime(date: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hour || 0, minute || 0, 0, 0);
  return result.toISOString();
}

export function addMinutes(value: string | Date, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}
