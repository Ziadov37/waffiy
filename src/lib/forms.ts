import type { ZodError } from 'zod';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Première erreur par champ, au format attendu par TextField.
 *
 * Une seule erreur par champ, et non la liste : empiler « Renseignez votre
 * prénom » et « Au moins 2 caractères » sous le même champ n'aide personne.
 */
export function collectFieldErrors<T>(error: ZodError): FieldErrors<T> {
  const result: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T | undefined;
    if (key !== undefined && result[key] === undefined) {
      result[key] = issue.message;
    }
  }
  return result;
}

/**
 * Retire l'erreur d'un champ.
 *
 * Supprime la clé au lieu d'y mettre `undefined` : sous
 * `exactOptionalPropertyTypes`, une propriété optionnelle explicitement
 * `undefined` n'est pas la même chose qu'une propriété absente, et TypeScript
 * a raison de le refuser.
 */
export function clearFieldError<T>(errors: FieldErrors<T>, key: keyof T): FieldErrors<T> {
  if (errors[key] === undefined) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
}
