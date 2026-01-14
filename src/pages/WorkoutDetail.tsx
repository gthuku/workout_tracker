import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Calendar, Edit2, Check, X } from 'lucide-react';
import { workoutApi } from '../api/client';
import type { Workout, WorkoutSet, MuscleGroup } from '../types';
import { format, parseISO } from 'date-fns';

interface WorkoutWithSets extends Workout {
  sets: (WorkoutSet & { exercise_name: string; primaryMuscles: MuscleGroup[] })[];
}

export function WorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<WorkoutWithSets | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    if (!workoutId) return;
    loadWorkout();
  }, [workoutId]);

  const loadWorkout = async () => {
    if (!workoutId) return;

    try {
      const data = await workoutApi.get(workoutId);
      setWorkout(data as WorkoutWithSets);
    } catch (error) {
      console.error('Failed to load workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!workout || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      await workoutApi.update(workout.id, { name: editedName.trim() });
      setWorkout({ ...workout, name: editedName.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to rename workout:', error);
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        <p className="text-slate-400">Workout not found</p>
        <button onClick={() => navigate('/history')} className="btn btn-secondary mt-4">
          Back to History
        </button>
      </div>
    );
  }

  // Group sets by exercise
  const exerciseGroups = workout.sets.reduce((acc, set) => {
    const key = set.exercise_id;
    if (!acc[key]) {
      acc[key] = {
        exerciseName: set.exercise_name,
        primaryMuscles: set.primaryMuscles,
        sets: [],
      };
    }
    acc[key].sets.push(set);
    return acc;
  }, {} as Record<string, { exerciseName: string; primaryMuscles: MuscleGroup[]; sets: typeof workout.sets }>);

  const totalVolume = workout.sets.reduce((acc, s) => acc + s.reps * s.weight, 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/history')} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
          </div>

          {/* Workout Name */}
          <div className="flex items-center justify-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="input py-1 px-3 text-center"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="p-1 text-green-500">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-400">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditedName(workout.name || '');
                  setIsEditingName(true);
                }}
                className="flex items-center gap-2 hover:bg-slate-800 rounded-lg px-3 py-1 transition-colors"
              >
                <span className="font-semibold text-lg">{workout.name || 'Workout'}</span>
                <Edit2 size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          {/* Date and Duration */}
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-slate-400">
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
              <p className="text-xs text-slate-400">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{workout.sets.length}</p>
              <p className="text-xs text-slate-400">Sets</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-slate-400">lbs Volume</p>
            </div>
          </div>
        </div>

        {/* Exercises */}
        {Object.entries(exerciseGroups).map(([exerciseId, data]) => {
          const exerciseVolume = data.sets.reduce((acc, s) => acc + s.reps * s.weight, 0);

          return (
            <div key={exerciseId} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{data.exerciseName}</h3>
                  <p className="text-sm text-blue-400">{data.primaryMuscles.join(', ')}</p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <p>{data.sets.length} sets</p>
                  <p>{exerciseVolume.toLocaleString()} lbs</p>
                </div>
              </div>

              <div className="space-y-2">
                {data.sets.map((set, index) => (
                  <div
                    key={set.id}
                    className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg"
                  >
                    <span className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium">
                      {set.weight} lbs × {set.reps}
                    </span>
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
            <p className="text-slate-400">{workout.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
