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
        };
    }
}
