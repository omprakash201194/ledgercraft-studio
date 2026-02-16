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

    interface AuditLog {
        id: string;
        user_id: string;
        username?: string;
        action_type: string;
        entity_type: string;
        entity_id?: string;
        metadata_json?: string; // stringified JSON
        created_at: string;
    }

    interface AnalyticsStats {
        totalReports: number;
        deletedReports: number;
        reportsThisMonth: number;
        reportsByUser: { name: string; value: number }[];
        topForms: { name: string; value: number }[];
        monthlyTrend: { name: string; value: number }[];
    }

    interface UserPreferences {
        user_id: string;
        theme: 'light' | 'dark';
        date_format: string;
        updated_at: string;
    }

    interface Window {
        api: {
            // ... existing ...
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
            tryAutoLogin: () => Promise<AuthResult>;
            getCurrentUser: () => Promise<SafeUser | null>;
            createUser: (username: string, password: string, role: string) => Promise<AuthResult>;
            getAllUsers: () => Promise<GetAllUsersResult>;

            // Templates
            uploadTemplate(filePath?: string): Promise<UploadTemplateResult>;
            getTemplates(page?: number, limit?: number, categoryId?: string | null): Promise<{ templates: TemplateRecord[]; total: number }>;
            getTemplatePlaceholders: (templateId: string) => Promise<TemplatePlaceholder[]>;

            // Forms
            createForm(input: CreateFormInput): Promise<CreateFormResult>;
            updateForm(input: UpdateFormInput): Promise<FormRecord & { fields: FormFieldRecord[] }>;
            getForms(page?: number, limit?: number, categoryId?: string | null): Promise<{ forms: (FormRecord & { template_name: string; field_count: number })[]; total: number }>;
            getFormById(formId: string): Promise<FormRecord & { fields: FormFieldRecord[] }>;
            getFormFields(formId: string): Promise<FormFieldRecord[]>;
            generateFormFields(templateId: string): Promise<GeneratedField[]>;
            getFormsWithHierarchy(): Promise<{ id: string; name: string; parent_id: string | null; type: 'CATEGORY' | 'FORM' }[]>;
            getRecentForms(limit?: number): Promise<(FormRecord & { usage_count: number })[]>;
            deleteForm: (id: string, deleteReports?: boolean) => Promise<{ success: boolean; error?: string }>;
            getFormReportCount: (id: string) => Promise<number>;

            // Reports
            generateReport: (input: GenerateReportInput) => Promise<GenerateReportResult>;
            getReports(page?: number, limit?: number, formId?: string, search?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Promise<{ reports: ReportRecord[]; total: number }>;
            getReportById: (reportId: string) => Promise<ReportRecord>;
            deleteReport: (reportId: string) => Promise<{ success: boolean; error?: string }>;
            deleteReports: (reportIds: string[]) => Promise<{ success: boolean; deletedCount?: number; error?: string }>;
            downloadReport: (filePath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;

            // Categories & Lifecycle
            getCategoryTree: (type: 'TEMPLATE' | 'FORM') => Promise<CategoryNode[]>;
            getCategoryChain: (id: string) => Promise<{ id: string; name: string }[]>;
            createCategory: (input: CreateCategoryInput) => Promise<ServiceResult>;
            renameCategory: (id: string, newName: string) => Promise<ServiceResult>;
            deleteCategory: (id: string, type: 'TEMPLATE' | 'FORM') => Promise<ServiceResult>;
            moveItem: (input: MoveItemInput) => Promise<ServiceResult>;
            deleteTemplate: (id: string) => Promise<ServiceResult>;

            // Shell
            openFile: (filePath: string) => Promise<string>;
            // Audit
            getAuditLogs(params: { page: number; pageSize: number; filters?: any }): Promise<{ logs: AuditLog[]; total: number }>;
            getAnalytics(): Promise<AnalyticsStats>;

            getUserPreferences(userId: string): Promise<UserPreferences>;
            updateUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences>;
        };
    }
}
