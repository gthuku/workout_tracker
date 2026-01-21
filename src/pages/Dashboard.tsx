import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, Trophy, Play, Calendar, ChevronRight, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { dashboardApi } from '../api/client';
import type { DashboardData } from '../types';
import { format, parseISO } from 'date-fns';
import { useWorkoutStore } from '../store/workoutStore';

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: '#ef4444',
  Back: '#3b82f6',
  Shoulders: '#f59e0b',
  Biceps: '#10b981',
  Triceps: '#8b5cf6',
  Quads: '#ec4899',
  Hamstrings: '#06b6d4',
  Glutes: '#f97316',
  Calves: '#84cc16',
  Core: '#6366f1',
  Cardio: '#14b8a6',
};

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingWorkout, setStartingWorkout] = useState(false);
  const { activeWorkout, resumeWorkout, startWorkout, error, clearError } = useWorkoutStore();

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboard] = await Promise.all([
          dashboardApi.get(),
          resumeWorkout(),
        ]);
        setData(dashboard);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [resumeWorkout]);

  const handleStartWorkout = async () => {
    setStartingWorkout(true);
    try {
      await startWorkout();
      navigate('/workout');
    } catch (error) {
      console.error('Failed to start workout:', error);
      // Error is already handled in the store, but we can show a toast or alert here if needed
    } finally {
      setStartingWorkout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Workout Tracker</h1>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-2 text-red-400">
            <span className="text-sm">Error: {error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex gap-4">
        <div className="card flex-1 flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Flame className="text-orange-500" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{data?.streak || 0}</p>
            <p className="text-xs text-slate-400">Day Streak</p>
          </div>
        </div>

        <div className="card flex-1 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Dumbbell className="text-blue-500" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold">{data?.weeklyWorkoutCount || 0}</p>
            <p className="text-xs text-slate-400">This Week</p>
          </div>
        </div>
      </div>

      {/* Start Workout Button */}
      {activeWorkout ? (
        <button
          onClick={() => navigate('/workout')}
          className="btn btn-success w-full py-6 text-xl font-bold"
        >
          <Play size={28} />
          Continue Workout
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleStartWorkout}
            disabled={startingWorkout}
            className="btn btn-primary w-full py-6 text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {startingWorkout ? (
              <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-white" />
            ) : (
              <Play size={28} />
            )}
            {startingWorkout ? 'Starting...' : 'Start Workout'}
          </button>
          <button
            onClick={() => navigate('/log-past')}
            className="btn btn-secondary w-full py-3"
          >
            <ClipboardList size={20} />
            Log Past Workout
          </button>
        </div>
      )}

      {/* Recent PRs */}
      {data?.recentPRs && data.recentPRs.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-amber-500" size={20} />
            <h2 className="font-semibold">Recent PRs</h2>
          </div>
          <div className="space-y-2">
            {data.recentPRs.slice(0, 3).map((pr) => (
              <div
                key={pr.id}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div>
                  <p className="font-medium">{pr.exerciseName}</p>
                  <p className="text-xs text-slate-400">
                    {pr.type === 'max_weight' && `${pr.value} lbs`}
                    {pr.type === 'max_volume' && `${pr.value} lbs volume`}
                    {pr.type === 'max_reps' && `${pr.value} reps`}
                  </p>
                </div>
                <span className="pr-badge">
                  <Trophy size={14} />
                  PR
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Muscle Groups */}
      {data?.weeklyMuscleGroups && data.weeklyMuscleGroups.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">This Week&apos;s Focus</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.weeklyMuscleGroups.slice(0, 6)}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 80 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="muscleGroup"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                  {data.weeklyMuscleGroups.slice(0, 6).map((entry) => (
                    <Cell
                      key={entry.muscleGroup}
                      fill={MUSCLE_GROUP_COLORS[entry.muscleGroup] || '#64748b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      {data?.recentWorkouts && data.recentWorkouts.length > 0 && (
        <div className="card">
          <button
            onClick={() => navigate('/history')}
            className="flex items-center justify-between w-full mb-4 group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="text-slate-400" size={20} />
              <h2 className="font-semibold">Recent Workouts</h2>
            </div>
            <div className="flex items-center gap-1 text-blue-400 group-hover:text-blue-300">
              <span className="text-sm">View all</span>
              <ChevronRight size={18} />
            </div>
          </button>
          <div className="space-y-2">
            {data.recentWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0 cursor-pointer hover:bg-slate-700/50 -mx-2 px-2 rounded transition-colors"
                onClick={() => navigate(`/history/${workout.id}`)}
              >
                <div>
                  <p className="font-medium">{workout.name || 'Workout'}</p>
                  <p className="text-xs text-slate-400">
                    {format(parseISO(workout.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {workout.duration && workout.duration > 0 && (
                    <span className="text-sm text-slate-400">{workout.duration} min</span>
                  )}
                  <ChevronRight size={18} className="text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!data?.recentWorkouts || data.recentWorkouts.length === 0) && (
        <div className="card text-center py-8">
          <Dumbbell className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">No workouts yet</p>
          <p className="text-sm text-slate-500">Start your first workout to track progress!</p>
        </div>
      )}
    </div>
  );
}
