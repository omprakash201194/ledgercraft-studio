import { database, Category } from './database';
import fs from 'fs';

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
        console.log(`[CategoryService] Moving Item: type=${input.type}, itemId=${input.itemId}, target=${input.targetCategoryId}`);

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

        console.log(`[CategoryService] Move successful. New Category: ${input.targetCategoryId}`);
        return { success: true, item: updatedItem };
    } catch (e) {
        console.error(`[CategoryService] Move failed:`, e);
        return { success: false, error: String(e) };
    }
}

export function deleteTemplate(id: string): ServiceResult {
    try {
        // Validation: Check usage by forms
        if (database.isTemplateUsed(id)) {
            return { success: false, error: 'Cannot delete template: It is used by one or more forms.' };
        }

        // Get file path to delete file
        const template = database.getTemplates().find((t) => t.id === id);
        if (template && fs.existsSync(template.file_path)) {
            fs.unlinkSync(template.file_path);
        }

        database.deleteTemplate(id);
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

        database.deleteForm(id);
        return { success: true };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}
