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
const MERCHANT_PAGE_PATHS = ['/join', '/join.html'] as const;

export function encodeClientQr(publicCode: string): string {
  return `${CLIENT_PREFIX}${publicCode}`;
}

/**
 * URL publique placée dans le QR du comptoir.
 *
 * La page appartient au frontend Waffiy. Les Edge Functions Supabase ne sont
 * pas un hébergement HTML : sans domaine personnalisé, Supabase transforme
 * leur réponse en texte brut. L'export prépare `/join/index.html` afin que
 * l'URL publique `/join/` reste comprise par Expo Router.
 */
export function encodeMerchantQr(joinCode: string, publicAppUrl: string): string {
  // Conserver un éventuel sous-chemin d'hébergement (`/waffiy-web` sur
  // GitHub Pages). Un chemin commençant par `/` repartirait à la racine du
  // domaine et produirait un QR en 404.
  const base = `${publicAppUrl.replace(/\/+$/, '')}/`;
  const url = new URL('join/', base);
  url.searchParams.set('code', normalize(joinCode));
  return url.toString();
}

export function encodeMerchantAppLink(joinCode: string): string {
  return `waffiy://join?code=${encodeURIComponent(normalize(joinCode))}`;
}

export type ScannedCode =
  { kind: 'client'; code: string } | { kind: 'merchant'; code: string };

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

  // Nouveau QR web : la page reste lisible sans l'application, tandis que
  // le scanner Waffiy récupère directement le code sans détour par le navigateur.
  try {
    const url = new URL(value);
    if (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      MERCHANT_PAGE_PATHS.some((path) => url.pathname.replace(/\/+$/, '').endsWith(path))
    ) {
      const code = normalize(url.searchParams.get('code') ?? '');
      return merchantSchema.safeParse(code).success ? { kind: 'merchant', code } : null;
    }
  } catch {
    // Une saisie manuelle n'est normalement pas une URL : poursuivre avec le
    // format court au lieu de la considérer comme une erreur.
  }

  // Saisie manuelle : le code imprimé sous le QR est préfixé par « WFY- »,
  // contrairement à la valeur brute stockée en base. On accepte les deux
  // formes pour que le commerçant puisse recopier exactement ce qu'il voit.
  const normalized = normalize(value);
  const code = normalized.startsWith('WFY') ? normalized.slice(3) : normalized;
  if (clientSchema.safeParse(code).success) return { kind: 'client', code };
  if (merchantSchema.safeParse(code).success) return { kind: 'merchant', code };

  return null;
}

/** Retire les tirets d'affichage et la casse, que la saisie manuelle introduit. */
function normalize(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}
