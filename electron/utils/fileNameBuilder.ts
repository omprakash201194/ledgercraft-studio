import path from 'path';
import fs from 'fs';

/**
 * Strips invalid characters from a filename.
 * Removes < > : " / \ | ? * and replaces spaces with underscores.
 */
export function sanitize(name: string): string {
    if (!name) return 'Unknown';
    return name
        .replace(/[<>:"/\\|?*]/g, '')
        .trim()
        .replace(/\s+/g, '_');
}

/**
 * Builds a standardized file name for bulk generated reports.
 * Format: {SanitizedClientName}_{SanitizedFormName}_{FinancialYear_If_Any}_{Timestamp}.docx
 */
export function buildBulkFileName(clientName: string, formName: string, financialYear?: string): string {
    const safeClient = sanitize(clientName);
    const safeForm = sanitize(formName);
    const safeFy = financialYear ? sanitize(financialYear) : null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (safeFy) {
        return `${safeClient}_${safeForm}_${safeFy}_${timestamp}.docx`;
    }
    return `${safeClient}_${safeForm}_${timestamp}.docx`;
}

/**
 * Returns a unique file path within the specified directory.
 * If the file exists, appends an incrementing counter: name(1).docx
 */
export function ensureUniqueFilePath(directoryPath: string, fileName: string): string {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }

    let filePath = path.join(directoryPath, fileName);
    let counter = 1;

    const ext = path.extname(fileName); // e.g., '.docx'
    const nameWithoutExt = path.basename(fileName, ext); // e.g., 'Client_Form_Time'

    while (fs.existsSync(filePath)) {
        const newName = `${nameWithoutExt}(${counter})${ext}`;
        filePath = path.join(directoryPath, newName);
        counter++;
    }

    return filePath;
}
