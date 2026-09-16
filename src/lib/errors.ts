import { PostgrestError } from '@supabase/supabase-js';

/**
 * Traduction des codes d'erreur serveur en messages destinés au commerçant ou
 * au client.
 *
 * Les fonctions Postgres lèvent des codes stables et non traduits
 * (`RATE_LIMITED`, `NOT_ENROLLED`…). Le français vit ici, dans l'application :
 * le serveur n'a pas à connaître la langue de l'interface, et un message
 * changé ne demande pas de migration.
 */
export const SERVER_ERROR_CODES = [
  'FORBIDDEN',
  'UNAUTHENTICATED',
  'RATE_LIMITED',
  'NOT_ENROLLED',
  'CLIENT_NOT_FOUND',
  'PROGRAM_NOT_FOUND',
  'PROGRAM_NOT_ACTIVE',
  'MERCHANT_NOT_FOUND',
  'MERCHANT_SUSPENDED',
  'INSUFFICIENT_STAMPS',
  'INVALID_COUNT',
  'INVALID_THRESHOLD',
  'MISSING_REQUEST_ID',
  'REQUEST_ID_CONFLICT',
  'THRESHOLD_CHANGE_REQUIRES_CONFIRMATION',
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];

export type AppError = {
  code: ServerErrorCode | 'NETWORK' | 'UNKNOWN';
  title: string;
  message: string;
  /** Vrai si un nouvel essai a une chance d'aboutir — pilote le bouton « Réessayer ». */
  retryable: boolean;
  /** Secondes restantes avant un nouveau crédit possible (RATE_LIMITED). */
  retryAfterSeconds?: number;
};

const MESSAGES: Record<ServerErrorCode, { title: string; message: string; retryable: boolean }> = {
  FORBIDDEN: {
    title: 'Action non autorisée',
    message: "Vous n'exploitez pas ce commerce.",
    retryable: false,
  },
  UNAUTHENTICATED: {
    title: 'Session expirée',
    message: 'Reconnectez-vous pour continuer.',
    retryable: false,
  },
  RATE_LIMITED: {
    title: 'Visite déjà créditée',
    message: 'Une visite vient d’être ajoutée pour ce client.',
    retryable: false,
  },
  NOT_ENROLLED: {
    title: 'Ce client n’a pas encore votre carte',
    message:
      'Faites-lui scanner votre QR d’inscription, puis scannez à nouveau son QR personnel.',
    retryable: false,
  },
  CLIENT_NOT_FOUND: {
    title: 'Client introuvable',
    message: 'Ce QR code ne correspond à aucun compte Waffiy.',
    retryable: false,
  },
  PROGRAM_NOT_FOUND: {
    title: 'Programme introuvable',
    message: 'Ce programme a peut-être été supprimé.',
    retryable: false,
  },
  PROGRAM_NOT_ACTIVE: {
    title: 'Programme en brouillon',
    message: 'Publiez ce programme avant de créditer des visites.',
    retryable: false,
  },
  MERCHANT_NOT_FOUND: {
    title: 'Commerce introuvable',
    message: 'Ce QR code ne correspond à aucun commerce Waffiy.',
    retryable: false,
  },
  MERCHANT_SUSPENDED: {
    title: 'Commerce suspendu',
    message: 'Contactez le support Waffiy pour rétablir votre compte.',
    retryable: false,
  },
  INSUFFICIENT_STAMPS: {
    title: 'Récompense indisponible',
    message: 'Ce client n’a pas encore atteint le seuil.',
    retryable: false,
  },
  INVALID_COUNT: {
    title: 'Nombre de visites invalide',
    message: 'Une seule visite peut être créditée à la fois.',
    retryable: false,
  },
  INVALID_THRESHOLD: {
    title: 'Seuil invalide',
    message: 'Le nombre de visites doit être compris entre 2 et 50.',
    retryable: false,
  },
  MISSING_REQUEST_ID: {
    title: 'Erreur interne',
    message: 'Action annulée par sécurité. Réessayez.',
    retryable: true,
  },
  REQUEST_ID_CONFLICT: {
    title: 'Action déjà enregistrée',
    message: 'Cette action a déjà été traitée.',
    retryable: false,
  },
  THRESHOLD_CHANGE_REQUIRES_CONFIRMATION: {
    title: 'Confirmation requise',
    message: 'Des clients progressent déjà sur ce programme.',
    retryable: false,
  },
};

function isServerCode(value: string): value is ServerErrorCode {
  return (SERVER_ERROR_CODES as readonly string[]).includes(value);
}

/**
 * Normalise n'importe quelle erreur en quelque chose d'affichable.
 *
 * La distinction réseau / serveur compte : une coupure justifie « Réessayer »,
 * un refus métier non — proposer de réessayer un RATE_LIMITED inviterait le
 * commerçant à marteler un bouton qui ne cédera pas.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof Error && /network|fetch|timeout/i.test(error.message)) {
    return {
      code: 'NETWORK',
      title: 'Connexion indisponible',
      message: 'Vérifiez votre connexion, puis réessayez.',
      retryable: true,
    };
  }

  const pg = error as Partial<PostgrestError> | null;
  const raw = typeof pg?.message === 'string' ? pg.message.trim() : '';

  if (raw && isServerCode(raw)) {
    const known = MESSAGES[raw];
    const base: AppError = { code: raw, ...known };

    if (raw === 'RATE_LIMITED') {
      const seconds = Number.parseInt(pg?.details ?? '', 10);
      if (Number.isFinite(seconds) && seconds > 0) {
        return {
          ...base,
          retryAfterSeconds: seconds,
          message: `Une visite vient d’être ajoutée. Nouveau crédit possible dans ${formatDelay(seconds)}.`,
        };
      }
    }
    return base;
  }

  return {
    code: 'UNKNOWN',
    title: 'Une erreur est survenue',
    message: 'Réessayez dans un instant. Si le problème persiste, contactez le support.',
    retryable: true,
  };
}

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} secondes`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? 'une minute' : `${minutes} minutes`;
}
