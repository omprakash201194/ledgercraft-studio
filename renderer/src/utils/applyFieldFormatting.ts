import { formatDate } from './dateUtils';

/**
 * Format options for field values
 */
export interface FieldFormatOptions {
  // Date formatting
  dateFormat?: 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD';

  // Number/Currency formatting
  decimals?: number;
  currencySymbol?: string;

  // Text transformation
  transform?: 'uppercase' | 'lowercase';

  // Prefix/Suffix
  prefix?: string;
  suffix?: string;
}

/**
 * Apply formatting to a field value based on field type and format options.
 * Pure utility function with no side effects.
 *
 * @param value - The raw value to format
 * @param fieldType - The type of the field (text, number, date, select, checkbox)
 * @param formatOptions - Optional formatting configuration (parsed JSON object)
 * @returns Formatted string value
 *
 * @example
 * // Date formatting
 * applyFieldFormatting('2024-01-15', 'date', { dateFormat: 'MM-DD-YYYY' })
 * // => '01-15-2024'
 *
 * @example
 * // Currency formatting
 * applyFieldFormatting(1234.5, 'number', { currencySymbol: '$', decimals: 2 })
 * // => '$1234.50'
 *
 * @example
 * // Text transformation with prefix/suffix
 * applyFieldFormatting('hello', 'text', { transform: 'uppercase', prefix: '[', suffix: ']' })
 * // => '[HELLO]'
 */
export function applyFieldFormatting(
  value: any,
  fieldType: string,
  formatOptions?: FieldFormatOptions | null
): string {
  // If no format options provided, return value as-is (converted to string)
  if (!formatOptions || formatOptions === null) {
    return String(value ?? '');
  }

  // Handle null/undefined values
  if (value === null || value === undefined) {
    return '';
  }

  let formattedValue = String(value);

  // Apply field-type-specific formatting
  switch (fieldType.toLowerCase()) {
    case 'date':
      formattedValue = applyDateFormatting(value, formatOptions);
      break;

    case 'number':
      formattedValue = applyNumberFormatting(value, formatOptions);
      break;

    case 'text':
    case 'select':
    case 'checkbox':
    default:
      formattedValue = applyTextFormatting(value, formatOptions);
      break;
  }

  // Apply prefix/suffix (applies to all field types)
  if (formatOptions.prefix) {
    formattedValue = formatOptions.prefix + formattedValue;
  }

  if (formatOptions.suffix) {
    formattedValue = formattedValue + formatOptions.suffix;
  }

  return formattedValue;
}

/**
 * Apply date formatting using the existing formatDate utility
 */
function applyDateFormatting(value: any, options: FieldFormatOptions): string {
  if (!value) return '';

  const dateFormat = options.dateFormat || 'DD-MM-YYYY';

  // Use the existing formatDate utility
  const formatted = formatDate(value, dateFormat);

  return formatted;
}

/**
 * Apply number formatting (decimals, currency symbol)
 */
function applyNumberFormatting(value: any, options: FieldFormatOptions): string {
  // Convert to number
  const num = typeof value === 'number' ? value : parseFloat(String(value));

  // If not a valid number, return original value as string
  if (isNaN(num)) {
    return String(value);
  }

  // Apply decimal precision if specified
  let formatted: string;
  if (typeof options.decimals === 'number') {
    formatted = num.toFixed(options.decimals);
  } else {
    formatted = String(num);
  }

  // Apply currency symbol if specified
  if (options.currencySymbol) {
    formatted = options.currencySymbol + formatted;
  }

  return formatted;
}

/**
 * Apply text transformations (uppercase, lowercase)
 */
function applyTextFormatting(value: any, options: FieldFormatOptions): string {
  let formatted = String(value);

  // Apply text transformation if specified
  if (options.transform === 'uppercase') {
    formatted = formatted.toUpperCase();
  } else if (options.transform === 'lowercase') {
    formatted = formatted.toLowerCase();
  }

  return formatted;
}
