import { describe, it, expect } from 'vitest';
import { applyFieldFormatting, FieldFormatOptions } from './applyFieldFormatting';

describe('applyFieldFormatting', () => {
  // ========================================
  // NULL/UNDEFINED HANDLING
  // ========================================
  describe('null/undefined handling', () => {
    it('should return value unchanged when formatOptions is null', () => {
      const result = applyFieldFormatting('hello', 'text', null);
      expect(result).toBe('hello');
    });

    it('should return value unchanged when formatOptions is undefined', () => {
      const result = applyFieldFormatting('world', 'text', undefined);
      expect(result).toBe('world');
    });

    it('should return empty string when value is null', () => {
      const result = applyFieldFormatting(null, 'text', { transform: 'uppercase' });
      expect(result).toBe('');
    });

    it('should return empty string when value is undefined', () => {
      const result = applyFieldFormatting(undefined, 'text', { transform: 'uppercase' });
      expect(result).toBe('');
    });

    it('should convert number to string when no formatOptions', () => {
      const result = applyFieldFormatting(123, 'number', null);
      expect(result).toBe('123');
    });
  });

  // ========================================
  // DATE FORMATTING
  // ========================================
  describe('date formatting', () => {
    const testDate = '2024-01-15';

    it('should format date as DD-MM-YYYY', () => {
      const result = applyFieldFormatting(testDate, 'date', { dateFormat: 'DD-MM-YYYY' });
      expect(result).toBe('15-01-2024');
    });

    it('should format date as MM-DD-YYYY', () => {
      const result = applyFieldFormatting(testDate, 'date', { dateFormat: 'MM-DD-YYYY' });
      expect(result).toBe('01-15-2024');
    });

    it('should format date as YYYY-MM-DD', () => {
      const result = applyFieldFormatting(testDate, 'date', { dateFormat: 'YYYY-MM-DD' });
      expect(result).toBe('2024-01-15');
    });

    it('should use DD-MM-YYYY as default when no dateFormat specified', () => {
      const result = applyFieldFormatting(testDate, 'date', {});
      expect(result).toBe('15-01-2024');
    });

    it('should handle Date object input', () => {
      const dateObj = new Date('2024-01-15');
      const result = applyFieldFormatting(dateObj, 'date', { dateFormat: 'YYYY-MM-DD' });
      expect(result).toBe('2024-01-15');
    });

    it('should return empty string for invalid date', () => {
      const result = applyFieldFormatting('', 'date', { dateFormat: 'DD-MM-YYYY' });
      expect(result).toBe('');
    });

    it('should apply prefix/suffix to formatted date', () => {
      const result = applyFieldFormatting(testDate, 'date', {
        dateFormat: 'DD-MM-YYYY',
        prefix: 'Date: ',
        suffix: ' (formatted)'
      });
      expect(result).toBe('Date: 15-01-2024 (formatted)');
    });
  });

  // ========================================
  // CURRENCY FORMATTING
  // ========================================
  describe('currency formatting', () => {
    it('should format number with currency symbol', () => {
      const result = applyFieldFormatting(1234.5, 'number', { currencySymbol: '$' });
      expect(result).toBe('$1234.5');
    });

    it('should format number with currency symbol and decimals', () => {
      const result = applyFieldFormatting(1234.5, 'number', {
        currencySymbol: '$',
        decimals: 2
      });
      expect(result).toBe('$1234.50');
    });

    it('should format number with Euro symbol', () => {
      const result = applyFieldFormatting(999.99, 'number', {
        currencySymbol: '€',
        decimals: 2
      });
      expect(result).toBe('€999.99');
    });

    it('should handle zero with currency formatting', () => {
      const result = applyFieldFormatting(0, 'number', {
        currencySymbol: '$',
        decimals: 2
      });
      expect(result).toBe('$0.00');
    });

    it('should handle negative numbers with currency', () => {
      const result = applyFieldFormatting(-50.5, 'number', {
        currencySymbol: '$',
        decimals: 2
      });
      expect(result).toBe('$-50.50');
    });

    it('should handle string numbers with currency', () => {
      const result = applyFieldFormatting('123.45', 'number', {
        currencySymbol: '$',
        decimals: 2
      });
      expect(result).toBe('$123.45');
    });

    it('should apply prefix/suffix to currency', () => {
      const result = applyFieldFormatting(100, 'number', {
        currencySymbol: '$',
        decimals: 2,
        prefix: 'Total: ',
        suffix: ' USD'
      });
      expect(result).toBe('Total: $100.00 USD');
    });
  });

  // ========================================
  // NUMBER FORMATTING (DECIMALS)
  // ========================================
  describe('number decimal precision', () => {
    it('should format number with 2 decimals', () => {
      const result = applyFieldFormatting(3.14159, 'number', { decimals: 2 });
      expect(result).toBe('3.14');
    });

    it('should format number with 0 decimals', () => {
      const result = applyFieldFormatting(3.7, 'number', { decimals: 0 });
      expect(result).toBe('4');
    });

    it('should format number with 4 decimals', () => {
      const result = applyFieldFormatting(2.5, 'number', { decimals: 4 });
      expect(result).toBe('2.5000');
    });

    it('should handle integer with decimal formatting', () => {
      const result = applyFieldFormatting(100, 'number', { decimals: 2 });
      expect(result).toBe('100.00');
    });

    it('should return original string for non-numeric values', () => {
      const result = applyFieldFormatting('not a number', 'number', { decimals: 2 });
      expect(result).toBe('not a number');
    });

    it('should format without decimals when not specified', () => {
      const result = applyFieldFormatting(123.456, 'number', {});
      expect(result).toBe('123.456');
    });
  });

  // ========================================
  // TEXT TRANSFORMATION
  // ========================================
  describe('text transformation', () => {
    it('should transform text to uppercase', () => {
      const result = applyFieldFormatting('hello world', 'text', { transform: 'uppercase' });
      expect(result).toBe('HELLO WORLD');
    });

    it('should transform text to lowercase', () => {
      const result = applyFieldFormatting('HELLO WORLD', 'text', { transform: 'lowercase' });
      expect(result).toBe('hello world');
    });

    it('should handle mixed case to uppercase', () => {
      const result = applyFieldFormatting('HeLLo WoRLd', 'text', { transform: 'uppercase' });
      expect(result).toBe('HELLO WORLD');
    });

    it('should handle mixed case to lowercase', () => {
      const result = applyFieldFormatting('HeLLo WoRLd', 'text', { transform: 'lowercase' });
      expect(result).toBe('hello world');
    });

    it('should not transform when transform option is not specified', () => {
      const result = applyFieldFormatting('Hello World', 'text', {});
      expect(result).toBe('Hello World');
    });

    it('should apply uppercase to select field type', () => {
      const result = applyFieldFormatting('option a', 'select', { transform: 'uppercase' });
      expect(result).toBe('OPTION A');
    });

    it('should apply lowercase to checkbox field type', () => {
      const result = applyFieldFormatting('YES', 'checkbox', { transform: 'lowercase' });
      expect(result).toBe('yes');
    });
  });

  // ========================================
  // PREFIX/SUFFIX
  // ========================================
  describe('prefix and suffix', () => {
    it('should add prefix to text', () => {
      const result = applyFieldFormatting('value', 'text', { prefix: '[' });
      expect(result).toBe('[value');
    });

    it('should add suffix to text', () => {
      const result = applyFieldFormatting('value', 'text', { suffix: ']' });
      expect(result).toBe('value]');
    });

    it('should add both prefix and suffix', () => {
      const result = applyFieldFormatting('value', 'text', {
        prefix: '[',
        suffix: ']'
      });
      expect(result).toBe('[value]');
    });

    it('should add prefix/suffix to number', () => {
      const result = applyFieldFormatting(100, 'number', {
        prefix: 'Count: ',
        suffix: ' items'
      });
      expect(result).toBe('Count: 100 items');
    });

    it('should add prefix/suffix to date', () => {
      const result = applyFieldFormatting('2024-01-15', 'date', {
        dateFormat: 'YYYY-MM-DD',
        prefix: 'Date: ',
        suffix: ' (UTC)'
      });
      expect(result).toBe('Date: 2024-01-15 (UTC)');
    });

    it('should handle empty prefix and suffix', () => {
      const result = applyFieldFormatting('value', 'text', {
        prefix: '',
        suffix: ''
      });
      expect(result).toBe('value');
    });

    it('should add multi-character prefix/suffix', () => {
      const result = applyFieldFormatting('text', 'text', {
        prefix: '<<< ',
        suffix: ' >>>'
      });
      expect(result).toBe('<<< text >>>');
    });
  });

  // ========================================
  // COMBINED FORMATTING
  // ========================================
  describe('combined formatting', () => {
    it('should apply uppercase + prefix/suffix together', () => {
      const result = applyFieldFormatting('hello', 'text', {
        transform: 'uppercase',
        prefix: '[',
        suffix: ']'
      });
      expect(result).toBe('[HELLO]');
    });

    it('should apply currency + decimals + prefix/suffix', () => {
      const result = applyFieldFormatting(1234.567, 'number', {
        currencySymbol: '$',
        decimals: 2,
        prefix: 'Total: ',
        suffix: ' USD'
      });
      expect(result).toBe('Total: $1234.57 USD');
    });

    it('should apply date format + prefix/suffix', () => {
      const result = applyFieldFormatting('2024-01-15', 'date', {
        dateFormat: 'DD-MM-YYYY',
        prefix: 'Born: ',
        suffix: ' (verified)'
      });
      expect(result).toBe('Born: 15-01-2024 (verified)');
    });

    it('should apply lowercase + prefix/suffix', () => {
      const result = applyFieldFormatting('UPPERCASE TEXT', 'text', {
        transform: 'lowercase',
        prefix: '> ',
        suffix: ' <'
      });
      expect(result).toBe('> uppercase text <');
    });

    it('should apply decimals + prefix/suffix without currency', () => {
      const result = applyFieldFormatting(3.14159, 'number', {
        decimals: 2,
        prefix: 'π ≈ ',
        suffix: ''
      });
      expect(result).toBe('π ≈ 3.14');
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('edge cases', () => {
    it('should handle empty string value', () => {
      const result = applyFieldFormatting('', 'text', { transform: 'uppercase' });
      expect(result).toBe('');
    });

    it('should handle boolean value', () => {
      const result = applyFieldFormatting(true, 'checkbox', { transform: 'uppercase' });
      expect(result).toBe('TRUE');
    });

    it('should handle very large number', () => {
      const result = applyFieldFormatting(1234567890.123, 'number', {
        currencySymbol: '$',
        decimals: 2
      });
      expect(result).toBe('$1234567890.12');
    });

    it('should handle very small decimal', () => {
      const result = applyFieldFormatting(0.00001, 'number', { decimals: 5 });
      expect(result).toBe('0.00001');
    });

    it('should handle special characters in text', () => {
      const result = applyFieldFormatting('hello@world.com', 'text', {
        transform: 'uppercase'
      });
      expect(result).toBe('HELLO@WORLD.COM');
    });

    it('should handle unicode characters', () => {
      const result = applyFieldFormatting('café', 'text', { transform: 'uppercase' });
      expect(result).toBe('CAFÉ');
    });

    it('should handle unknown field type as text', () => {
      const result = applyFieldFormatting('value', 'unknown', { transform: 'uppercase' });
      expect(result).toBe('VALUE');
    });
  });

  // ========================================
  // REAL-WORLD SCENARIOS
  // ========================================
  describe('real-world scenarios', () => {
    it('should format invoice amount', () => {
      const result = applyFieldFormatting(1299.99, 'number', {
        currencySymbol: '$',
        decimals: 2,
        prefix: 'Total: ',
        suffix: ' USD'
      });
      expect(result).toBe('Total: $1299.99 USD');
    });

    it('should format birth date', () => {
      const result = applyFieldFormatting('1990-05-15', 'date', {
        dateFormat: 'DD-MM-YYYY',
        prefix: 'DOB: '
      });
      expect(result).toBe('DOB: 15-05-1990');
    });

    it('should format product code in uppercase', () => {
      const result = applyFieldFormatting('abc123', 'text', {
        transform: 'uppercase',
        prefix: 'SKU-'
      });
      expect(result).toBe('SKU-ABC123');
    });

    it('should format percentage', () => {
      const result = applyFieldFormatting(15.5, 'number', {
        decimals: 1,
        suffix: '%'
      });
      expect(result).toBe('15.5%');
    });

    it('should format tax amount', () => {
      const result = applyFieldFormatting(87.65, 'number', {
        currencySymbol: '€',
        decimals: 2,
        prefix: 'VAT: '
      });
      expect(result).toBe('VAT: €87.65');
    });

    it('should format company name in uppercase', () => {
      const result = applyFieldFormatting('acme corporation', 'text', {
        transform: 'uppercase'
      });
      expect(result).toBe('ACME CORPORATION');
    });

    it('should format file size', () => {
      const result = applyFieldFormatting(1024.768, 'number', {
        decimals: 2,
        suffix: ' MB'
      });
      expect(result).toBe('1024.77 MB');
    });
  });
});
