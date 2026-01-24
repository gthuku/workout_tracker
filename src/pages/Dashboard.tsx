import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, Trophy, Play, Calendar, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { dashboardApi } from '../api/client';
import type { DashboardData } from '../types';
import { format, parseISO } from 'date-fns';
import { useWorkoutStore } from '../store/workoutStore';

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: '#f43f5e',
  Back: '#3b82f6',
  Shoulders: '#f59e0b',
  Biceps: '#10b981',
  Triceps: '#a855f7',
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
    <div className="p-4 max-w-lg mx-auto space-y-6 page-transition">
      {/* Header */}
      <div className="pt-4">
        <p className="text-sm text-zinc-500 font-medium">Welcome back</p>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Workout</span> Tracker
        </h1>
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
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card group hover:border-orange-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl">
              <Flame className="text-orange-500" size={24} />
            </div>
            <div>
              <p className="stat-value text-3xl">{data?.streak || 0}</p>
              <p className="text-xs text-zinc-500 font-medium">Day Streak</p>
            </div>
          </div>
        </div>

        <div className="card group hover:border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
              <Dumbbell className="text-blue-500" size={24} />
            </div>
            <div>
              <p className="stat-value text-3xl">{data?.weeklyWorkoutCount || 0}</p>
              <p className="text-xs text-zinc-500 font-medium">This Week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Start Workout Button */}
      {activeWorkout ? (
        <button
          onClick={() => navigate('/workout')}
          className="btn btn-success w-full py-6 text-lg font-bold"
        >
          <Play size={24} fill="white" />
          Continue Workout
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleStartWorkout}
            disabled={startingWorkout}
            className="btn btn-primary w-full py-6 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {startingWorkout ? (
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white" />
            ) : (
              <Play size={24} fill="white" className="group-hover:scale-110 transition-transform" />
            )}
            {startingWorkout ? 'Starting...' : 'Start Workout'}
          </button>
          <button
            onClick={() => navigate('/log-past')}
            className="btn btn-secondary w-full"
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
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg">
              <Trophy className="text-amber-500" size={18} />
            </div>
            <h2 className="font-semibold">Recent PRs</h2>
            <Sparkles size={14} className="text-amber-500 ml-auto" />
          </div>
          <div className="space-y-1">
            {data.recentPRs.slice(0, 3).map((pr) => (
              <div
                key={pr.id}
                onClick={() => navigate(`/exercises/${pr.exerciseId}`)}
                className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0 cursor-pointer hover:bg-white/[0.02] -mx-4 px-4 transition-colors"
              >
                <div>
                  <p className="font-medium">{pr.exerciseName}</p>
                  <p className="text-xs text-zinc-500">
                    {pr.type === 'max_weight' && `${pr.value} lbs`}
                    {pr.type === 'max_volume' && `${pr.value} lbs volume`}
                    {pr.type === 'max_reps' && `${pr.value} reps`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="pr-badge">
                    <Trophy size={12} />
                    PR
                  </span>
                  <ChevronRight size={16} className="text-zinc-600" />
                </div>
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
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                  {data.weeklyMuscleGroups.slice(0, 6).map((entry) => (
                    <Cell
                      key={entry.muscleGroup}
                      fill={MUSCLE_GROUP_COLORS[entry.muscleGroup] || '#3f3f46'}
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
              <div className="p-2 bg-gradient-to-br from-zinc-700/50 to-zinc-800/50 rounded-lg">
                <Calendar className="text-zinc-400" size={18} />
              </div>
              <h2 className="font-semibold">Recent Workouts</h2>
            </div>
            <div className="flex items-center gap-1 text-blue-400 group-hover:text-blue-300 transition-colors">
              <span className="text-sm font-medium">View all</span>
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
          <div className="space-y-1">
            {data.recentWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0 cursor-pointer hover:bg-white/[0.02] -mx-4 px-4 transition-colors"
                onClick={() => navigate(`/history/${workout.id}`)}
              >
                <div>
                  <p className="font-medium">{workout.name || 'Workout'}</p>
                  <p className="text-xs text-zinc-500">
                    {format(parseISO(workout.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {workout.duration && workout.duration > 0 && (
                    <span className="text-sm text-zinc-500">{workout.duration} min</span>
                  )}
                  <ChevronRight size={16} className="text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!data?.recentWorkouts || data.recentWorkouts.length === 0) && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl flex items-center justify-center">
            <Dumbbell className="text-zinc-600" size={32} />
          </div>
          <p className="text-zinc-400 font-medium">No workouts yet</p>
          <p className="text-sm text-zinc-600 mt-1">Start your first workout to track progress!</p>
        </div>
      )}
    </div>
  );
}
