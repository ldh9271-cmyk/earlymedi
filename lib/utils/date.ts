import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/** Hard rule: every timestamp stored in UTC. Convert only at display time. */

export function toUtc(local: Date, timeZone: string): Date {
  return fromZonedTime(local, timeZone);
}

export function toLocal(utc: Date, timeZone: string): Date {
  return toZonedTime(utc, timeZone);
}

export function formatLocal(utc: Date, timeZone: string, pattern: string, locale?: string): string {
  return formatInTimeZone(utc, timeZone, pattern, { locale: undefined, ...(locale ? {} : {}) });
}

export function nowUtc(): Date {
  return new Date();
}
