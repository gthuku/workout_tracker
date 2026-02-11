import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workoutService } from '../services/workoutService.js';
import { db } from '../database.js';
import { NotFoundError } from '../middleware/errorHandler.js';

// Mock database
vi.mock('../database.js', () => ({
    db: {
        query: vi.fn(),
        queryOne: vi.fn(),
        execute: vi.fn(),
        withTransaction: vi.fn((fn) => fn()),
    },
}));

// Mock cache
vi.mock('../utils/cache.js', () => ({
    default: {
        del: vi.fn(),
        invalidateWorkouts: vi.fn(),
    },
    CACHE_KEYS: {
        WORKOUT: (id: string) => `workout:${id}`,
    },
}));

describe('WorkoutService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('delete', () => {
        it('should delete a workout and its dependencies', async () => {
            const mockDb = db as unknown as {
                queryOne: ReturnType<typeof vi.fn>;
                execute: ReturnType<typeof vi.fn>;
            };

            // Mock finding the workout
            mockDb.queryOne.mockResolvedValueOnce({
                id: 'workout-123',
                user_id: 'user-123',
            });

            const result = await workoutService.delete('workout-123', 'user-123');

            expect(mockDb.queryOne).toHaveBeenCalledWith(
                'SELECT user_id FROM workouts WHERE id = $1',
                ['workout-123']
            );

            // Verify deletion calls
            expect(mockDb.execute).toHaveBeenCalledWith(
                'DELETE FROM workout_sets WHERE workout_id = $1',
                ['workout-123']
            );
            expect(mockDb.execute).toHaveBeenCalledWith(
                'DELETE FROM workouts WHERE id = $1',
                ['workout-123']
            );

            expect(result).toEqual({ success: true });
        });

        it('should throw NotFoundError if workout does not exist', async () => {
            const mockDb = db as unknown as { queryOne: ReturnType<typeof vi.fn> };
            mockDb.queryOne.mockResolvedValueOnce(null);

            await expect(workoutService.delete('non-existent', 'user-123'))
                .rejects.toThrow(NotFoundError);
        });

        it('should throw error if user does not own workout', async () => {
            const mockDb = db as unknown as { queryOne: ReturnType<typeof vi.fn> };
            mockDb.queryOne.mockResolvedValueOnce({
                id: 'workout-123',
                user_id: 'other-user',
            });

            await expect(workoutService.delete('workout-123', 'user-123'))
                .rejects.toThrow('Access denied');
        });
    });
});
