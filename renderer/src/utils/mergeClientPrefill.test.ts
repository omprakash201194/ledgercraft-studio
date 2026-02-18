
import { describe, it, expect } from 'vitest';
import { mergeClientPrefill } from './mergeClientPrefill';

describe('mergeClientPrefill', () => {
    it('should use client value when form value is empty', () => {
        const form = { a: '' };
        const client = { a: 'client' };
        const result = mergeClientPrefill(form, client);
        expect(result).toEqual({ a: 'client' });
    });

    it('should use client value when form value is null', () => {
        const form = { a: null };
        const client = { a: 'client' };
        const result = mergeClientPrefill(form, client);
        expect(result).toEqual({ a: 'client' });
    });

    it('should use client value when form value is undefined', () => {
        const form = { a: undefined };
        const client = { a: 'client' };
        const result = mergeClientPrefill(form, client);
        expect(result).toEqual({ a: 'client' });
    });

    it('should keep manual override when form value exists', () => {
        const form = { a: 'manual' };
        const client = { a: 'client' };
        const result = mergeClientPrefill(form, client);
        expect(result).toEqual({ a: 'manual' });
    });

    it('should handle partial merges correctly', () => {
        const form = { a: '', b: 'keep' };
        const client = { a: 'new', b: 'ignore' };
        const result = mergeClientPrefill(form, client);
        expect(result).toEqual({ a: 'new', b: 'keep' });
    });

    it('should leave form values unchanged if no client values provided', () => {
        const form = { a: '' };
        const client = {};
        const result = mergeClientPrefill(form, client);
        expect(result).toEqual({ a: '' });
    });

    it('should ensure input objects are immutable', () => {
        const form = { a: '' };
        const client = { a: 'val' };
        const result = mergeClientPrefill(form, client);

        expect(form).toEqual({ a: '' }); // Unchanged
        expect(client).toEqual({ a: 'val' }); // Unchanged
        expect(result).not.toBe(form); // Must be a new object
    });

    it('should handle extra client fields not in form', () => {
        // If client has fields that form doesn't have, they should be added
        // (Assuming we want to populate all possible known values)
        const form = { a: 'val' };
        const client = { b: 'extra' };
        const result = mergeClientPrefill(form, client);
        expect(result).toEqual({ a: 'val', b: 'extra' });
    });
});
