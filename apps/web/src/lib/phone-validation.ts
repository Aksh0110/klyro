export const PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$|^[6-9]\d{9}$/;

export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Mobile number is required' };
  }

  const trimmed = phone.trim();
  let digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length > 10 && digitsOnly.startsWith('91')) {
    digitsOnly = digitsOnly.slice(-10);
  }

  if (digitsOnly.length !== 10) {
    return { isValid: false, error: 'Please enter a valid 10-digit mobile number' };
  }

  if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
    return { isValid: false, error: 'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9' };
  }

  return { isValid: true };
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let digitsOnly = phone.trim().replace(/\D/g, '');
  if (digitsOnly.length > 10 && digitsOnly.startsWith('91')) {
    digitsOnly = digitsOnly.slice(-10);
  }
  return digitsOnly;
}

