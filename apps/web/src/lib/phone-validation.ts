export const PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$|^(\+\d{1,4}[\s-]?)?\d{7,14}$/;

export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number cannot exceed 15 digits' };
  }

  if (!PHONE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid 10-digit mobile number (e.g., 9876543210 or +919876543210)',
    };
  }

  return { isValid: true };
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (/^[6-9]\d{9}$/.test(trimmed)) {
    return `+91${trimmed}`;
  }
  return trimmed;
}
