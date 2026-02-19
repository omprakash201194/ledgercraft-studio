import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SafeUser {
    id: string;
    username: string;
    role: string;
    created_at: string;
}

interface AuthContextType {
    user: SafeUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => ({ success: false }),
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<SafeUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        (async () => {
            try {
                // Try auto login first
                const loginResult = await window.api.tryAutoLogin();
                if (loginResult.success && loginResult.user) {
                    setUser(loginResult.user);
                } else {
                    // Fallback to memory or just null
                    const currentUser = await window.api?.getCurrentUser();
                    if (currentUser) {
                        setUser(currentUser);
                    }
                }
            } catch {
                // No session
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        try {
            const result = await window.api.login(username, password);
            if (result.success && result.user) {
                setUser(result.user);
                return { success: true };
            }
            return { success: false, error: result.error || 'Login failed' };
        } catch {
            return { success: false, error: 'An unexpected error occurred' };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await window.api.logout();
        } catch {
            // ignore
        }
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
