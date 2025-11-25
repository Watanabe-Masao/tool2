import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createNonEmptyString,
  createEmail,
  createUrl,
  createPhoneNumber,
  createPostalCode,
  createPositiveNumber,
  createPercentage,
  createCurrency,
  createDate,
  createNonEmptyArray,
  createUniqueArray,
  createEnum,
  createNullable,
  createPassword,
  createPasswordConfirmation,
} from '@/utils/schemaExtensions';

describe('schemaExtensions', () => {
  describe('createNonEmptyString', () => {
    it('should accept valid non-empty string', () => {
      const schema = createNonEmptyString();
      expect(schema.parse('hello')).toBe('hello');
    });

    it('should reject empty string', () => {
      const schema = createNonEmptyString();
      expect(() => schema.parse('')).toThrow();
    });

    it('should trim whitespace by default', () => {
      const schema = createNonEmptyString();
      expect(schema.parse('  hello  ')).toBe('hello');
    });

    it('should enforce max length', () => {
      const schema = createNonEmptyString({ maxLength: 5 });
      expect(() => schema.parse('toolong')).toThrow();
      expect(schema.parse('ok')).toBe('ok');
    });
  });

  describe('createEmail', () => {
    it('should accept valid email', () => {
      const schema = createEmail();
      expect(schema.parse('test@example.com')).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      const schema = createEmail();
      expect(() => schema.parse('invalid')).toThrow();
      expect(() => schema.parse('@example.com')).toThrow();
    });
  });

  describe('createUrl', () => {
    it('should accept valid URL', () => {
      const schema = createUrl();
      expect(schema.parse('https://example.com')).toBe('https://example.com');
    });

    it('should reject invalid URL', () => {
      const schema = createUrl();
      expect(() => schema.parse('not-a-url')).toThrow();
    });
  });

  describe('createPhoneNumber', () => {
    it('should accept valid Japanese phone number', () => {
      const schema = createPhoneNumber();
      expect(schema.parse('03-1234-5678')).toBe('03-1234-5678');
      expect(schema.parse('0312345678')).toBe('0312345678');
    });

    it('should reject invalid phone number', () => {
      const schema = createPhoneNumber();
      expect(() => schema.parse('123-4567')).toThrow();
    });
  });

  describe('createPostalCode', () => {
    it('should accept valid Japanese postal code', () => {
      const schema = createPostalCode();
      expect(schema.parse('123-4567')).toBe('123-4567');
      expect(schema.parse('1234567')).toBe('1234567');
    });

    it('should reject invalid postal code', () => {
      const schema = createPostalCode();
      expect(() => schema.parse('12-34567')).toThrow();
    });
  });

  describe('createPositiveNumber', () => {
    it('should accept positive number', () => {
      const schema = createPositiveNumber();
      expect(schema.parse(10)).toBe(10);
      expect(schema.parse(0)).toBe(0);
    });

    it('should reject negative number', () => {
      const schema = createPositiveNumber();
      expect(() => schema.parse(-1)).toThrow();
    });

    it('should enforce integer constraint', () => {
      const schema = createPositiveNumber({ integer: true });
      expect(schema.parse(10)).toBe(10);
      expect(() => schema.parse(10.5)).toThrow();
    });

    it('should enforce max value', () => {
      const schema = createPositiveNumber({ max: 100 });
      expect(() => schema.parse(101)).toThrow();
      expect(schema.parse(100)).toBe(100);
    });
  });

  describe('createPercentage', () => {
    it('should accept valid percentage (0-100)', () => {
      const schema = createPercentage();
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse(50)).toBe(50);
      expect(schema.parse(100)).toBe(100);
    });

    it('should reject out of range values', () => {
      const schema = createPercentage();
      expect(() => schema.parse(-1)).toThrow();
      expect(() => schema.parse(101)).toThrow();
    });
  });

  describe('createCurrency', () => {
    it('should accept valid currency (positive integer)', () => {
      const schema = createCurrency();
      expect(schema.parse(1000)).toBe(1000);
      expect(schema.parse(0)).toBe(0);
    });

    it('should reject negative or decimal values', () => {
      const schema = createCurrency();
      expect(() => schema.parse(-100)).toThrow();
      expect(() => schema.parse(100.5)).toThrow();
    });

    it('should enforce max amount', () => {
      const schema = createCurrency({ maxAmount: 10000 });
      expect(() => schema.parse(10001)).toThrow();
      expect(schema.parse(10000)).toBe(10000);
    });
  });

  describe('createDate', () => {
    it('should accept valid date', () => {
      const schema = createDate();
      const date = new Date('2024-01-01');
      expect(schema.parse(date)).toEqual(date);
    });

    it('should enforce min date', () => {
      const minDate = new Date('2024-01-01');
      const schema = createDate({ minDate });

      expect(() => schema.parse(new Date('2023-12-31'))).toThrow();
      expect(schema.parse(new Date('2024-01-02'))).toBeInstanceOf(Date);
    });

    it('should enforce max date', () => {
      const maxDate = new Date('2024-12-31');
      const schema = createDate({ maxDate });

      expect(() => schema.parse(new Date('2025-01-01'))).toThrow();
      expect(schema.parse(new Date('2024-12-30'))).toBeInstanceOf(Date);
    });
  });

  describe('createNonEmptyArray', () => {
    it('should accept non-empty array', () => {
      const schema = createNonEmptyArray(z.string());
      expect(schema.parse(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('should reject empty array', () => {
      const schema = createNonEmptyArray(z.string());
      expect(() => schema.parse([])).toThrow();
    });

    it('should enforce max length', () => {
      const schema = createNonEmptyArray(z.string(), { maxLength: 3 });
      expect(() => schema.parse(['a', 'b', 'c', 'd'])).toThrow();
      expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });
  });

  describe('createUniqueArray', () => {
    it('should accept unique values', () => {
      const schema = createUniqueArray(z.string());
      expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should reject duplicate values', () => {
      const schema = createUniqueArray(z.string());
      expect(() => schema.parse(['a', 'b', 'a'])).toThrow();
    });
  });

  describe('createEnum', () => {
    it('should accept valid enum value', () => {
      const schema = createEnum(['red', 'green', 'blue'] as const);
      expect(schema.parse('red')).toBe('red');
    });

    it('should reject invalid enum value', () => {
      const schema = createEnum(['red', 'green', 'blue'] as const);
      expect(() => schema.parse('yellow')).toThrow();
    });
  });

  describe('createNullable', () => {
    it('should accept null and undefined', () => {
      const schema = createNullable(z.string());
      expect(schema.parse(null)).toBeNull();
      expect(schema.parse(undefined)).toBeUndefined();
    });

    it('should accept valid value', () => {
      const schema = createNullable(z.string());
      expect(schema.parse('hello')).toBe('hello');
    });
  });

  describe('createPassword', () => {
    it('should accept valid password', () => {
      const schema = createPassword();
      expect(schema.parse('Password123!')).toBe('Password123!');
    });

    it('should reject short password', () => {
      const schema = createPassword({ minLength: 8 });
      expect(() => schema.parse('Pass1!')).toThrow();
    });

    it('should enforce number requirement', () => {
      const schema = createPassword({ requireNumber: true });
      expect(() => schema.parse('Password!')).toThrow();
      expect(schema.parse('Password1!')).toBe('Password1!');
    });

    it('should enforce special character requirement', () => {
      const schema = createPassword({ requireSpecialChar: true });
      expect(() => schema.parse('Password123')).toThrow();
      expect(schema.parse('Password123!')).toBe('Password123!');
    });
  });

  describe('createPasswordConfirmation', () => {
    it('should validate matching passwords', () => {
      const confirmation = createPasswordConfirmation('password', 'confirmPassword');
      const schema = z.object({
        password: z.string(),
        confirmPassword: z.string(),
      }).refine(confirmation.check, confirmation.options);

      expect(() => schema.parse({
        password: 'test123',
        confirmPassword: 'different',
      })).toThrow();

      expect(schema.parse({
        password: 'test123',
        confirmPassword: 'test123',
      })).toEqual({
        password: 'test123',
        confirmPassword: 'test123',
      });
    });
  });
});
