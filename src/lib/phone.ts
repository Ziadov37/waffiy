/** Normalise un mobile algérien au format E.164, ou renvoie `null`. */
export function normalizeAlgerianPhone(input: string): string | null {
  let digits = input.trim().replace(/\D/g, '');

  if (/^00213[567]\d{8}$/.test(digits)) digits = digits.slice(2);
  if (/^0[567]\d{8}$/.test(digits)) return `+213${digits.slice(1)}`;
  if (/^213[567]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^[567]\d{8}$/.test(digits)) return `+213${digits}`;

  return null;
}

/** Accepte aussi les lignes fixes algériennes utilisées par les commerces. */
export function normalizeAlgerianContactPhone(input: string): string | null {
  const mobile = normalizeAlgerianPhone(input);
  if (mobile) return mobile;

  const digits = input.trim().replace(/\D/g, '');
  if (/^0[1-4]\d{7}$/.test(digits)) return `+213${digits.slice(1)}`;
  if (/^213[1-4]\d{7}$/.test(digits)) return `+${digits}`;
  return null;
}
