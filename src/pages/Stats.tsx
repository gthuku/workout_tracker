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
import { dashboardApi, userApi } from '../api/client';
import type { MuscleGroupVolume, Gender } from '../types';

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
  const [gender, setGender] = useState<Gender>('male');

  const loadUserData = useCallback(async () => {
    try {
      const user = await userApi.get();
      if (user.gender) {
        setGender(user.gender);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

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
              <BodyDiagram muscleGroups={muscleGroups} gender={gender} />
            </div>

            {/* Volume Distribution Pie Chart */}
            <div className="card">
              <h2 className="font-semibold mb-4">Volume Distribution</h2>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={muscleGroups as any[]}
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

interface BodyDiagramProps {
  muscleGroups: MuscleGroupVolume[];
  gender: Gender;
}

function BodyDiagram({ muscleGroups, gender }: BodyDiagramProps) {
  const maxSets = Math.max(...muscleGroups.map((mg) => mg.sets), 1);

  const getIntensity = (muscleGroup: string) => {
    const mg = muscleGroups.find((m) => m.muscleGroup === muscleGroup);
    if (!mg) return 0;
    return mg.sets / maxSets;
  };

  const getColor = (muscleGroup: string) => {
    const intensity = getIntensity(muscleGroup);
    if (intensity === 0) return '#334155';
    const baseColor = MUSCLE_GROUP_COLORS[muscleGroup] || '#64748b';
    return baseColor;
  };

  const getOpacity = (muscleGroup: string) => {
    const intensity = getIntensity(muscleGroup);
    return Math.max(0.3, intensity);
  };

  const skinColor = '#d4a574';
  const skinColorDark = '#c49464';

  if (gender === 'female') {
    return (
      <div className="flex justify-center gap-6">
        {/* Female Front View */}
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-2">Front</p>
          <svg width="140" height="280" viewBox="0 0 140 280">
            {/* Head */}
            <ellipse cx="70" cy="25" rx="18" ry="22" fill={skinColor} />
            {/* Hair */}
            <ellipse cx="70" cy="18" rx="20" ry="18" fill="#4a3728" />
            <path d="M50 25 Q45 60 48 80" stroke="#4a3728" strokeWidth="8" fill="none" />
            <path d="M90 25 Q95 60 92 80" stroke="#4a3728" strokeWidth="8" fill="none" />
            {/* Face details */}
            <ellipse cx="63" cy="26" rx="2" ry="1.5" fill="#3d3d3d" />
            <ellipse cx="77" cy="26" rx="2" ry="1.5" fill="#3d3d3d" />
            <path d="M67 34 Q70 37 73 34" stroke="#c4846a" strokeWidth="1.5" fill="none" />

            {/* Neck */}
            <rect x="62" y="45" width="16" height="12" fill={skinColor} rx="3" />

            {/* Shoulders - more rounded for female */}
            <ellipse cx="35" cy="68" rx="14" ry="9" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />
            <ellipse cx="105" cy="68" rx="14" ry="9" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />

            {/* Chest/Bust area */}
            <path d="M42 60 Q70 55 98 60 L100 95 Q70 105 40 95 Z" fill={getColor('Chest')} opacity={getOpacity('Chest')} />

            {/* Core/Waist - narrower for female */}
            <path d="M48 95 Q70 90 92 95 L88 140 Q70 145 52 140 Z" fill={getColor('Core')} opacity={getOpacity('Core')} />

            {/* Hips - wider for female */}
            <ellipse cx="70" cy="145" rx="28" ry="15" fill={skinColor} />

            {/* Biceps - slimmer */}
            <ellipse cx="22" cy="90" rx="7" ry="22" fill={getColor('Biceps')} opacity={getOpacity('Biceps')} />
            <ellipse cx="118" cy="90" rx="7" ry="22" fill={getColor('Biceps')} opacity={getOpacity('Biceps')} />

            {/* Forearms */}
            <ellipse cx="18" cy="135" rx="5" ry="20" fill={skinColor} />
            <ellipse cx="122" cy="135" rx="5" ry="20" fill={skinColor} />

            {/* Hands */}
            <ellipse cx="16" cy="160" rx="4" ry="8" fill={skinColor} />
            <ellipse cx="124" cy="160" rx="4" ry="8" fill={skinColor} />

            {/* Quads - feminine shape */}
            <ellipse cx="55" cy="190" rx="14" ry="35" fill={getColor('Quads')} opacity={getOpacity('Quads')} />
            <ellipse cx="85" cy="190" rx="14" ry="35" fill={getColor('Quads')} opacity={getOpacity('Quads')} />

            {/* Calves */}
            <ellipse cx="53" cy="250" rx="8" ry="22" fill={getColor('Calves')} opacity={getOpacity('Calves')} />
            <ellipse cx="87" cy="250" rx="8" ry="22" fill={getColor('Calves')} opacity={getOpacity('Calves')} />

            {/* Feet */}
            <ellipse cx="53" cy="275" rx="6" ry="4" fill={skinColorDark} />
            <ellipse cx="87" cy="275" rx="6" ry="4" fill={skinColorDark} />
          </svg>
        </div>

        {/* Female Back View */}
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-2">Back</p>
          <svg width="140" height="280" viewBox="0 0 140 280">
            {/* Head */}
            <ellipse cx="70" cy="25" rx="18" ry="22" fill={skinColor} />
            {/* Hair - longer */}
            <ellipse cx="70" cy="20" rx="20" ry="20" fill="#4a3728" />
            <path d="M50 30 Q45 80 50 120" stroke="#4a3728" strokeWidth="10" fill="none" />
            <path d="M90 30 Q95 80 90 120" stroke="#4a3728" strokeWidth="10" fill="none" />
            <rect x="52" y="35" width="36" height="50" fill="#4a3728" rx="5" />

            {/* Neck */}
            <rect x="62" y="45" width="16" height="12" fill={skinColor} rx="3" />

            {/* Shoulders */}
            <ellipse cx="35" cy="68" rx="14" ry="9" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />
            <ellipse cx="105" cy="68" rx="14" ry="9" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />

            {/* Back - feminine V-taper */}
            <path d="M42 60 Q70 55 98 60 L95 120 Q70 125 45 120 Z" fill={getColor('Back')} opacity={getOpacity('Back')} />

            {/* Triceps */}
            <ellipse cx="22" cy="90" rx="7" ry="22" fill={getColor('Triceps')} opacity={getOpacity('Triceps')} />
            <ellipse cx="118" cy="90" rx="7" ry="22" fill={getColor('Triceps')} opacity={getOpacity('Triceps')} />

            {/* Forearms */}
            <ellipse cx="18" cy="135" rx="5" ry="20" fill={skinColor} />
            <ellipse cx="122" cy="135" rx="5" ry="20" fill={skinColor} />

            {/* Hands */}
            <ellipse cx="16" cy="160" rx="4" ry="8" fill={skinColor} />
            <ellipse cx="124" cy="160" rx="4" ry="8" fill={skinColor} />

            {/* Glutes - rounder for female */}
            <ellipse cx="55" cy="145" rx="18" ry="16" fill={getColor('Glutes')} opacity={getOpacity('Glutes')} />
            <ellipse cx="85" cy="145" rx="18" ry="16" fill={getColor('Glutes')} opacity={getOpacity('Glutes')} />

            {/* Hamstrings */}
            <ellipse cx="55" cy="195" rx="14" ry="30" fill={getColor('Hamstrings')} opacity={getOpacity('Hamstrings')} />
            <ellipse cx="85" cy="195" rx="14" ry="30" fill={getColor('Hamstrings')} opacity={getOpacity('Hamstrings')} />

            {/* Calves */}
            <ellipse cx="53" cy="250" rx="8" ry="22" fill={getColor('Calves')} opacity={getOpacity('Calves')} />
            <ellipse cx="87" cy="250" rx="8" ry="22" fill={getColor('Calves')} opacity={getOpacity('Calves')} />

            {/* Feet */}
            <ellipse cx="53" cy="275" rx="6" ry="4" fill={skinColorDark} />
            <ellipse cx="87" cy="275" rx="6" ry="4" fill={skinColorDark} />
          </svg>
        </div>
      </div>
    );
  }

  // Male figure (default)
  return (
    <div className="flex justify-center gap-6">
      {/* Male Front View */}
      <div className="text-center">
        <p className="text-xs text-slate-500 mb-2">Front</p>
        <svg width="140" height="280" viewBox="0 0 140 280">
          {/* Head */}
          <ellipse cx="70" cy="25" rx="18" ry="20" fill={skinColor} />
          {/* Hair - short */}
          <ellipse cx="70" cy="15" rx="17" ry="12" fill="#3d3028" />
          {/* Face details */}
          <ellipse cx="63" cy="26" rx="2.5" ry="2" fill="#3d3d3d" />
          <ellipse cx="77" cy="26" rx="2.5" ry="2" fill="#3d3d3d" />
          <rect x="66" y="30" width="8" height="4" fill={skinColorDark} rx="1" />
          <path d="M65 38 L75 38" stroke="#c4846a" strokeWidth="2" />

          {/* Neck - thicker for male */}
          <rect x="58" y="43" width="24" height="15" fill={skinColor} rx="3" />

          {/* Trapezius visible from front */}
          <path d="M58 50 L42 65 L58 60 Z" fill={getColor('Back')} opacity={getOpacity('Back')} />
          <path d="M82 50 L98 65 L82 60 Z" fill={getColor('Back')} opacity={getOpacity('Back')} />

          {/* Shoulders - broader for male */}
          <ellipse cx="30" cy="70" rx="18" ry="12" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />
          <ellipse cx="110" cy="70" rx="18" ry="12" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />

          {/* Chest - more defined pecs */}
          <ellipse cx="52" cy="85" rx="18" ry="15" fill={getColor('Chest')} opacity={getOpacity('Chest')} />
          <ellipse cx="88" cy="85" rx="18" ry="15" fill={getColor('Chest')} opacity={getOpacity('Chest')} />

          {/* Core/Abs - 6-pack definition */}
          <rect x="48" y="100" width="44" height="45" fill={getColor('Core')} opacity={getOpacity('Core')} rx="5" />
          {/* Ab lines */}
          <line x1="70" y1="102" x2="70" y2="142" stroke="#2d3748" strokeWidth="1" opacity="0.3" />
          <line x1="50" y1="115" x2="90" y2="115" stroke="#2d3748" strokeWidth="1" opacity="0.3" />
          <line x1="50" y1="130" x2="90" y2="130" stroke="#2d3748" strokeWidth="1" opacity="0.3" />

          {/* Biceps - larger for male */}
          <ellipse cx="18" cy="95" rx="10" ry="25" fill={getColor('Biceps')} opacity={getOpacity('Biceps')} />
          <ellipse cx="122" cy="95" rx="10" ry="25" fill={getColor('Biceps')} opacity={getOpacity('Biceps')} />

          {/* Forearms */}
          <ellipse cx="14" cy="140" rx="7" ry="22" fill={skinColor} />
          <ellipse cx="126" cy="140" rx="7" ry="22" fill={skinColor} />

          {/* Hands */}
          <ellipse cx="12" cy="168" rx="5" ry="10" fill={skinColor} />
          <ellipse cx="128" cy="168" rx="5" ry="10" fill={skinColor} />

          {/* Quads - muscular */}
          <ellipse cx="52" cy="190" rx="16" ry="38" fill={getColor('Quads')} opacity={getOpacity('Quads')} />
          <ellipse cx="88" cy="190" rx="16" ry="38" fill={getColor('Quads')} opacity={getOpacity('Quads')} />

          {/* Calves */}
          <ellipse cx="50" cy="252" rx="10" ry="24" fill={getColor('Calves')} opacity={getOpacity('Calves')} />
          <ellipse cx="90" cy="252" rx="10" ry="24" fill={getColor('Calves')} opacity={getOpacity('Calves')} />

          {/* Feet */}
          <ellipse cx="50" cy="278" rx="8" ry="5" fill={skinColorDark} />
          <ellipse cx="90" cy="278" rx="8" ry="5" fill={skinColorDark} />
        </svg>
      </div>

      {/* Male Back View */}
      <div className="text-center">
        <p className="text-xs text-slate-500 mb-2">Back</p>
        <svg width="140" height="280" viewBox="0 0 140 280">
          {/* Head */}
          <ellipse cx="70" cy="25" rx="18" ry="20" fill={skinColor} />
          {/* Hair */}
          <ellipse cx="70" cy="15" rx="17" ry="14" fill="#3d3028" />

          {/* Neck */}
          <rect x="58" y="43" width="24" height="15" fill={skinColor} rx="3" />

          {/* Trapezius */}
          <path d="M58 48 L30 75 L50 80 L70 65 L90 80 L110 75 L82 48 Z" fill={getColor('Back')} opacity={getOpacity('Back')} />

          {/* Shoulders */}
          <ellipse cx="30" cy="70" rx="18" ry="12" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />
          <ellipse cx="110" cy="70" rx="18" ry="12" fill={getColor('Shoulders')} opacity={getOpacity('Shoulders')} />

          {/* Back - V-taper lats */}
          <path d="M35 75 Q70 65 105 75 L100 130 Q70 140 40 130 Z" fill={getColor('Back')} opacity={getOpacity('Back')} />
          {/* Spine detail */}
          <line x1="70" y1="70" x2="70" y2="130" stroke="#2d3748" strokeWidth="2" opacity="0.2" />

          {/* Triceps - horseshoe shape */}
          <ellipse cx="18" cy="95" rx="10" ry="25" fill={getColor('Triceps')} opacity={getOpacity('Triceps')} />
          <ellipse cx="122" cy="95" rx="10" ry="25" fill={getColor('Triceps')} opacity={getOpacity('Triceps')} />

          {/* Forearms */}
          <ellipse cx="14" cy="140" rx="7" ry="22" fill={skinColor} />
          <ellipse cx="126" cy="140" rx="7" ry="22" fill={skinColor} />

          {/* Hands */}
          <ellipse cx="12" cy="168" rx="5" ry="10" fill={skinColor} />
          <ellipse cx="128" cy="168" rx="5" ry="10" fill={skinColor} />

          {/* Lower back */}
          <rect x="50" y="130" width="40" height="20" fill={getColor('Core')} opacity={getOpacity('Core')} rx="5" />

          {/* Glutes */}
          <ellipse cx="52" cy="158" rx="16" ry="14" fill={getColor('Glutes')} opacity={getOpacity('Glutes')} />
          <ellipse cx="88" cy="158" rx="16" ry="14" fill={getColor('Glutes')} opacity={getOpacity('Glutes')} />

          {/* Hamstrings */}
          <ellipse cx="52" cy="200" rx="15" ry="32" fill={getColor('Hamstrings')} opacity={getOpacity('Hamstrings')} />
          <ellipse cx="88" cy="200" rx="15" ry="32" fill={getColor('Hamstrings')} opacity={getOpacity('Hamstrings')} />

          {/* Calves */}
          <ellipse cx="50" cy="252" rx="10" ry="24" fill={getColor('Calves')} opacity={getOpacity('Calves')} />
          <ellipse cx="90" cy="252" rx="10" ry="24" fill={getColor('Calves')} opacity={getOpacity('Calves')} />

          {/* Feet */}
          <ellipse cx="50" cy="278" rx="8" ry="5" fill={skinColorDark} />
          <ellipse cx="90" cy="278" rx="8" ry="5" fill={skinColorDark} />
        </svg>
      </div>
    </div>
  );
}
