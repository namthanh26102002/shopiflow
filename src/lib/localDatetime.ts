/**
 * An ISO timestamp as the `YYYY-MM-DDTHH:mm` value a datetime-local input
 * expects, in the viewer's own timezone.
 *
 * `toISOString().slice(0, 16)` looks equivalent but yields UTC wall time; the
 * input then reads it back as local time, so every save shifts the date by the
 * timezone offset.
 */
export const toLocalDatetime = (iso: string | Date): string => {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
