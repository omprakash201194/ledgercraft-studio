import { describe, it, expect } from 'vitest';
import { applyFieldFormatting, FieldFormatOptions } from './applyFieldFormatting';

/**
 * Test suite for electron/utils/applyFieldFormatting.ts
 *
 * These tests verify that the electron version of the formatting utility
 * works identically to the renderer version, ensuring consistency across
 * the main and renderer processes.
 */

describe('applyFieldFormatting (Electron)', () => {
  describe('Null and undefined handling', () => {
    it('should return empty string for null value', () => {
      expect(applyFieldFormatting(null, 'text', {})).toBe('');
    });

    it('should return empty string for undefined value', () => {
      expect(applyFieldFormatting(undefined, 'text', {})).toBe('');
    });

    it('should return value as-is when formatOptions is null', () => {
      expect(applyFieldFormatting('hello', 'text', null)).toBe('hello');
    });

    it('should return value as-is when formatOptions is undefined', () => {
      expect(applyFieldFormatting('hello', 'text', undefined)).toBe('hello');
    });
  });

  describe('Date formatting', () => {
    const testDate = '2024-01-15';

    it('should format date as DD-MM-YYYY (default)', () => {
      const options: FieldFormatOptions = { dateFormat: 'DD-MM-YYYY' };
      expect(applyFieldFormatting(testDate, 'date', options)).toBe('15-01-2024');
    });

    it('should format date as MM-DD-YYYY', () => {
      const options: FieldFormatOptions = { dateFormat: 'MM-DD-YYYY' };
      expect(applyFieldFormatting(testDate, 'date', options)).toBe('01-15-2024');
    });

    it('should format date as YYYY-MM-DD', () => {
      const options: FieldFormatOptions = { dateFormat: 'YYYY-MM-DD' };
      expect(applyFieldFormatting(testDate, 'date', options)).toBe('2024-01-15');
    });

    it('should handle invalid date strings gracefully', () => {
      const options: FieldFormatOptions = { dateFormat: 'DD-MM-YYYY' };
      expect(applyFieldFormatting('not-a-date', 'date', options)).toBe('not-a-date');
    });
  });

  describe('Number formatting', () => {
    it('should format number with currency symbol', () => {
      const options: FieldFormatOptions = { currencySymbol: '$' };
      expect(applyFieldFormatting(1234.5, 'number', options)).toBe('$1234.5');
    });

    it('should format number with decimals', () => {
      const options: FieldFormatOptions = { decimals: 2 };
      expect(applyFieldFormatting(1234.5, 'number', options)).toBe('1234.50');
    });

    it('should format number with currency and decimals', () => {
      const options: FieldFormatOptions = { currencySymbol: '$', decimals: 2 };
      expect(applyFieldFormatting(1234.5, 'number', options)).toBe('$1234.50');
    });

    it('should handle string numbers', () => {
      const options: FieldFormatOptions = { currencySymbol: '€', decimals: 2 };
      expect(applyFieldFormatting('1000', 'number', options)).toBe('€1000.00');
    });

    it('should handle invalid numbers gracefully', () => {
      const options: FieldFormatOptions = { currencySymbol: '$', decimals: 2 };
      expect(applyFieldFormatting('not-a-number', 'number', options)).toBe('not-a-number');
    });
  });

  describe('Text transformation', () => {
    it('should transform text to uppercase', () => {
      const options: FieldFormatOptions = { transform: 'uppercase' };
      expect(applyFieldFormatting('hello world', 'text', options)).toBe('HELLO WORLD');
    });

    it('should transform text to lowercase', () => {
      const options: FieldFormatOptions = { transform: 'lowercase' };
      expect(applyFieldFormatting('HELLO WORLD', 'text', options)).toBe('hello world');
    });

    it('should handle mixed case', () => {
      const options: FieldFormatOptions = { transform: 'uppercase' };
      expect(applyFieldFormatting('HeLLo WoRLd', 'text', options)).toBe('HELLO WORLD');
    });
  });

  describe('Prefix and suffix', () => {
    it('should add prefix only', () => {
      const options: FieldFormatOptions = { prefix: '[' };
      expect(applyFieldFormatting('value', 'text', options)).toBe('[value');
    });

    it('should add suffix only', () => {
      const options: FieldFormatOptions = { suffix: ']' };
      expect(applyFieldFormatting('value', 'text', options)).toBe('value]');
    });

    it('should add both prefix and suffix', () => {
      const options: FieldFormatOptions = { prefix: '[', suffix: ']' };
      expect(applyFieldFormatting('value', 'text', options)).toBe('[value]');
    });

    it('should add prefix/suffix to dates', () => {
      const options: FieldFormatOptions = {
        dateFormat: 'DD-MM-YYYY',
        prefix: 'Date: ',
        suffix: ' (formatted)'
      };
      expect(applyFieldFormatting('2024-01-15', 'date', options)).toBe('Date: 15-01-2024 (formatted)');
    });

    it('should add prefix/suffix to numbers', () => {
      const options: FieldFormatOptions = {
        currencySymbol: '$',
        decimals: 2,
        prefix: 'Total: ',
        suffix: ' USD'
      };
      expect(applyFieldFormatting(1234.5, 'number', options)).toBe('Total: $1234.50 USD');
    });
  });

  describe('Combined formatting', () => {
    it('should combine uppercase with prefix/suffix', () => {
      const options: FieldFormatOptions = {
        transform: 'uppercase',
        prefix: '<<',
        suffix: '>>'
      };
      expect(applyFieldFormatting('test', 'text', options)).toBe('<<TEST>>');
    });

    it('should handle all date options together', () => {
      const options: FieldFormatOptions = {
        dateFormat: 'MM-DD-YYYY',
        prefix: 'Invoice Date: ',
        suffix: ' (EST)'
      };
      expect(applyFieldFormatting('2024-12-25', 'date', options)).toBe('Invoice Date: 12-25-2024 (EST)');
    });

    it('should handle all number options together', () => {
      const options: FieldFormatOptions = {
        currencySymbol: '₹',
        decimals: 2,
        prefix: 'Amount: ',
        suffix: ' INR'
      };
      expect(applyFieldFormatting(50000, 'number', options)).toBe('Amount: ₹50000.00 INR');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string value', () => {
      const options: FieldFormatOptions = { prefix: 'Test: ' };
      expect(applyFieldFormatting('', 'text', options)).toBe('Test: ');
    });

    it('should handle zero value', () => {
      const options: FieldFormatOptions = { currencySymbol: '$', decimals: 2 };
      expect(applyFieldFormatting(0, 'number', options)).toBe('$0.00');
    });

    it('should handle negative numbers', () => {
      const options: FieldFormatOptions = { currencySymbol: '$', decimals: 2 };
      expect(applyFieldFormatting(-1234.5, 'number', options)).toBe('$-1234.50');
    });

    it('should handle very large numbers', () => {
      const options: FieldFormatOptions = { decimals: 2 };
      expect(applyFieldFormatting(1234567890.123, 'number', options)).toBe('1234567890.12');
    });

    it('should handle unknown field types as text', () => {
      const options: FieldFormatOptions = { transform: 'uppercase' };
      expect(applyFieldFormatting('unknown', 'unknown_type', options)).toBe('UNKNOWN');
    });

    it('should handle select field type as text', () => {
      const options: FieldFormatOptions = { prefix: '> ' };
      expect(applyFieldFormatting('Option A', 'select', options)).toBe('> Option A');
    });

    it('should handle checkbox field type as text', () => {
      const options: FieldFormatOptions = { transform: 'uppercase' };
      expect(applyFieldFormatting('yes', 'checkbox', options)).toBe('YES');
    });
  });

  describe('Real-world scenarios', () => {
    it('should format invoice date correctly', () => {
      const options: FieldFormatOptions = {
        dateFormat: 'DD-MM-YYYY',
        prefix: 'Invoice Date: '
      };
      expect(applyFieldFormatting('2024-01-15', 'date', options)).toBe('Invoice Date: 15-01-2024');
    });

    it('should format total amount with Indian Rupee', () => {
      const options: FieldFormatOptions = {
        currencySymbol: '₹',
        decimals: 2,
        prefix: 'Total: '
      };
      expect(applyFieldFormatting(125000, 'number', options)).toBe('Total: ₹125000.00');
    });

    it('should format company name in uppercase', () => {
      const options: FieldFormatOptions = {
        transform: 'uppercase'
      };
      expect(applyFieldFormatting('acme corporation pvt ltd', 'text', options)).toBe('ACME CORPORATION PVT LTD');
    });

    it('should format percentage with suffix', () => {
      const options: FieldFormatOptions = {
        decimals: 2,
        suffix: '%'
      };
      expect(applyFieldFormatting(18, 'number', options)).toBe('18.00%');
    });

    it('should format tax rate with label', () => {
      const options: FieldFormatOptions = {
        decimals: 2,
        prefix: 'GST @ ',
        suffix: '%'
      };
      expect(applyFieldFormatting(18, 'number', options)).toBe('GST @ 18.00%');
    });
  });
});
