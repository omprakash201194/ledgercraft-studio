// @vitest-environment jsdom
/**
 * RTL Component Test – ClientTypesPage
 *
 * Focuses on role-based access and basic create flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClientTypesPage from '../pages/ClientTypesPage';
import { AuthContext } from '../components/AuthContext';

// ─── Mock window.api ─────────────────────────────────────────────────────────

const mockGetAllClientTypes = vi.fn();
const mockCreateClientType = vi.fn();
const mockGetClientTypeFields = vi.fn();
const mockAddClientTypeField = vi.fn();
const mockSoftDeleteClientTypeField = vi.fn();

(window as any).api = {
    getAllClientTypes: mockGetAllClientTypes,
    createClientType: mockCreateClientType,
    getClientTypeFields: mockGetClientTypeFields,
    addClientTypeField: mockAddClientTypeField,
    softDeleteClientTypeField: mockSoftDeleteClientTypeField,
};

function renderPage(role: 'ADMIN' | 'USER' = 'ADMIN') {
    return render(
        <AuthContext.Provider value={{
            user: { id: 'u-1', username: 'test', role, created_at: '' },
            loading: false,
            login: vi.fn(async () => ({ success: true })),
            logout: vi.fn(async () => { }),
        }}>
            <MemoryRouter initialEntries={['/client-types']}>
                <Routes>
                    <Route path="/client-types" element={<ClientTypesPage />} />
                    <Route path="/dashboard" element={<div>Dashboard</div>} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );
}

describe('ClientTypesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAllClientTypes.mockResolvedValue([]);
        mockCreateClientType.mockResolvedValue({
            id: 'ct-1',
            name: 'New Type',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        mockGetClientTypeFields.mockResolvedValue([]);
        mockAddClientTypeField.mockResolvedValue({
            id: 'f-1',
            client_type_id: 'ct-1',
            label: 'Field',
            field_key: 'field',
            data_type: 'text',
            is_required: 0,
            is_deleted: 0,
            created_at: new Date().toISOString(),
        });
        mockSoftDeleteClientTypeField.mockResolvedValue(undefined);
    });

    it('renders for ADMIN and loads client types', async () => {
        renderPage('ADMIN');

        expect(screen.getByText('Client Types')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Create Client Type' })).toBeTruthy();

        await waitFor(() => expect(mockGetAllClientTypes).toHaveBeenCalled());
    });

    it('redirects non-ADMIN to dashboard', async () => {
        renderPage('USER');

        await waitFor(() => {
            expect(screen.getByText('Dashboard')).toBeTruthy();
        });
        expect(screen.queryByText('Client Types')).toBeNull();
    });

    it('opens create dialog and calls createClientType', async () => {
        renderPage('ADMIN');
        await waitFor(() => expect(mockGetAllClientTypes).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Create Client Type' }));
        await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

        fireEvent.change(screen.getByLabelText('Type Name'), { target: { value: 'New Type' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() => {
            expect(mockCreateClientType).toHaveBeenCalledWith('New Type');
        });
    });
});
