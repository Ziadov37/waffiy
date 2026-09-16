import { z } from 'zod';

/**
 * Format des QR codes Waffiy.
 *
 * Deux QR circulent en sens inverse :
 *   • celui du CLIENT, que le commerçant scanne pour créditer
 *   • celui du COMMERCE, affiché en vitrine, que le client scanne pour
 *     obtenir sa carte (décision D5)
 *
 * Décision D3 : le QR client ne contient QUE le code aléatoire. Ni nom, ni
 * identifiant séquentiel — le prototype encodait « WFY:CUST:4182-0093:
 * SARAH-BENALI », ce qui exposait l'identité du porteur à quiconque scanne.
 */
const CODE_ALPHABET = /^[2-9A-HJKMNP-Z]+$/;

export const CLIENT_PREFIX = 'WFY:C:';
export const MERCHANT_PREFIX = 'WFY:J:';

export function encodeClientQr(publicCode: string): string {
  return `${CLIENT_PREFIX}${publicCode}`;
}

export function encodeMerchantQr(joinCode: string): string {
  return `${MERCHANT_PREFIX}${joinCode}`;
}

export type ScannedCode =
  | { kind: 'client'; code: string }
  | { kind: 'merchant'; code: string };

const clientSchema = z.string().length(10).regex(CODE_ALPHABET);
const merchantSchema = z.string().length(8).regex(CODE_ALPHABET);

/**
 * Analyse défensive de ce que renvoie la caméra.
 *
 * Le contenu d'un QR est une donnée entièrement hostile : n'importe qui peut
 * imprimer n'importe quoi. On valide donc la longueur ET l'alphabet avant tout
 * appel réseau, plutôt que de laisser le serveur trancher — cela évite d'aller
 * sonder la base avec des valeurs arbitraires.
 *
 * Accepte aussi un code nu, pour la recherche manuelle en caisse : le
 * commerçant lit à voix haute ce que le client a sur son écran.
 */
export function parseScannedCode(raw: string): ScannedCode | null {
  const value = raw.trim();

  if (value.startsWith(CLIENT_PREFIX)) {
    const code = normalize(value.slice(CLIENT_PREFIX.length));
    return clientSchema.safeParse(code).success ? { kind: 'client', code } : null;
  }

  if (value.startsWith(MERCHANT_PREFIX)) {
    const code = normalize(value.slice(MERCHANT_PREFIX.length));
    return merchantSchema.safeParse(code).success ? { kind: 'merchant', code } : null;
  }

  // Saisie manuelle : on déduit le type de la longueur.
  const code = normalize(value);
  if (clientSchema.safeParse(code).success) return { kind: 'client', code };
  if (merchantSchema.safeParse(code).success) return { kind: 'merchant', code };

  return null;
}

/** Retire les tirets d'affichage et la casse, que la saisie manuelle introduit. */
function normalize(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}
