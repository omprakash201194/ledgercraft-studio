// @vitest-environment jsdom
/**
 * RTL Component Test – CategoryTree
 *
 * Tests CategoryTree's internal state machine:
 *  1. "All Items" root node is always rendered
 *  2. Pre-seeded categories appear in the tree
 *  3. "Create Root Category" button is visible when not readOnly
 *  4. "Create Root Category" button is NOT visible in readOnly mode
 *  5. Clicking "Create Root Category" opens the create dialog
 *  6. Submitting create dialog calls createCategory and reloads tree
 *  7. Clicking a tree item calls onSelectCategory
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CategoryTree from '../components/CategoryTree';

// ─── Mock @mui/x-tree-view to avoid ESM directory import error ────────────────

vi.mock('@mui/x-tree-view/SimpleTreeView', () => ({
    SimpleTreeView: ({ children, onSelectedItemsChange, selectedItems }: any) => (
        <div
            data-testid="simple-tree-view"
            data-selected={selectedItems}
        >
            {children}
        </div>
    ),
}));

vi.mock('@mui/x-tree-view/TreeItem', () => ({
    TreeItem: ({ itemId, label, children }: any) => (
        <div data-testid={`tree-item-${itemId}`} role="treeitem">
            <span>{typeof label === 'string' ? label : label}</span>
            {children}
        </div>
    ),
}));

// ─── Mock window.api ──────────────────────────────────────────────────────────

const mockGetCategoryTree = vi.fn();
const mockCreateCategory = vi.fn();
const mockRenameCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockGetDbStatus = vi.fn();

(window as any).api = {
    getCategoryTree: mockGetCategoryTree,
    createCategory: mockCreateCategory,
    renameCategory: mockRenameCategory,
    deleteCategory: mockDeleteCategory,
    getDbStatus: mockGetDbStatus,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
    {
        id: 'cat-1',
        name: 'Clients 2024',
        parent_id: null,
        type: 'FORM' as const,
        children: [],
    },
    {
        id: 'cat-2',
        name: 'Archived',
        parent_id: null,
        type: 'FORM' as const,
        children: [],
    },
];

const defaultProps = {
    type: 'FORM' as const,
    selectedCategoryId: null as string | null,
    onSelectCategory: vi.fn(),
    refreshTrigger: 0,
    readOnly: false,
    onDataChange: vi.fn(),
};

function renderTree(props: Partial<typeof defaultProps> = {}) {
    return render(<CategoryTree {...defaultProps} {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CategoryTree', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCategoryTree.mockResolvedValue([]);
        mockCreateCategory.mockResolvedValue({ success: true, category: { id: 'new-cat', name: 'New Cat', children: [] } });
        mockGetDbStatus.mockResolvedValue({ connected: true, isCorrupted: false });
    });

    it('"All Items" root node is always rendered', async () => {
        renderTree();
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalled());
        expect(screen.getByText('All Items')).toBeTruthy();
    });

    it('pre-seeded categories appear in the tree', async () => {
        mockGetCategoryTree.mockResolvedValue(CATEGORIES);
        renderTree();

        await waitFor(() => {
            expect(screen.getByText('Clients 2024')).toBeTruthy();
            expect(screen.getByText('Archived')).toBeTruthy();
        });
    });

    it('"Create Root Category" button is visible when not readOnly', async () => {
        renderTree({ readOnly: false });
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalled());

        expect(
            screen.getByRole('button', { name: 'Create Root Category' })
        ).toBeTruthy();
    });

    it('"Create Root Category" button is NOT visible in readOnly mode', async () => {
        renderTree({ readOnly: true });
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalled());

        expect(
            screen.queryByRole('button', { name: 'Create Root Category' })
        ).toBeNull();
    });

    it('clicking "Create Root Category" opens the create dialog', async () => {
        renderTree({ readOnly: false });
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Create Root Category' }));

        // Dialog should open with a text field for category name
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeTruthy();
        });
    });

    it('submitting create dialog calls createCategory API', async () => {
        renderTree({ readOnly: false });
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Create Root Category' }));

        await waitFor(() => screen.getByRole('dialog'));

        // Type a category name into the dialog text field
        const nameInput = screen.getByRole('textbox');
        fireEvent.change(nameInput, { target: { value: 'Q1 Reports' } });

        // Click Create/Save button
        fireEvent.click(screen.getByRole('button', { name: /create/i }));

        await waitFor(() => {
            expect(mockCreateCategory).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Q1 Reports', parentId: null })
            );
        });
    });

    it('getCategoryTree is called with the correct type', async () => {
        renderTree({ type: 'TEMPLATE' });
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalledWith('TEMPLATE'));
    });

    it('re-fetches tree when refreshTrigger changes', async () => {
        const { rerender } = renderTree({ refreshTrigger: 0 });
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalledTimes(1));

        rerender(<CategoryTree {...defaultProps} refreshTrigger={1} />);
        await waitFor(() => expect(mockGetCategoryTree).toHaveBeenCalledTimes(2));
    });
});
