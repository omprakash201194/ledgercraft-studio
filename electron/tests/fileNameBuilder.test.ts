import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitize, buildBulkFileName, ensureUniqueFilePath } from '../utils/fileNameBuilder';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('FileNameBuilder Utils', () => {

    describe('sanitize', () => {
        it('should remove invalid characters from filename', () => {
            const result = sanitize('Client <Name> : "123" / \\ | ? *');
            // Spaces are replaced with underscores
            expect(result).toBe('Client_Name_123');
        });

        it('should handle undefined or empty strings', () => {
            expect(sanitize('')).toBe('Unknown');
            expect(sanitize(undefined as any)).toBe('Unknown');
        });

        it('should trim and replace multiple spaces with single underscore contextually', () => {
            const result = sanitize('   Hello     World   ');
            expect(result).toBe('Hello_World');
        });
    });

    describe('buildBulkFileName', () => {
        it('should build name without financial year', () => {
            const result = buildBulkFileName('Acme Corp', 'Balance Sheet');
            expect(result).toMatch(/^Acme_Corp_Balance_Sheet_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z\.docx$/);
        });

        it('should build name with financial year', () => {
            const result = buildBulkFileName('Acme Corp', 'Balance Sheet', 'FY 23/24');
            // 'FY 23/24' -> 'FY_2324' because '/' is stripped, spaces to underscores. Actually it'll be 'FY_2324'
            // Let's test what sanitize does to 'FY 23/24'
            // '/' is stripped -> 'FY 2324' -> 'FY_2324'
            expect(result).toMatch(/^Acme_Corp_Balance_Sheet_FY_2324_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d+Z\.docx$/);
        });
    });

    describe('ensureUniqueFilePath', () => {
        const testDir = path.join(os.tmpdir(), 'ledgercraft_filename_tests');

        beforeEach(() => {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        });

        afterEach(() => {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        });

        it('should return original path if file does not exist', () => {
            const result = ensureUniqueFilePath(testDir, 'test.txt');
            expect(result).toBe(path.join(testDir, 'test.txt'));
        });

        it('should append counter if file exists', () => {
            // Setup duplicate
            fs.mkdirSync(testDir, { recursive: true });
            fs.writeFileSync(path.join(testDir, 'test.txt'), 'hello');

            const result = ensureUniqueFilePath(testDir, 'test.txt');
            expect(result).toBe(path.join(testDir, 'test(1).txt'));
        });

        it('should increment counter if multiple files exist', () => {
            fs.mkdirSync(testDir, { recursive: true });
            fs.writeFileSync(path.join(testDir, 'test.txt'), 'hello');
            fs.writeFileSync(path.join(testDir, 'test(1).txt'), 'hello');
            fs.writeFileSync(path.join(testDir, 'test(2).txt'), 'hello');

            const result = ensureUniqueFilePath(testDir, 'test.txt');
            expect(result).toBe(path.join(testDir, 'test(3).txt'));
        });
    });
});
