
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

/**
 * Extract unique {{placeholder}} keys from a .docx file buffer.
 */
export function extractPlaceholders(fileBuffer: Buffer): string[] {
    try {
        const zip = new PizZip(fileBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
        });

        // Get full text from the document
        const text = doc.getFullText();

        // Extract all {{...}} placeholders using regex
        const regex = /\{\{(.*?)\}\}/g;
        const matches: string[] = [];
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            const key = match[1].trim();
            if (key && !matches.includes(key)) {
                matches.push(key);
            }
        }

        return matches;
    } catch (error) {
        console.error('Error parsing template:', error);
        return [];
    }
}
