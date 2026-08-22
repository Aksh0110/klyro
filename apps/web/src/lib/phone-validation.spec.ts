import { validatePhoneNumber, sanitizePhoneNumber } from './phone-validation';

describe('Phone Validation Utility', () => {
  it('should validate valid 10-digit mobile numbers', () => {
    expect(validatePhoneNumber('9876543210').isValid).toBe(true);
    expect(validatePhoneNumber('6300123456').isValid).toBe(true);
  });

  it('should validate valid phone numbers with +91 country code', () => {
    expect(validatePhoneNumber('+919876543210').isValid).toBe(true);
    expect(validatePhoneNumber('+91 9876543210').isValid).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhoneNumber('12345').isValid).toBe(false);
    expect(validatePhoneNumber('abc1234567').isValid).toBe(false);
    expect(validatePhoneNumber('').isValid).toBe(false);
  });

  it('should format 10-digit numbers to +91 international standard', () => {
    expect(sanitizePhoneNumber('9876543210')).toBe('+919876543210');
    expect(sanitizePhoneNumber('+919876543210')).toBe('+919876543210');
  });
});
