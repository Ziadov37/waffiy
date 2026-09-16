import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Mise en forme du français.
 *
 * L'interface vouvoie systématiquement (contrainte de la direction artistique)
 * et accorde les pluriels : « Encore 1 visite » et non « Encore 1 visites ».
 */

/** `SARAH23456` → `WFY-SARAH-23456`, le format affiché sous le QR. */
export function formatPublicCode(code: string): string {
  if (code.length !== 10) return code;
  return `WFY-${code.slice(0, 5)}-${code.slice(5)}`;
}

/** « Sarah Benali » → « SB », pour les pastilles d'avatar. */
export function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0).toUpperCase();
  const b = lastName.trim().charAt(0).toUpperCase();
  return `${a}${b}` || '?';
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** « Sarah B. » — la liste d'activité du commerçant abrège le nom de famille. */
export function shortName(firstName: string, lastName: string): string {
  const last = lastName.trim();
  return last ? `${firstName} ${last.charAt(0).toUpperCase()}.` : firstName;
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return count > 1 ? (pluralForm ?? `${singular}s`) : singular;
}

/** « 3 visites », « 1 visite ». */
export function countLabel(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${plural(count, singular, pluralForm)}`;
}

/** « 12 septembre 2026 » — utilisé sur les fiches et l'historique détaillé. */
export function longDate(value: string | Date): string {
  return format(toDate(value), 'd MMMM yyyy', { locale: fr });
}

/** « 12 sept » — utilisé dans les listes compactes. */
export function shortDate(value: string | Date): string {
  return format(toDate(value), 'd MMM', { locale: fr });
}

/** « 14:32 » — heure seule, pour le flux d'activité du jour. */
export function timeOfDay(value: string | Date): string {
  return format(toDate(value), 'HH:mm');
}

/**
 * « à l'instant », « il y a 5 minutes », « hier », « 12 sept ».
 * Les deux premiers paliers comptent : après un scan, le commerçant doit voir
 * son action apparaître en haut du flux et la reconnaître immédiatement.
 */
export function relativeDate(value: string | Date): string {
  const date = toDate(value);
  const seconds = (Date.now() - date.getTime()) / 1000;

  if (seconds < 60) return "à l'instant";
  if (isToday(date)) return formatDistanceToNowStrict(date, { locale: fr, addSuffix: true });
  if (isYesterday(date)) return 'hier';
  return shortDate(date);
}

/** « Dernière visite : aujourd'hui » / « … : 12 septembre 2026 ». */
export function lastVisitLabel(value: string | null | undefined): string {
  if (!value) return 'Aucune visite pour le moment';
  const date = toDate(value);
  if (isToday(date)) return "Dernière visite : aujourd'hui";
  if (isYesterday(date)) return 'Dernière visite : hier';
  return `Dernière visite : ${longDate(date)}`;
}

/** « Membre depuis mars 2026 ». */
export function memberSince(value: string | Date): string {
  return `Membre depuis ${format(toDate(value), 'MMMM yyyy', { locale: fr })}`;
}

/**
 * « Encore 2 visites » / « Récompense disponible ! »
 * L'espace avant le point d'exclamation est une espace fine insécable (U+202F),
 * conforme à la typographie française et présente dans le prototype.
 */
export function remainingLabel(stamps: number, threshold: number): string {
  const remaining = Math.max(threshold - stamps, 0);
  if (remaining === 0) return 'Récompense disponible !';
  return `Encore ${countLabel(remaining, 'visite')}`;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
