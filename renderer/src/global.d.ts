export { };

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
}

interface FormFieldRecord {
    id: string;
    form_id: string;
    label: string;
    field_key: string;
    data_type: string;
    required: number;
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

declare global {
    interface Window {
        api: {
            // App
            ping: () => string;
            getAppDataPath: () => Promise<string>;

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
            createForm: (formData: CreateFormInput) => Promise<CreateFormResult>;
            getForms: () => Promise<FormRecord[]>;
            getFormById: (formId: string) => Promise<FormRecord | null>;
            getFormFields: (formId: string) => Promise<FormFieldRecord[]>;

            // Reports
            generateReport: (input: GenerateReportInput) => Promise<GenerateReportResult>;
            getReports: () => Promise<ReportRecord[]>;

            // Shell
            openFile: (filePath: string) => Promise<string>;
        };
    }
}
