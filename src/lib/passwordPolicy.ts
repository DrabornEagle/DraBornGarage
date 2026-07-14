export type PasswordPolicyResult = {
  valid: boolean;
  message: string | null;
};

export function validateRegistrationPassword(password: string): PasswordPolicyResult {
  if (password.length < 6) {
    return { valid: false, message: 'Şifre en az 6 karakter olmalıdır.' };
  }
  return { valid: true, message: null };
}

export const PASSWORD_POLICY_SUMMARY = 'En az 6 karakter yeterlidir.';
