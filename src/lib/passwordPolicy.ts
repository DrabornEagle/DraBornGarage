const COMMON_OR_LEAKED_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'qwerty',
  'qwerty123',
  'admin',
  'admin123',
  'letmein',
  'welcome',
  'iloveyou',
  'abc123',
  '111111',
  '000000',
  '123123',
  'dragon',
  'monkey',
  'football',
  'draborngarage',
]);

export type PasswordPolicyResult = {
  valid: boolean;
  message: string | null;
};

export function validateRegistrationPassword(password: string, email?: string): PasswordPolicyResult {
  const normalized = password.trim();
  const emailName = email?.trim().toLowerCase().split('@')[0] ?? '';

  if (normalized.length < 10) {
    return { valid: false, message: 'Şifre en az 10 karakter olmalıdır.' };
  }
  if (!/[a-zçğıöşü]/.test(normalized)) {
    return { valid: false, message: 'Şifre en az bir küçük harf içermelidir.' };
  }
  if (!/[A-ZÇĞİÖŞÜ]/.test(normalized)) {
    return { valid: false, message: 'Şifre en az bir büyük harf içermelidir.' };
  }
  if (!/\d/.test(normalized)) {
    return { valid: false, message: 'Şifre en az bir rakam içermelidir.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(normalized)) {
    return { valid: false, message: 'Şifre en az bir özel karakter içermelidir.' };
  }

  const lower = normalized.toLowerCase();
  if (COMMON_OR_LEAKED_PASSWORDS.has(lower)) {
    return { valid: false, message: 'Bu şifre yaygın veya sızdırılmış şifre listelerinde bulunuyor. Daha özgün bir şifre seç.' };
  }
  if (emailName.length >= 4 && lower.includes(emailName)) {
    return { valid: false, message: 'Şifre e-posta kullanıcı adını içermemelidir.' };
  }
  if (/(.)\1{4,}/.test(normalized)) {
    return { valid: false, message: 'Şifre art arda aynı karakteri çok fazla içermemelidir.' };
  }

  return { valid: true, message: null };
}

export const PASSWORD_POLICY_SUMMARY = 'En az 10 karakter; büyük harf, küçük harf, rakam ve özel karakter.';
