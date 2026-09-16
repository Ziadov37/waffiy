import { z } from 'zod';

/** Messages en français : ce sont eux qui s'affichent sous les champs. */
export const emailSchema = z
  .string()
  .min(1, 'Renseignez votre adresse email.')
  .email('Cette adresse email ne semble pas valide.');

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Le code comporte 6 chiffres.');

export const clientSignupSchema = z.object({
  firstName: z.string().trim().min(2, 'Renseignez votre prénom.').max(80),
  lastName: z.string().trim().min(2, 'Renseignez votre nom.').max(80),
  email: emailSchema,
  // Le téléphone reste facultatif et non vérifié : la connexion passe par un
  // code email (décision D1). Il sert à retrouver un client en caisse.
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ().-]{6,20}$/, 'Ce numéro ne semble pas valide.')
    .optional()
    .or(z.literal('')),
});

export type ClientSignupValues = z.infer<typeof clientSignupSchema>;

export const merchantCategories = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'fast_food', label: 'Fast-food' },
  { value: 'bakery', label: 'Boulangerie' },
  { value: 'beauty', label: 'Beauté' },
  { value: 'retail', label: 'Retail' },
  { value: 'other', label: 'Autre' },
] as const;

export const merchantStepSchema = z.object({
  name: z.string().trim().min(2, 'Renseignez le nom de votre commerce.').max(120),
  category: z.enum([
    'restaurant',
    'cafe',
    'fast_food',
    'bakery',
    'beauty',
    'retail',
    'other',
  ]),
  city: z.string().trim().min(1, 'Renseignez votre ville.').max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ().-]{6,20}$/, 'Ce numéro ne semble pas valide.')
    .optional()
    .or(z.literal('')),
  logoUrl: z.string().url().optional(),
});

export type MerchantStepValues = z.infer<typeof merchantStepSchema>;

export const programStepSchema = z.object({
  name: z.string().trim().min(2, 'Nommez la récompense offerte.').max(80),
  emoji: z.string().min(1).max(8),
  description: z.string().trim().max(280).optional().or(z.literal('')),
  threshold: z
    .number()
    .int()
    .min(2, 'Au moins 2 visites.')
    .max(50, 'Au plus 50 visites.'),
});

export type ProgramStepValues = z.infer<typeof programStepSchema>;

export const ownerStepSchema = z.object({
  firstName: z.string().trim().min(2, 'Renseignez votre prénom.').max(80),
  lastName: z.string().trim().min(2, 'Renseignez votre nom.').max(80),
  email: emailSchema,
});

export type OwnerStepValues = z.infer<typeof ownerStepSchema>;
