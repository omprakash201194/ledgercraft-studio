export { };

declare global {
    interface SafeUser {
        id: string;
        username: string;
        role: string;
        created_at: string;
    }

    interface AuthResult {
        success: boolean;
        user?: SafeUser;
        error?: string;
    }

    interface GetAllUsersResult {
        success: boolean;
        users: SafeUser[];
        error?: string;
    }

    interface TemplateRecord {
        id: string;
        name: string;
        file_path: string;
        created_at: string;
        placeholder_count: number;
    }

    interface UploadTemplateResult {
        success: boolean;
        template?: {
            id: string;
            name: string;
            file_path: string;
            created_at: string;
            placeholders: string[];
        };
        error?: string;
    }

    interface TemplatePlaceholder {
        id: string;
        template_id: string;
        placeholder_key: string;
    }

    interface CreateFormInput {
        name: string;
        template_id: string;
        category_id?: string | null;
        fields: {
            label: string;
            field_key: string;
            data_type: string;
            required: boolean;
            placeholder_mapping: string | null;
            options_json: string | null;
        }[];
    }

    interface CreateFormResult {
        success: boolean;
        form?: {
            id: string;
            name: string;
            template_id: string;
            created_at: string;
        };
        error?: string;
    }

    interface FormRecord {
        id: string;
        name: string;
        template_id: string;
        template_name: string;
        field_count: number;
        created_at: string;
        category_id?: string | null;
    }

    interface FormFieldRecord {
        id: string;
        form_id: string;
        label: string;
        field_key: string;
        data_type: string;
        required: number; // 0 or 1
        placeholder_mapping: string | null;
        options_json: string | null;
    }

    interface UpdateFormInput {
        id: string;
        name?: string;
        category_id?: string | null;
        template_id?: string;
        fields?: {
            id?: string;
            label: string;
            field_key: string;
            data_type: string;
            required: boolean;
            placeholder_mapping: string | null;
            options_json: string | null;
        }[];
    }

    interface GeneratedField {
        label: string;
        field_key: string;
        data_type: string;
        required: boolean;
        placeholder_mapping: string | null;
        options_json: string | null;
    }

    interface GenerateReportInput {
        form_id: string;
        values: Record<string, string | number | boolean>;
    }

    interface GenerateReportResult {
        success: boolean;
        report?: {
            id: string;
            file_path: string;
            generated_at: string;
        };
        error?: string;
    }

    interface ReportRecord {
        id: string;
        form_id: string;
        generated_by: string;
        file_path: string;
        generated_at: string;
        form_name: string;
        generated_by_username: string;
    }

    interface CategoryNode {
        id: string;
        name: string;
        parent_id: string | null;
        type: 'TEMPLATE' | 'FORM';
        created_at: string;
        children: CategoryNode[];
    }

    interface CreateCategoryInput {
        name: string;
        parentId: string | null;
        type: 'TEMPLATE' | 'FORM';
    }

    interface MoveItemInput {
        itemId: string;
        targetCategoryId: string | null;
        type: 'TEMPLATE' | 'FORM';
    }

    interface ServiceResult {
        success: boolean;
        error?: string;
    }

    interface Window {
        api: {
            // App
            ping: () => string;
            getAppDataPath: () => Promise<string>;
            getAppVersion: () => Promise<string>;
            getDbStatus: () => Promise<{ isCorrupted: boolean; error: string | null; path: string }>;

            // Backup
            exportBackup: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
            restoreBackup: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;

            // Auth
            login: (username: string, password: string) => Promise<AuthResult>;
            logout: () => Promise<{ success: boolean }>;
            getCurrentUser: () => Promise<SafeUser | null>;
            createUser: (username: string, password: string, role: string) => Promise<AuthResult>;
            getAllUsers: () => Promise<GetAllUsersResult>;

            // Templates
            uploadTemplate: () => Promise<UploadTemplateResult>;
            getTemplates: () => Promise<TemplateRecord[]>;
            getTemplatePlaceholders: (templateId: string) => Promise<TemplatePlaceholder[]>;

            // Forms
            createForm: (input: CreateFormInput) => Promise<{ success: boolean; form?: any; error?: string }>;
            updateForm: (input: UpdateFormInput) => Promise<{ success: boolean; form?: any; error?: string }>;
            getForms: () => Promise<FormRecord[]>;
            getFormById(formId: string): Promise<FormRecord & { fields: FormFieldRecord[] }>;
            getFormFields(formId: string): Promise<FormFieldRecord[]>;
            generateFormFields(templateId: string): Promise<GeneratedField[]>;

            // Reports
            generateReport: (input: GenerateReportInput) => Promise<GenerateReportResult>;
            getReports: () => Promise<ReportRecord[]>;
            downloadReport: (filePath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;

            // Categories & Lifecycle
            getCategoryTree: (type: 'TEMPLATE' | 'FORM') => Promise<CategoryNode[]>;
            createCategory: (input: CreateCategoryInput) => Promise<ServiceResult>;
            renameCategory: (id: string, newName: string) => Promise<ServiceResult>;
            deleteCategory: (id: string, type: 'TEMPLATE' | 'FORM') => Promise<ServiceResult>;
            moveItem: (input: MoveItemInput) => Promise<ServiceResult>;
            deleteTemplate: (id: string) => Promise<ServiceResult>;
            deleteForm: (id: string) => Promise<ServiceResult>;

            // Shell
            openFile: (filePath: string) => Promise<string>;
        };
    }
}
