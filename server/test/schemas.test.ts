import { describe, it, expect } from 'vitest';
import {
    RegisterSchema,
    LoginSchema,
    SetPasswordSchema,
    ChangePasswordSchema,
    CreateExerciseSchema,
    CreateWorkoutSchema,
    CreateSetSchema,
    UpdateSetSchema,
} from '../schemas/index.js';

describe('Auth Schemas', () => {
    describe('RegisterSchema', () => {
        it('should validate a valid registration', () => {
            const validData = {
                username: 'testuser',
                password: 'password123',
                email: 'test@example.com',
                displayName: 'Test User',
            };

            const result = RegisterSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject username less than 2 characters', () => {
            const invalidData = {
                username: 'a',
                password: 'password123',
            };

            const result = RegisterSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject password less than 6 characters', () => {
            const invalidData = {
                username: 'testuser',
                password: '12345',
            };

            const result = RegisterSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid email format', () => {
            const invalidData = {
                username: 'testuser',
                password: 'password123',
                email: 'not-an-email',
            };

            const result = RegisterSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should allow registration without optional fields', () => {
            const minimalData = {
                username: 'testuser',
                password: 'password123',
            };

            const result = RegisterSchema.safeParse(minimalData);
            expect(result.success).toBe(true);
        });
    });

    describe('LoginSchema', () => {
        it('should validate valid login credentials', () => {
            const validData = {
                username: 'testuser',
                password: 'password123',
            };

            const result = LoginSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject empty username', () => {
            const invalidData = {
                username: '',
                password: 'password123',
            };

            const result = LoginSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('SetPasswordSchema', () => {
        it('should validate password with 6+ characters', () => {
            const result = SetPasswordSchema.safeParse({ password: 'newpassword' });
            expect(result.success).toBe(true);
        });

        it('should reject password under 6 characters', () => {
            const result = SetPasswordSchema.safeParse({ password: '12345' });
            expect(result.success).toBe(false);
        });
    });

    describe('ChangePasswordSchema', () => {
        it('should validate password change request', () => {
            const validData = {
                currentPassword: 'oldpassword',
                newPassword: 'newpassword123',
            };

            const result = ChangePasswordSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });
});

describe('Exercise Schemas', () => {
    describe('CreateExerciseSchema', () => {
        it('should validate a valid exercise', () => {
            const validData = {
                name: 'Bench Press',
                primaryMuscles: ['Chest', 'Triceps'],
                equipment: 'Barbell',
            };

            const result = CreateExerciseSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject exercise with no muscles', () => {
            const invalidData = {
                name: 'Bench Press',
                primaryMuscles: [],
                equipment: 'Barbell',
            };

            const result = CreateExerciseSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject exercise with more than 3 muscles', () => {
            const invalidData = {
                name: 'Super Exercise',
                primaryMuscles: ['Chest', 'Back', 'Shoulders', 'Biceps'],
                equipment: 'Barbell',
            };

            const result = CreateExerciseSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid equipment type', () => {
            const invalidData = {
                name: 'Bench Press',
                primaryMuscles: ['Chest'],
                equipment: 'InvalidEquipment',
            };

            const result = CreateExerciseSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept all valid equipment types', () => {
            const equipmentTypes = ['Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio'];

            for (const equipment of equipmentTypes) {
                const result = CreateExerciseSchema.safeParse({
                    name: 'Test Exercise',
                    primaryMuscles: ['Chest'],
                    equipment,
                });
                expect(result.success).toBe(true);
            }
        });
    });
});

describe('Workout Schemas', () => {
    describe('CreateWorkoutSchema', () => {
        it('should validate a workout with all optional fields', () => {
            const validData = {
                name: 'Morning Workout',
                date: '2026-01-24',
                duration: 60,
                isComplete: false,
            };

            const result = CreateWorkoutSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate an empty object (all fields optional)', () => {
            const result = CreateWorkoutSchema.safeParse({});
            expect(result.success).toBe(true);
        });

        it('should reject invalid date format', () => {
            const invalidData = {
                date: '24-01-2026', // Wrong format
            };

            const result = CreateWorkoutSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject duration over 600 minutes', () => {
            const invalidData = {
                duration: 601,
            };

            const result = CreateWorkoutSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('CreateSetSchema', () => {
        it('should validate a valid strength set', () => {
            const validData = {
                exerciseId: '550e8400-e29b-41d4-a716-446655440000',
                setNumber: 1,
                reps: 10,
                weight: 135,
            };

            const result = CreateSetSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate a cardio set with duration', () => {
            const validData = {
                exerciseId: '550e8400-e29b-41d4-a716-446655440000',
                setNumber: 1,
                duration: 30,
            };

            const result = CreateSetSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject reps over 999', () => {
            const invalidData = {
                exerciseId: '550e8400-e29b-41d4-a716-446655440000',
                setNumber: 1,
                reps: 1000,
                weight: 100,
            };

            const result = CreateSetSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject negative weight', () => {
            const invalidData = {
                exerciseId: '550e8400-e29b-41d4-a716-446655440000',
                setNumber: 1,
                reps: 10,
                weight: -10,
            };

            const result = CreateSetSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject weight over 9999', () => {
            const invalidData = {
                exerciseId: '550e8400-e29b-41d4-a716-446655440000',
                setNumber: 1,
                reps: 10,
                weight: 10000,
            };

            const result = CreateSetSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid UUID for exerciseId', () => {
            const invalidData = {
                exerciseId: 'not-a-uuid',
                setNumber: 1,
                reps: 10,
                weight: 100,
            };

            const result = CreateSetSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('UpdateSetSchema', () => {
        it('should validate a valid set update', () => {
            const validData = {
                reps: 12,
                weight: 145,
            };

            const result = UpdateSetSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should require both reps and weight', () => {
            const onlyReps = { reps: 12 };
            const onlyWeight = { weight: 145 };

            expect(UpdateSetSchema.safeParse(onlyReps).success).toBe(false);
            expect(UpdateSetSchema.safeParse(onlyWeight).success).toBe(false);
        });
    });
});
