/**
 * Utility functions for text sanitization, trimming, and validation.
 */

/**
 * Trims leading, trailing, and multiple consecutive whitespace characters from a string.
 */
export const sanitizeText = (text: string): string => {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
};

/**
 * Validates whether an email string matches a standard valid email format.
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
};

/**
 * Validates phone number (must be exactly 10 numeric digits).
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  return /^\d{10}$/.test(phone.trim());
};

/**
 * Validates pincode (must be exactly 6 numeric digits).
 */
export const isValidPincode = (pincode: string): boolean => {
  if (!pincode) return false;
  return /^\d{6}$/.test(pincode.trim());
};

/**
 * Validates issue description to prevent meaningless text or keyboard spam.
 * Rejects:
 * - Empty or whitespace-only input
 * - Length < 10 characters
 * - Only numbers (e.g. 111111, 123123123)
 * - Only symbols/punctuation (e.g. @@@@@@, ......., ______)
 * - Repeated single character sequence (e.g. aaaaaa, 111111, @@@@@@)
 * - 2-character repeated sequences (e.g. jsjsjs, ababab, xyxyxy)
 * - 3-character repeated sequences (e.g. abcabcabc)
 * - Common keyboard row spam (qwerty, asdfgh, zxcvbn, etc.)
 * - Obvious random consonant/gibberish strings (e.g. ndjxkkxn130_, jdjdkdkdk)
 */
export const isMeaningfulDescription = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();

  // 1. Minimum 10 characters check
  if (trimmed.length < 10) return false;

  // 2. Reject numbers-only (e.g. 1111111111, 123456789012)
  if (/^\d+$/.test(trimmed)) return false;

  // 3. Reject symbols/punctuation-only (e.g. @@@@@@@@@@, .........., __________)
  if (/^[^a-zA-Z0-9]+$/.test(trimmed)) return false;

  // 4. Reject single character repeated (e.g. aaaaaaaaaaa, 11111111111, @@@@@@@@@@@)
  if (/^(.)\1+$/.test(trimmed)) return false;

  // 5. Reject 2-character repeated sequences (e.g. jsjsjsjsjs, ababababab, xyxyxyxyxy)
  if (/^(.{2})\1+$/i.test(trimmed)) return false;

  // 6. Reject 3-character repeated sequences (e.g. abcabcabcabc)
  if (/^(.{3})\1+$/i.test(trimmed)) return false;

  // 7. Check for keyboard row spam patterns
  const lower = trimmed.toLowerCase();
  const spamPatterns = [
    "qwerty",
    "asdfgh",
    "zxcvbn",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
    "123456789",
    "abcdef",
    "jklm",
    "uiop",
  ];

  for (const pattern of spamPatterns) {
    if (lower.includes(pattern)) {
      return false;
    }
  }

  // 8. Reject 4+ consecutive consonants (e.g. ndjxkkxn, bcdfgh, jklmnp)
  if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(lower)) {
    return false;
  }

  // 9. Single word check: reject random noise without vowels or proper word length ratio
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 1 && trimmed.length >= 10) {
    const vowels = (trimmed.match(/[aeiouyAEIOUY]/g) || []).length;
    if (vowels / trimmed.length < 0.25) {
      return false;
    }
  }

  return true;
};
