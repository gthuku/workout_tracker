import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Dumbbell, Calendar, Edit2, Check, X, Trash2, Trash } from 'lucide-react';
import { workoutApi } from '../api/client';
import type { RawWorkout } from '../api/client';
import { format, parseISO } from 'date-fns';

export function WorkoutHistory() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<RawWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await workoutApi.list(50, false);
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (workoutId: string) => {
    if (!editedName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await workoutApi.update(workoutId, { name: editedName.trim() });
      setWorkouts(workouts.map(w =>
        w.id === workoutId ? { ...w, name: editedName.trim() } : w
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Failed to rename workout:', error);
    }
  };

  const handleDelete = async (workoutId: string) => {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return;

    try {
      await workoutApi.delete(workoutId);
      setWorkouts(workouts.filter(w => w.id !== workoutId));
    } catch (error) {
      console.error('Failed to delete workout:', error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL workouts? This cannot be undone.')) return;
    if (!window.confirm('Are you sure? All workout history and PRs will be lost forever.')) return;

    try {
      await workoutApi.clearAll();
      setWorkouts([]);
    } catch (error) {
      console.error('Failed to clear workouts:', error);
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Workout History</h1>
          </div>
          {workouts.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded transition-colors"
              title="Clear All Workouts"
            >
              <Trash size={20} />
            </button>
          )}
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        {workouts.length === 0 ? (
          <div className="card text-center py-12">
            <Dumbbell className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400">No completed workouts yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Start your first workout to build your history!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="card"
              >
                {editingId === workout.id ? (
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="input flex-1 py-1"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(workout.id)}
                    />
                    <button
                      onClick={() => handleRename(workout.id)}
                      className="p-2 text-green-500 hover:bg-slate-700 rounded"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-slate-400 hover:bg-slate-700 rounded"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {workout.name || 'Workout'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                        <Calendar size={14} />
                        <span>{format(parseISO(workout.date), 'EEEE, MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditedName(workout.name || '');
                          setEditingId(workout.id);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(workout.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={14} />
                    <span>{formatDuration(workout.duration)}</span>
                  </div>
                </div>

                {workout.notes && (
                  <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-700">
                    {workout.notes}
                  </p>
                )}

                <button
                  onClick={() => navigate(`/history/${workout.id}`)}
                  className="flex items-center justify-between w-full mt-3 pt-3 border-t border-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span className="text-sm">View details</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
