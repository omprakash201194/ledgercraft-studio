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
        };
    }
}
