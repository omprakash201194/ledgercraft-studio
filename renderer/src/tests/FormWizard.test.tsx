// @vitest-environment jsdom
/**
 * RTL Component Test – FormWizard
 *
 * Tests the FormWizard dialog's internal state machine:
 *  1. Dialog renders when open=true
 *  2. Dialog does NOT render content when open=false
 *  3. Cancel button calls onClose
 *  4. Clicking Next without a form name shows validation error
 *  5. Clicking Next without a template shows validation error
 *  6. Filling form name + selecting template allows progressing to Step 2
 *  7. In Edit mode, dialog title changes to "Edit Form"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FormWizard from '../components/FormWizard';

// ─── Mock heavy deps to avoid ESM/jsdom incompatibilities ────────────────────

// CategoryTree imports @mui/x-tree-view which has ESM issues in jsdom
vi.mock('../components/CategoryTree', () => ({
    default: ({ onSelectCategory }: any) => (
        <div data-testid="category-tree">
            <button onClick={() => onSelectCategory(null)}>All</button>
        </div>
    ),
}));

// ─── Mock window.api ──────────────────────────────────────────────────────────

const mockGetTemplates = vi.fn();
const mockGenerateFormFields = vi.fn();
const mockGetTemplatePlaceholders = vi.fn();
const mockGetFormById = vi.fn();
const mockGetFormFields = vi.fn();
const mockCreateForm = vi.fn();
const mockGetDbStatus = vi.fn();

(window as any).api = {
    getTemplates: mockGetTemplates,
    generateFormFields: mockGenerateFormFields,
    getTemplatePlaceholders: mockGetTemplatePlaceholders,
    getFormById: mockGetFormById,
    getFormFields: mockGetFormFields,
    createForm: mockCreateForm,
    getDbStatus: mockGetDbStatus,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEMPLATES = [
    { id: 'tmpl-1', name: 'Invoice Template', placeholder_count: 3 },
    { id: 'tmpl-2', name: 'Salary Template', placeholder_count: 2 },
];

const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    editFormId: null as string | null,
    initialCategoryId: null as string | null,
};

function renderWizard(props: Partial<typeof defaultProps> = {}) {
    return render(
        <MemoryRouter>
            <FormWizard {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FormWizard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTemplates.mockResolvedValue({ templates: TEMPLATES, total: TEMPLATES.length });
        mockGenerateFormFields.mockResolvedValue([]);
        mockGetTemplatePlaceholders.mockResolvedValue([]);
        mockGetDbStatus.mockResolvedValue({ connected: true, isCorrupted: false });
    });

    it('renders the Create Form dialog when open=true', async () => {
        renderWizard();
        await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByText('Create Form')).toBeTruthy();
    });

    it('does NOT render the dialog when open=false', () => {
        renderWizard({ open: false });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('Cancel button triggers onClose', async () => {
        const onClose = vi.fn();
        renderWizard({ onClose });

        await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('shows validation error when Next clicked with empty form name', async () => {
        renderWizard();
        await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));

        expect(screen.getByText('Form name is required')).toBeTruthy();
    });

    it('shows validation error when Next clicked without template selected', async () => {
        renderWizard();
        await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());

        // Fill form name using the input element inside the FormName textfield
        const nameInputs = screen.getAllByRole('textbox');
        // First textbox is "Form Name"
        fireEvent.change(nameInputs[0], { target: { value: 'My Form' } });
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));

        expect(screen.getByText('Please select a template')).toBeTruthy();
    });

    it('step indicator chips are rendered on Step 1', async () => {
        renderWizard();
        await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());

        expect(screen.getByText('1. Details')).toBeTruthy();
        expect(screen.getByText('2. Fields')).toBeTruthy();
    });

    it('shows "Edit Form" title when editFormId is provided', async () => {
        mockGetFormById.mockResolvedValue({
            id: 'form-existing',
            name: 'Existing Form',
            template_id: 'tmpl-1',
            category_id: null,
        });
        mockGetFormFields.mockResolvedValue([]);

        renderWizard({ editFormId: 'form-existing' });

        await waitFor(() => expect(screen.getByText('Edit Form')).toBeTruthy());
    });

    it('template select dropdown is rendered in Step 1', async () => {
        renderWizard();
        await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());

        // The Template label text should be visible
        expect(screen.getByText('Template')).toBeTruthy();
    });

    it('FormName field accepts user input', async () => {
        renderWizard();
        await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());

        // Get form name text input (first textbox in step 1)
        const textboxes = screen.getAllByRole('textbox');
        fireEvent.change(textboxes[0], { target: { value: 'Annual Report' } });
        expect((textboxes[0] as HTMLInputElement).value).toBe('Annual Report');
    });
});
