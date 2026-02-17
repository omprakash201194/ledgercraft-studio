import { database, Category } from './database';
import fs from 'fs';
import { getCurrentUser } from './auth';
import { logAction } from './auditService';

// ─── Types ───────────────────────────────────────────────

export interface CategoryNode extends Category {
    children: CategoryNode[];
}

export interface MoveItemInput {
    itemId: string;
    targetCategoryId: string | null; // null means root
    type: 'TEMPLATE' | 'FORM';
}

export interface CreateCategoryInput {
    name: string;
    parentId: string | null;
    type: 'TEMPLATE' | 'FORM';
}

export interface ServiceResult {
    success: boolean;
    error?: string;
}

export interface MoveItemResult extends ServiceResult {
    item?: any;
}

// ─── Service ─────────────────────────────────────────────

/**
 * Get category tree for a specific type.
 * Returns a hierarchical list of category nodes.
 */
export function getCategoryTree(type: 'TEMPLATE' | 'FORM'): CategoryNode[] {
    const categories = database.getAllCategoriesByType(type);
    return buildTree(categories);
}

/**
 * Get the ancestral path for a category (Breadcrumbs).
 * Returns array from root to current category.
 */
export function getCategoryChain(categoryId: string): { id: string; name: string }[] {
    const chain: { id: string; name: string }[] = [];
    let currentId: string | null = categoryId;

    // Safety limit to prevent infinite loops if circular ref exists
    let depth = 0;
    const MAX_DEPTH = 20;

    while (currentId && depth < MAX_DEPTH) {
        const category = database.getCategoryById(currentId);
        if (!category) break;

        chain.unshift({ id: category.id, name: category.name });
        currentId = category.parent_id;
        depth++;
    }

    return chain;
}

/**
 * Recursive function to build tree from flat list.
 */
function buildTree(categories: Category[], parentId: string | null = null): CategoryNode[] {
    return categories
        .filter((cat) => cat.parent_id === parentId)
        .map((cat) => ({
            ...cat,
            children: buildTree(categories, cat.id),
        }));
}

export function createCategory(input: CreateCategoryInput): ServiceResult {
    try {
        if (!input.name.trim()) {
            return { success: false, error: 'Category name is required' };
        }
        database.createCategory({
            name: input.name,
            parent_id: input.parentId,
            type: input.type,
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

export function renameCategory(id: string, newName: string): ServiceResult {
    try {
        if (!newName.trim()) {
            return { success: false, error: 'Category name is required' };
        }
        database.updateCategoryName(id, newName);
        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

export function deleteCategory(id: string, type: 'TEMPLATE' | 'FORM'): ServiceResult {
    try {
        // Validation: Must ensure no children
        const childrenCount = database.getCategoryChildrenCount(id);
        if (childrenCount > 0) {
            return { success: false, error: 'Cannot delete category with subcategories.' };
        }

        // Validation: Must ensure no items
        const itemCount = database.getCategoryItemCount(id, type);
        if (itemCount > 0) {
            return { success: false, error: `Cannot delete category containing ${type === 'TEMPLATE' ? 'templates' : 'forms'}. Move them first.` };
        }

        database.deleteCategory(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

export function moveItem(input: MoveItemInput): MoveItemResult {
    try {


        // Validate Target Category (if not root)
        if (input.targetCategoryId) {
            const category = database.getCategoryById(input.targetCategoryId);
            if (!category) {
                console.error(`[CategoryService] Target category not found: ${input.targetCategoryId}`);
                return { success: false, error: 'Target category does not exist.' };
            }
            if (category.type !== input.type) {
                console.error(`[CategoryService] Type mismatch: Item=${input.type}, Category=${category.type}`);
                return { success: false, error: `Cannot move ${input.type} into ${category.type} category.` };
            }
        }

        let updatedItem: any;

        if (input.type === 'TEMPLATE') {
            const template = database.getTemplateById(input.itemId);
            if (!template) {
                return { success: false, error: 'Template not found' };
            }
            database.updateTemplateCategory(input.itemId, input.targetCategoryId);
            updatedItem = database.getTemplateById(input.itemId); // Refetch
        } else {
            const form = database.getFormById(input.itemId);
            if (!form) {
                return { success: false, error: 'Form not found' };
            }
            database.updateFormCategory(input.itemId, input.targetCategoryId);
            updatedItem = database.getFormById(input.itemId); // Refetch
        }



        const currentUser = getCurrentUser();
        if (currentUser) {
            logAction({
                userId: currentUser.id,
                actionType: 'ITEM_MOVE',
                entityType: input.type,
                entityId: input.itemId,
                metadata: { targetCategoryId: input.targetCategoryId }
            });
        }

        return { success: true, item: updatedItem };
    } catch (e) {
        console.error(`[CategoryService] Move failed:`, e);
        return { success: false, error: String(e) };
    }
}

export function deleteTemplate(id: string, force: boolean = false): ServiceResult & { usageCount?: number } {
    try {
        // Validation: Check usage by forms if not forced
        const usageCount = database.getTemplateUsageCount(id);

        if (!force && usageCount > 0) {
            return { success: false, error: 'TEMPLATE_USED', usageCount };
        }

        // Get file path to delete file
        const template = database.getTemplateById(id);
        if (template && fs.existsSync(template.file_path)) {
            try {
                fs.unlinkSync(template.file_path);
            } catch (err) {
                console.error(`[CategoryService] Failed to delete file: ${template.file_path}`, err);
                // Continue with DB deletion even if file delete fails (orphaned file is better than broken DB state?)
                // Or maybe strictly strict? Let's log and continue.
            }
        }

        database.deleteTemplate(id, force);

        const currentUser = getCurrentUser();
        if (currentUser) {
            logAction({
                userId: currentUser.id,
                actionType: 'TEMPLATE_DELETE',
                entityType: 'TEMPLATE',
                entityId: id,
                metadata: { force }
            });
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

export function deleteForm(id: string): ServiceResult {
    try {
        // Validation: Check usage in reports
        if (database.formHasReports(id)) {
            return { success: false, error: 'Cannot delete form: It has existing reports. Delete reports first.' };
        }

        database.deleteForm(id); // Fixed typo in tool call if existed, but here I just match content

        const currentUser = getCurrentUser();
        if (currentUser) {
            logAction({
                userId: currentUser.id,
                actionType: 'FORM_DELETE',
                entityType: 'FORM',
                entityId: id
            });
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

/**
 * Mirrors a TEMPLATE category chain into the FORM category tree.
 * Creates missing FORM categories as needed.
 * Returns the ID of the final FORM category.
 */
export function mirrorCategoryHierarchy(templateCategoryId: string): string | null {
    // 1. Get the full chain of the template category
    const chain = getCategoryChain(templateCategoryId);
    if (chain.length === 0) return null;

    let currentFormParentId: string | null = null;

    // 2. Iterate through the chain and ensure each level exists in FORM tree
    for (const templateCat of chain) {
        // Find existing FORM category with same name and parent
        const db = database.getConnection();
        const existingCat = db.prepare(`
            SELECT id FROM categories 
            WHERE type = 'FORM' 
            AND name = ? 
            AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
        `).get(templateCat.name, currentFormParentId, currentFormParentId) as { id: string } | undefined;

        if (existingCat) {
            currentFormParentId = existingCat.id;
        } else {
            // Create new FORM category
            const newCat = database.createCategory({
                name: templateCat.name,
                parent_id: currentFormParentId,
                type: 'FORM'
            });
            currentFormParentId = newCat.id;
        }
    }

    return currentFormParentId;
}
