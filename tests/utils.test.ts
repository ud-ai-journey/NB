import { describe, it, expect } from 'vitest';
import { sanitize, validateCategory } from '../server';

describe('Sanitization Helper', () => {
  it('should trim whitespace from input strings', () => {
    expect(sanitize('   test string   ')).toBe('test string');
  });

  it('should remove HTML tags to prevent cross-site scripting (XSS)', () => {
    expect(sanitize('<script>alert("hack")</script>hello')).toBe('alert("hack")hello');
    expect(sanitize('<div>content</div>')).toBe('content');
  });

  it('should limit string length to the specified maxLength', () => {
    expect(sanitize('abcdefghij', 5)).toBe('abcde');
  });

  it('should return empty string if input is not a string', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
    expect(sanitize(123)).toBe('');
    expect(sanitize({ key: 'val' })).toBe('');
  });
});

describe('Category Validation Helper', () => {
  it('should return true for valid categories', () => {
    expect(validateCategory('screen-time')).toBe(true);
    expect(validateCategory('substance')).toBe(true);
    expect(validateCategory('dietary')).toBe(true);
    expect(validateCategory('physical')).toBe(true);
    expect(validateCategory('mental')).toBe(true);
    expect(validateCategory('other')).toBe(true);
  });

  it('should return false for invalid categories', () => {
    expect(validateCategory('invalid-category')).toBe(false);
    expect(validateCategory('')).toBe(false);
    expect(validateCategory('substances')).toBe(false);
  });
});
