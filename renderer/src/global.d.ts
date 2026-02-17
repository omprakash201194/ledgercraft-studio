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

    interface AnalyzeTemplateResult {
        canceled: boolean;
        filePath?: string;
        originalName?: string;
        placeholders?: string[];
        placeholderCount?: number;
        error?: string;
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
            format_options?: string | null;
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
        format_options?: string | null;
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
            format_options?: string | null;
        }[];
    }

    interface GeneratedField {
        label: string;
        field_key: string;
        data_type: string;
        required: boolean;
        placeholder_mapping: string | null;
        options_json: string | null;
        format_options?: string | null;
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
        input_values?: string; // JSON string of input values
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
            pickTemplate: () => Promise<AnalyzeTemplateResult>;
            processTemplateUpload: (filePath: string, autoCreateForm: boolean, categoryId?: string | null) => Promise<{ success: boolean; template?: TemplateRecord; error?: string }>;
            getTemplates(page?: number, limit?: number, categoryId?: string | null): Promise<{ templates: TemplateRecord[]; total: number }>;
            getTemplatePlaceholders: (templateId: string) => Promise<TemplatePlaceholder[]>;

            // Forms
            createForm(input: CreateFormInput): Promise<CreateFormResult>;
            updateForm(input: UpdateFormInput): Promise<FormRecord & { fields: FormFieldRecord[] }>;
            getForms(page?: number, limit?: number, categoryId?: string | null, includeArchived?: boolean): Promise<{ forms: (FormRecord & { template_name: string; field_count: number })[]; total: number }>;
            createForm(input: CreateFormInput): Promise<CreateFormResult>;
            updateForm(input: UpdateFormInput): Promise<FormRecord & { fields: FormFieldRecord[] }>;
            getFormFields(formId: string): Promise<FormFieldRecord[]>;
            deleteForm(formId: string, deleteReports: boolean): Promise<ServiceResult>;
            getFormReportCount(formId: string): Promise<number>;

            // Categories
            getCategoryChain(categoryId: string): Promise<{ id: string; name: string }[]>;
            createCategory(input: CreateCategoryInput): Promise<ServiceResult>;
            moveItem(input: MoveItemInput): Promise<ServiceResult>;

            deleteTemplate: (id: string, force?: boolean) => Promise<ServiceResult & { usageCount?: number }>;

            // Shell
            openFile: (filePath: string) => Promise<string>;
            // Audit
            getAuditLogs(params: { page: number; pageSize: number; filters?: any }): Promise<{ logs: AuditLog[]; total: number }>;
            getAnalytics(): Promise<AnalyticsStats>;

            getUserPreferences(userId: string): Promise<UserPreferences>;
            getUserPreferences(userId: string): Promise<UserPreferences>;
            updateUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences>;
            resetUserPassword(targetUserId: string, newPassword: string): Promise<ServiceResult>;
        };
    }
}
