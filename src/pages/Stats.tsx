import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { dashboardApi } from '../api/client';
import { BodyDiagramHeatmap } from '../components/BodyDiagramOptions';
import type { MuscleGroupVolume } from '../types';

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
};

type Period = 'week' | 'month';

export function Stats() {
  const [period, setPeriod] = useState<Period>('week');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupVolume[]>([]);
  const [imbalances, setImbalances] = useState<{ warning: string; muscleGroup1: string; muscleGroup2: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getMuscleGroups(period);
      setMuscleGroups(data.muscleGroups);
      setImbalances(data.imbalances);
    } catch (error) {
      console.error('Failed to load muscle group data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalSets = muscleGroups.reduce((acc, mg) => acc + mg.sets, 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Muscle Groups</h1>
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : muscleGroups.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No workout data yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Complete some workouts to see your muscle group distribution
            </p>
          </div>
        ) : (
          <>
            {/* Body Diagram */}
            <div className="card">
              <h2 className="font-semibold mb-4">Training Frequency</h2>
              <BodyDiagramHeatmap muscleGroups={muscleGroups} />
            </div>

            {/* Volume Distribution Pie Chart */}
            <div className="card">
              <h2 className="font-semibold mb-4">Volume Distribution</h2>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={muscleGroups}
                      dataKey="percentage"
                      nameKey="muscleGroup"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {muscleGroups.map((entry) => (
                        <Cell
                          key={entry.muscleGroup}
                          fill={MUSCLE_GROUP_COLORS[entry.muscleGroup] || '#64748b'}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {muscleGroups.map((mg) => (
                  <div key={mg.muscleGroup} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg.muscleGroup] }}
                    />
                    <span className="text-xs text-slate-400">{mg.muscleGroup}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="card">
              <h2 className="font-semibold mb-4">Sets by Muscle Group</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={muscleGroups}
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
                    <Bar dataKey="sets" radius={[0, 4, 4, 0]}>
                      {muscleGroups.map((entry) => (
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

            {/* Detailed Breakdown */}
            <div className="card">
              <h2 className="font-semibold mb-4">Detailed Breakdown</h2>
              <div className="space-y-3">
                {muscleGroups.map((mg) => (
                  <div
                    key={mg.muscleGroup}
                    className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg.muscleGroup] }}
                      />
                      <span>{mg.muscleGroup}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{mg.sets} sets</p>
                      <p className="text-xs text-slate-400">
                        {mg.volume.toLocaleString()} lbs ({mg.percentage}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Sets</span>
                  <span className="font-medium">{totalSets}</span>
                </div>
              </div>
            </div>

            {/* Imbalance Warnings */}
            {imbalances.length > 0 && (
              <div className="space-y-3">
                {imbalances.map((imbalance, index) => (
                  <div
                    key={index}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3"
                  >
                    <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-medium text-amber-400">Muscle Imbalance</p>
                      <p className="text-sm text-slate-400 mt-1">{imbalance.warning}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
