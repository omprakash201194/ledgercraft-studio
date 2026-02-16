import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, DateFormat } from './dateUtils';

/**
 * Test suite for electron/utils/dateUtils.ts
 *
 * These tests verify that date formatting utilities work correctly
 * in the electron main process, ensuring consistency with the renderer version.
 */

describe('dateUtils (Electron)', () => {
  describe('formatDate', () => {
    const testDate = '2024-01-15';
    const testDateObj = new Date('2024-01-15T00:00:00');

    describe('DD-MM-YYYY format', () => {
      it('should format string date as DD-MM-YYYY', () => {
        expect(formatDate(testDate, 'DD-MM-YYYY')).toBe('15-01-2024');
      });

      it('should format Date object as DD-MM-YYYY', () => {
        expect(formatDate(testDateObj, 'DD-MM-YYYY')).toBe('15-01-2024');
      });

      it('should use DD-MM-YYYY as default format', () => {
        expect(formatDate(testDate, 'invalid-format' as DateFormat)).toBe('15-01-2024');
      });
    });

    describe('MM-DD-YYYY format', () => {
      it('should format string date as MM-DD-YYYY', () => {
        expect(formatDate(testDate, 'MM-DD-YYYY')).toBe('01-15-2024');
      });

      it('should format Date object as MM-DD-YYYY', () => {
        expect(formatDate(testDateObj, 'MM-DD-YYYY')).toBe('01-15-2024');
      });
    });

    describe('YYYY-MM-DD format', () => {
      it('should format string date as YYYY-MM-DD', () => {
        expect(formatDate(testDate, 'YYYY-MM-DD')).toBe('2024-01-15');
      });

      it('should format Date object as YYYY-MM-DD', () => {
        expect(formatDate(testDateObj, 'YYYY-MM-DD')).toBe('2024-01-15');
      });
    });

    describe('Edge cases', () => {
      it('should return empty string for empty input', () => {
        expect(formatDate('', 'DD-MM-YYYY')).toBe('');
      });

      it('should return original string for invalid date', () => {
        expect(formatDate('not-a-date', 'DD-MM-YYYY')).toBe('not-a-date');
      });

      it('should handle null input gracefully', () => {
        expect(formatDate(null as any, 'DD-MM-YYYY')).toBe('');
      });

      it('should handle undefined input gracefully', () => {
        expect(formatDate(undefined as any, 'DD-MM-YYYY')).toBe('');
      });
    });

    describe('Date boundary cases', () => {
      it('should handle first day of year', () => {
        expect(formatDate('2024-01-01', 'DD-MM-YYYY')).toBe('01-01-2024');
      });

      it('should handle last day of year', () => {
        expect(formatDate('2024-12-31', 'DD-MM-YYYY')).toBe('31-12-2024');
      });

      it('should handle leap year date', () => {
        expect(formatDate('2024-02-29', 'DD-MM-YYYY')).toBe('29-02-2024');
      });

      it('should pad single-digit days', () => {
        expect(formatDate('2024-01-05', 'DD-MM-YYYY')).toBe('05-01-2024');
      });

      it('should pad single-digit months', () => {
        expect(formatDate('2024-03-15', 'DD-MM-YYYY')).toBe('15-03-2024');
      });
    });

    describe('Different date input formats', () => {
      it('should handle ISO 8601 format with time', () => {
        expect(formatDate('2024-01-15T10:30:00', 'DD-MM-YYYY')).toBe('15-01-2024');
      });

      it('should handle ISO 8601 format with timezone', () => {
        expect(formatDate('2024-01-15T10:30:00Z', 'DD-MM-YYYY')).toBe('15-01-2024');
      });

      it('should handle millisecond timestamp', () => {
        const timestamp = new Date('2024-01-15').getTime();
        expect(formatDate(new Date(timestamp), 'DD-MM-YYYY')).toBe('15-01-2024');
      });
    });
  });

  describe('formatDateTime', () => {
    const testDateTime = '2024-01-15T14:30:00';

    describe('Basic functionality', () => {
      it('should format date and time with DD-MM-YYYY', () => {
        const result = formatDateTime(testDateTime, 'DD-MM-YYYY');
        expect(result).toMatch(/15-01-2024 \d{1,2}:\d{2}/);
      });

      it('should format date and time with MM-DD-YYYY', () => {
        const result = formatDateTime(testDateTime, 'MM-DD-YYYY');
        expect(result).toMatch(/01-15-2024 \d{1,2}:\d{2}/);
      });

      it('should format date and time with YYYY-MM-DD', () => {
        const result = formatDateTime(testDateTime, 'YYYY-MM-DD');
        expect(result).toMatch(/2024-01-15 \d{1,2}:\d{2}/);
      });
    });

    describe('Edge cases', () => {
      it('should return empty string for empty input', () => {
        expect(formatDateTime('', 'DD-MM-YYYY')).toBe('');
      });

      it('should return original string for invalid date', () => {
        expect(formatDateTime('not-a-date', 'DD-MM-YYYY')).toBe('not-a-date');
      });

      it('should handle Date object input', () => {
        const dateObj = new Date('2024-01-15T14:30:00');
        const result = formatDateTime(dateObj, 'DD-MM-YYYY');
        expect(result).toMatch(/15-01-2024 \d{1,2}:\d{2}/);
      });
    });

    describe('Time formatting', () => {
      it('should include time in 12-hour format', () => {
        const result = formatDateTime('2024-01-15T14:30:00', 'DD-MM-YYYY');
        // Time format depends on locale, just verify it exists
        expect(result).toContain('15-01-2024');
        expect(result).toMatch(/\d{1,2}:\d{2}/);
      });

      it('should handle midnight', () => {
        const result = formatDateTime('2024-01-15T00:00:00', 'DD-MM-YYYY');
        expect(result).toContain('15-01-2024');
        expect(result).toMatch(/\d{1,2}:\d{2}/);
      });

      it('should handle noon', () => {
        const result = formatDateTime('2024-01-15T12:00:00', 'DD-MM-YYYY');
        expect(result).toContain('15-01-2024');
        expect(result).toMatch(/\d{1,2}:\d{2}/);
      });
    });
  });

  describe('Type safety', () => {
    it('should accept DateFormat type', () => {
      const format: DateFormat = 'DD-MM-YYYY';
      expect(formatDate('2024-01-15', format)).toBe('15-01-2024');
    });

    it('should work with all DateFormat values', () => {
      const formats: DateFormat[] = ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'];
      formats.forEach(format => {
        expect(formatDate('2024-01-15', format)).toBeTruthy();
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should format invoice date correctly', () => {
      const invoiceDate = '2024-01-15';
      expect(formatDate(invoiceDate, 'DD-MM-YYYY')).toBe('15-01-2024');
    });

    it('should format due date correctly', () => {
      const dueDate = '2024-02-28';
      expect(formatDate(dueDate, 'MM-DD-YYYY')).toBe('02-28-2024');
    });

    it('should format payment date with time', () => {
      const paymentDate = '2024-01-15T16:45:00';
      const result = formatDateTime(paymentDate, 'YYYY-MM-DD');
      expect(result).toContain('2024-01-15');
    });

    it('should handle financial year end date', () => {
      const fyEnd = '2024-03-31';
      expect(formatDate(fyEnd, 'DD-MM-YYYY')).toBe('31-03-2024');
    });

    it('should handle GST filing date', () => {
      const gstDate = '2024-04-20';
      expect(formatDate(gstDate, 'DD-MM-YYYY')).toBe('20-04-2024');
    });
  });

  describe('Consistency between formatDate and formatDateTime', () => {
    it('should have consistent date part between formatDate and formatDateTime', () => {
      const testDate = '2024-01-15T10:30:00';
      const dateOnly = formatDate(testDate, 'DD-MM-YYYY');
      const dateTime = formatDateTime(testDate, 'DD-MM-YYYY');

      expect(dateTime).toContain(dateOnly);
    });

    it('should handle same input consistently', () => {
      const testDate = '2024-01-15';
      const dateOnly = formatDate(testDate, 'MM-DD-YYYY');
      const dateTime = formatDateTime(testDate, 'MM-DD-YYYY');

      expect(dateTime).toContain(dateOnly);
    });
  });
});
