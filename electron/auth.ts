import bcrypt from 'bcryptjs';
import { database, User } from './database';
import { logAction } from './auditService';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

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

    logAction({
        userId: user.id,
        actionType: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id
    });

    saveSession(currentUser);

    return { success: true, user: currentUser };
}

export function logout(): void {
    if (currentUser) {

        logAction({
            userId: currentUser.id,
            actionType: 'USER_LOGOUT',
            entityType: 'USER',
            entityId: currentUser.id
        });
    }
    currentUser = null;
    deleteSession();
}

// ─── Session Persistence ─────────────────────────────────

const SESSION_FILE = path.join(app.getPath('userData'), 'session.json');

interface SessionData {
    userId: string;
    loginTime: number;
}

function saveSession(user: SafeUser) {
    try {
        const data: SessionData = {
            userId: user.id,
            loginTime: Date.now()
        };
        fs.writeFileSync(SESSION_FILE, JSON.stringify(data));
    } catch (err) {
        console.error('[Auth] Failed to save session:', err);
    }
}

function deleteSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
        }
    } catch (err) {
        console.error('[Auth] Failed to delete session:', err);
    }
}

export function tryAutoLogin(): AuthResult {
    try {
        if (!fs.existsSync(SESSION_FILE)) return { success: false };

        const content = fs.readFileSync(SESSION_FILE, 'utf-8');
        const data: SessionData = JSON.parse(content);

        // Check if expired (24h)
        const age = Date.now() - data.loginTime;
        if (age > 24 * 60 * 60 * 1000) {

            deleteSession();
            return { success: false, error: 'Session expired' };
        }

        const user = database.getUserById(data.userId);
        if (!user) {
            deleteSession();
            return { success: false, error: 'User not found' };
        }

        currentUser = toSafeUser(user);

        return { success: true, user: currentUser };
    } catch (err) {
        console.error('[Auth] Auto-login failed:', err);
        return { success: false, error: 'Failed to restore session' };
    }
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


    }
}
