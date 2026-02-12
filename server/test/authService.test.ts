import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../services/authService.js';

// Mock the database module
vi.mock('../database.js', () => ({
    db: {
        query: vi.fn(),
        queryOne: vi.fn(),
        execute: vi.fn(),
        withTransaction: vi.fn((fn) => fn()),
    },
}));

// Import the mocked db
import { db } from '../database.js';

describe('AuthService', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalExposeResetToken = process.env.AUTH_EXPOSE_RESET_TOKEN;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = originalNodeEnv;
        process.env.AUTH_EXPOSE_RESET_TOKEN = originalExposeResetToken;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.AUTH_EXPOSE_RESET_TOKEN = originalExposeResetToken;
    });

    describe('generateToken', () => {
        it('should generate a valid JWT token', () => {
            const token = authService.generateToken('user-123', 'testuser');
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token', () => {
            const token = authService.generateToken('user-123', 'testuser');
            const payload = authService.verifyToken(token);

            expect(payload).not.toBeNull();
            expect(payload?.userId).toBe('user-123');
            expect(payload?.username).toBe('testuser');
        });

        it('should return null for an invalid token', () => {
            const payload = authService.verifyToken('invalid-token');
            expect(payload).toBeNull();
        });

        it('should return null for a tampered token', () => {
            const token = authService.generateToken('user-123', 'testuser');
            const tampered = token.slice(0, -5) + 'XXXXX';
            const payload = authService.verifyToken(tampered);
            expect(payload).toBeNull();
        });
    });

    describe('generateResetToken', () => {
        it('should generate a 64-character hex string', () => {
            const token = authService.generateResetToken();
            expect(token).toHaveLength(64);
            expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
        });

        it('should generate unique tokens', () => {
            const token1 = authService.generateResetToken();
            const token2 = authService.generateResetToken();
            expect(token1).not.toBe(token2);
        });
    });

    describe('hashResetToken', () => {
        it('should return a consistent hash for the same input', () => {
            const token = 'test-reset-token';
            const hash1 = authService.hashResetToken(token);
            const hash2 = authService.hashResetToken(token);
            expect(hash1).toBe(hash2);
        });

        it('should return different hashes for different inputs', () => {
            const hash1 = authService.hashResetToken('token1');
            const hash2 = authService.hashResetToken('token2');
            expect(hash1).not.toBe(hash2);
        });

        it('should return a 64-character hex string (SHA-256)', () => {
            const hash = authService.hashResetToken('test');
            expect(hash).toHaveLength(64);
            expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
        });
    });

    describe('register', () => {
        it('should reject duplicate username', async () => {
            const mockDb = db as unknown as {
                queryOne: ReturnType<typeof vi.fn>;
                execute: ReturnType<typeof vi.fn>;
            };

            mockDb.queryOne.mockResolvedValueOnce({ id: 'existing-user' });

            await expect(
                authService.register({
                    username: 'existinguser',
                    password: 'password123',
                })
            ).rejects.toThrow('Username already exists');
        });

        it('should reject duplicate email', async () => {
            const mockDb = db as unknown as {
                queryOne: ReturnType<typeof vi.fn>;
                execute: ReturnType<typeof vi.fn>;
            };

            // First call: no existing username
            mockDb.queryOne.mockResolvedValueOnce(null);
            // Second call: existing email
            mockDb.queryOne.mockResolvedValueOnce({ id: 'existing-user' });

            await expect(
                authService.register({
                    username: 'newuser',
                    password: 'password123',
                    email: 'existing@example.com',
                })
            ).rejects.toThrow('Email already registered');
        });
    });

    describe('login', () => {
        it('should throw for non-existent user', async () => {
            const mockDb = db as unknown as {
                queryOne: ReturnType<typeof vi.fn>;
            };

            mockDb.queryOne.mockResolvedValueOnce(null);

            await expect(
                authService.login({
                    username: 'nonexistent',
                    password: 'password123',
                })
            ).rejects.toThrow('Invalid credentials');
        });
    });

    describe('requestReset', () => {
        it('should include reset token outside production', async () => {
            process.env.NODE_ENV = 'development';
            delete process.env.AUTH_EXPOSE_RESET_TOKEN;

            const mockDb = db as unknown as {
                queryOne: ReturnType<typeof vi.fn>;
                execute: ReturnType<typeof vi.fn>;
            };

            mockDb.queryOne.mockResolvedValueOnce({
                id: 'user-123',
                username: 'testuser',
                email: 'test@example.com',
            });
            mockDb.execute.mockResolvedValue(undefined);

            const result = await authService.requestReset('testuser');
            expect(result.success).toBe(true);
            expect('resetToken' in result ? result.resetToken : undefined).toBeTruthy();
            expect('expiresIn' in result ? result.expiresIn : undefined).toBe('1 hour(s)');
        });

        it('should hide reset token in production by default', async () => {
            process.env.NODE_ENV = 'production';
            delete process.env.AUTH_EXPOSE_RESET_TOKEN;

            const mockDb = db as unknown as {
                queryOne: ReturnType<typeof vi.fn>;
                execute: ReturnType<typeof vi.fn>;
            };

            mockDb.queryOne.mockResolvedValueOnce({
                id: 'user-123',
                username: 'testuser',
                email: 'test@example.com',
            });
            mockDb.execute.mockResolvedValue(undefined);

            const result = await authService.requestReset('testuser');
            expect(result.success).toBe(true);
            expect('resetToken' in result ? result.resetToken : undefined).toBeUndefined();
            expect('expiresIn' in result ? result.expiresIn : undefined).toBeUndefined();
        });

        it('should include reset token in production when explicitly enabled', async () => {
            process.env.NODE_ENV = 'production';
            process.env.AUTH_EXPOSE_RESET_TOKEN = 'true';

            const mockDb = db as unknown as {
                queryOne: ReturnType<typeof vi.fn>;
                execute: ReturnType<typeof vi.fn>;
            };

            mockDb.queryOne.mockResolvedValueOnce({
                id: 'user-123',
                username: 'testuser',
                email: 'test@example.com',
            });
            mockDb.execute.mockResolvedValue(undefined);

            const result = await authService.requestReset('testuser');
            expect(result.success).toBe(true);
            expect('resetToken' in result ? result.resetToken : undefined).toBeTruthy();
            expect('expiresIn' in result ? result.expiresIn : undefined).toBe('1 hour(s)');
        });
    });
});
