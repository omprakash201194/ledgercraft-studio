import bcrypt from 'bcryptjs';
import { database, User } from './database';
import { logAction } from './auditService';

// ─── Types ───────────────────────────────────────────────

export interface SafeUser {
    id: string;
    username: string;
    role: string;
    created_at: string;
}

export interface AuthResult {
    success: boolean;
    user?: SafeUser;
    error?: string;
}

// ─── Session (in-memory only) ────────────────────────────

let currentUser: SafeUser | null = null;

function toSafeUser(user: User): SafeUser {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
    };
}

// ─── Auth Functions ──────────────────────────────────────

export function login(username: string, password: string): AuthResult {
    const user = database.findUserByUsername(username);
    if (!user) {
        return { success: false, error: 'Invalid username or password' };
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
        return { success: false, error: 'Invalid username or password' };
    }

    currentUser = toSafeUser(user);
    console.log(`[Auth] User logged in: ${username} (${user.role})`);
    logAction({
        userId: user.id,
        actionType: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id
    });
    return { success: true, user: currentUser };
}

export function logout(): void {
    if (currentUser) {
        console.log(`[Auth] User logged out: ${currentUser.username}`);
        logAction({
            userId: currentUser.id,
            actionType: 'USER_LOGOUT',
            entityType: 'USER',
            entityId: currentUser.id
        });
    }
    currentUser = null;
}

export function getCurrentUser(): SafeUser | null {
    return currentUser;
}

export function createUser(
    username: string,
    password: string,
    role: string
): AuthResult {
    // Only ADMIN can create users
    if (!currentUser || currentUser.role !== 'ADMIN') {
        return { success: false, error: 'Only administrators can create users' };
    }

    // Check if username already exists
    const existing = database.findUserByUsername(username);
    if (existing) {
        return { success: false, error: 'Username already exists' };
    }

    // Validate role
    if (role !== 'ADMIN' && role !== 'USER') {
        return { success: false, error: 'Invalid role. Must be ADMIN or USER' };
    }

    // Hash password and create user
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const user = database.createUser({ username, password_hash, role });
    console.log(`[Auth] User created: ${username} (${role})`);

    if (currentUser) {
        logAction({
            userId: currentUser.id,
            actionType: 'USER_CREATE',
            entityType: 'USER',
            entityId: user.id,
            metadata: { username: user.username, role: user.role }
        });
    }

    return { success: true, user: toSafeUser(user) };
}

// ─── Bootstrap ───────────────────────────────────────────

export function bootstrapAdmin(): void {
    const userCount = database.getUserCount();
    if (userCount === 0) {
        const salt = bcrypt.genSaltSync(10);
        const password_hash = bcrypt.hashSync('admin123', salt);

        database.createUser({
            username: 'admin',
            password_hash,
            role: 'ADMIN',
        });

        console.log('[Auth] Default admin user created (admin / admin123)');
    }
}
