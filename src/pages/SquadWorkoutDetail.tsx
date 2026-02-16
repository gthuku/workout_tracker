import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Calendar } from 'lucide-react';
import { squadApi } from '../api/client';
import type { SquadWorkout, MuscleGroup } from '../types';
import { format, parseISO } from 'date-fns';

export function SquadWorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<SquadWorkout | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkout = useCallback(async () => {
    if (!workoutId) return;
    try {
      const data = await squadApi.getWorkout(workoutId);
      setWorkout(data);
    } catch (error) {
      console.error('Failed to load squad workout:', error);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="p-4 text-center">
        <p className="text-zinc-400">Workout not found</p>
        <button onClick={() => navigate('/squad')} className="btn btn-secondary mt-4">
          Back to Squad
        </button>
      </div>
    );
  }

  // Group sets by exercise
  const exerciseGroups = workout.sets.reduce((acc, set) => {
    const key = set.exerciseId;
    if (!acc[key]) {
      acc[key] = {
        exerciseId: key,
        exerciseName: set.exerciseName,
        primaryMuscles: set.primaryMuscles,
        sets: [],
      };
    }
    acc[key].sets.push(set);
    return acc;
  }, {} as Record<string, { exerciseId: string; exerciseName: string; primaryMuscles: MuscleGroup[]; sets: typeof workout.sets }>);

  const totalVolume = workout.sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-[#0a0a0a] border-b border-zinc-800 p-4 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/squad')} className="p-2 -ml-2 text-zinc-400 hover:text-white">
              <ChevronLeft size={24} />
            </button>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
              {workout.ownerName}'s workout
            </span>
          </div>

          <h1 className="text-lg font-semibold text-center">
            {workout.name || 'Workout'}
          </h1>

          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{format(parseISO(workout.date), 'EEEE, MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span className="font-mono">{formatDuration(workout.duration)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Summary */}
        <div className="card">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{Object.keys(exerciseGroups).length}</p>
              <p className="text-xs text-zinc-400">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{workout.sets.length}</p>
              <p className="text-xs text-zinc-400">Sets</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-zinc-400">lbs Volume</p>
            </div>
          </div>
        </div>

        {/* Exercises */}
        {Object.entries(exerciseGroups).map(([exerciseId, data]) => {
          const exerciseVolume = data.sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);

          return (
            <div key={exerciseId} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{data.exerciseName}</h3>
                  <p className="text-sm text-blue-400">{data.primaryMuscles.join(', ')}</p>
                </div>
                <div className="text-right text-sm text-zinc-400">
                  <p>{data.sets.length} sets</p>
                  <p>{exerciseVolume.toLocaleString()} lbs</p>
                </div>
              </div>

              <div className="space-y-2">
                {data.sets.map((set, index) => (
                  <div
                    key={set.id}
                    className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">
                        {set.duration
                          ? `${set.duration}s`
                          : `${set.weight} lbs × ${set.reps}`
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Notes */}
        {workout.notes && (
          <div className="card">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-zinc-400">{workout.notes}</p>
          </div>
        )}

        {workout.sets.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p>No exercises logged yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
