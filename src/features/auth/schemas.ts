import { z } from 'zod';

import { normalizeAlgerianContactPhone, normalizeAlgerianPhone } from '@/lib/phone';

/** Messages en français : ce sont eux qui s'affichent sous les champs. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Renseignez votre adresse email.')
  .email('Cette adresse email ne semble pas valide.');

export const otpSchema = z.string().regex(/^\d{6}$/, 'Le code comporte 6 chiffres.');

export const phoneSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const normalized = normalizeAlgerianPhone(value);
    if (!normalized) {
      context.addIssue({
        code: 'custom',
        message: 'Saisissez un mobile algérien commençant par 05, 06 ou 07.',
      });
      return z.NEVER;
    }
    return normalized;
  });

const contactPhoneSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const normalized = normalizeAlgerianContactPhone(value);
    if (!normalized) {
      context.addIssue({
        code: 'custom',
        message: 'Saisissez un numéro algérien valide.',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit comporter au moins 8 caractères.')
  .max(128, 'Le mot de passe est trop long.');

const optionalPhoneSchema = z.union([z.literal(''), phoneSchema]).optional();

const passwordConfirmation = {
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirmez votre mot de passe.'),
};

function passwordsMatch(
  values: { password: string; confirmPassword: string },
  context: z.RefinementCtx,
) {
  if (values.password !== values.confirmPassword) {
    context.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Les mots de passe ne correspondent pas.',
    });
  }
}

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Renseignez votre email ou votre numéro de téléphone.')
    .transform((value, context) => {
      if (emailSchema.safeParse(value).success) return value.toLowerCase();
      const phone = normalizeAlgerianPhone(value);
      if (phone) return phone;
      context.addIssue({
        code: 'custom',
        message: 'Saisissez un email ou un mobile algérien valide.',
      });
      return z.NEVER;
    }),
  password: z.string().min(1, 'Renseignez votre mot de passe.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const phoneVerificationSchema = z.object({ phone: phoneSchema });
export type PhoneVerificationValues = z.infer<typeof phoneVerificationSchema>;

export const profileDetailsSchema = z.object({
  firstName: z.string().trim().min(2, 'Renseignez votre prénom.').max(80),
  lastName: z.string().trim().min(2, 'Renseignez votre nom.').max(80),
});
export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;

export const clientSignupSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Renseignez votre prénom.').max(80),
    lastName: z.string().trim().min(2, 'Renseignez votre nom.').max(80),
    email: emailSchema,
    // Facultatif, mais permet ensuite de se connecter avec ce numéro et le
    // mot de passe. L'email reste la seule identité vérifiée à l'inscription.
    phone: optionalPhoneSchema,
    ...passwordConfirmation,
  })
  .superRefine(passwordsMatch);

export type ClientSignupValues = z.infer<typeof clientSignupSchema>;

export const secureAccountDetailsSchema = z.object({
  firstName: z.string().trim().min(2, 'Renseignez votre prénom.').max(80),
  lastName: z.string().trim().min(2, 'Renseignez votre nom.').max(80),
  email: emailSchema,
});

export type SecureAccountDetailsValues = z.infer<typeof secureAccountDetailsSchema>;

export const secureAccountPasswordSchema = z
  .object(passwordConfirmation)
  .superRefine(passwordsMatch);

export type SecureAccountPasswordValues = z.infer<typeof secureAccountPasswordSchema>;

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
  phone: z.union([z.literal(''), contactPhoneSchema]).optional(),
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

export const ownerStepSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Renseignez votre prénom.').max(80),
    lastName: z.string().trim().min(2, 'Renseignez votre nom.').max(80),
    email: emailSchema,
    phone: optionalPhoneSchema,
    ...passwordConfirmation,
  })
  .superRefine(passwordsMatch);

export type OwnerStepValues = z.infer<typeof ownerStepSchema>;
