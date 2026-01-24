import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Trophy } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { exerciseApi, prApi } from '../api/client';
import type { ExerciseHistory, Exercise, PRTrends, PRTrendType } from '../types';
import { format, parseISO } from 'date-fns';
import { ProgressIndicator } from '../components/ProgressIndicator';

const PR_TYPE_LABELS: Record<PRTrendType, string> = {
  max_weight: 'Weight',
  max_volume: 'Volume',
  max_reps: 'Reps',
};

const PR_TYPE_UNITS: Record<PRTrendType, string> = {
  max_weight: 'lbs',
  max_volume: 'lbs',
  max_reps: 'reps',
};

export function ExerciseHistoryPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [prTrends, setPrTrends] = useState<PRTrends | null>(null);
  const [selectedPRType, setSelectedPRType] = useState<PRTrendType>('max_weight');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!exerciseId) return;

    try {
      const [exercises, historyData, trendsData] = await Promise.all([
        exerciseApi.list({ search: '' }),
        exerciseApi.getHistory(exerciseId, 8),
        prApi.getTrends(exerciseId, selectedPRType, 52),
      ]);

      const foundExercise = exercises.find((e) => e.id === exerciseId);
      setExercise(foundExercise || null);
      setHistory(historyData);
      setPrTrends(trendsData);
    } catch (error) {
      console.error('Failed to load exercise history:', error);
    } finally {
      setLoading(false);
    }
  }, [exerciseId, selectedPRType]);

  useEffect(() => {
    if (!exerciseId) return;
    loadData();
  }, [loadData, exerciseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!exercise || !history) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Exercise not found</p>
        <button onClick={() => navigate('/exercises')} className="btn btn-secondary mt-4">
          Back to Exercises
        </button>
      </div>
    );
  }

  const sessions = history.sessions || [];
  const latestSession = sessions[0];
  const previousSession = sessions[1];

  // Prepare chart data
  const chartData = [...sessions]
    .reverse()
    .map((session) => ({
      date: format(parseISO(session.date), 'MMM d'),
      volume: session.totalVolume,
    }));

  // Calculate trend
  const trend = sessions.length >= 2
    ? ((latestSession.totalVolume - previousSession.totalVolume) / previousSession.totalVolume) * 100
    : 0;

  // Check for plateau (no improvement for 3+ sessions)
  const isPlateauing = sessions.length >= 3 && sessions.slice(0, 3).every((session, i) => {
    if (i === 0) return true;
    const prev = sessions[i - 1];
    const improvement = ((prev.totalVolume - session.totalVolume) / session.totalVolume) * 100;
    return improvement <= 2;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/exercises')} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="font-bold text-lg">{exercise.name}</h1>
            <p className="text-sm text-blue-400">{exercise.primaryMuscles.join(', ')}</p>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {sessions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No history for this exercise yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Complete a workout with this exercise to see progress
            </p>
          </div>
        ) : (
          <>
            {/* Plateau Warning */}
            {isPlateauing && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-amber-400">Plateau Detected</p>
                  <p className="text-sm text-slate-400 mt-1">
                    No significant improvement in the last 3 sessions. Consider:
                  </p>
                  <ul className="text-sm text-slate-400 mt-2 list-disc list-inside">
                    <li>Increasing weight by 5-10%</li>
                    <li>Adding more reps or sets</li>
                    <li>Taking a deload week</li>
                  </ul>
                </div>
              </div>
            )}

            {/* PR Trends */}
            {prTrends && prTrends.trends.length > 0 && (
              <div className="card">
                {/* Current PR Display */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg">
                      <Trophy className="text-amber-500" size={18} />
                    </div>
                    <h2 className="font-semibold">Personal Record</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-400">
                      {prTrends.currentPR.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{PR_TYPE_UNITS[selectedPRType]}</p>
                  </div>
                </div>

                {/* PR Type Tabs */}
                <div className="flex gap-2 mb-4">
                  {(Object.keys(PR_TYPE_LABELS) as PRTrendType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedPRType(type)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedPRType === type
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {PR_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>

                {/* PR Trend Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={prTrends.trends.map((t) => ({
                        ...t,
                        date: format(parseISO(t.date), 'MMM d'),
                      }))}
                    >
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) =>
                          selectedPRType === 'max_reps'
                            ? value.toString()
                            : value >= 1000
                            ? `${(value / 1000).toFixed(1)}k`
                            : value.toString()
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value, _name, props) => {
                          const point = props.payload;
                          const label = point.isNewPR ? `${value} (NEW PR!)` : value;
                          return [label, PR_TYPE_LABELS[selectedPRType]];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload.isNewPR) {
                            return (
                              <g key={`pr-${payload.date}`}>
                                <circle cx={cx} cy={cy} r={8} fill="#f59e0b" opacity={0.3} />
                                <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fef3c7" strokeWidth={2} />
                              </g>
                            );
                          }
                          return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={4} fill="#f59e0b" strokeWidth={0} />;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-amber-100" />
                    <span>New PR</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Session</span>
                  </div>
                </div>
              </div>
            )}

            {/* Volume Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Volume Trend</h2>
                <div className="flex items-center gap-2">
                  {trend > 0 ? (
                    <TrendingUp className="text-green-500" size={20} />
                  ) : trend < 0 ? (
                    <TrendingDown className="text-red-500" size={20} />
                  ) : (
                    <Minus className="text-yellow-500" size={20} />
                  )}
                  <span className={`text-sm font-medium ${
                    trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value) => [`${(value as number)?.toLocaleString() ?? 0} lbs`, 'Volume']}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparison Table */}
            {latestSession && previousSession && (
              <div className="card">
                <h2 className="font-semibold mb-4">Last Session vs Previous</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Total Volume</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        {previousSession.totalVolume.toLocaleString()}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium">
                        {latestSession.totalVolume.toLocaleString()}
                      </span>
                      <ProgressIndicator
                        current={latestSession.totalVolume}
                        previous={previousSession.totalVolume}
                        showPercentage={false}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Max Weight</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{previousSession.maxWeight} lbs</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium">{latestSession.maxWeight} lbs</span>
                      <ProgressIndicator
                        current={latestSession.maxWeight}
                        previous={previousSession.maxWeight}
                        showPercentage={false}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-400">Total Reps</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{previousSession.totalReps}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium">{latestSession.totalReps}</span>
                      <ProgressIndicator
                        current={latestSession.totalReps}
                        previous={previousSession.totalReps}
                        showPercentage={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session History */}
            <div className="card">
              <h2 className="font-semibold mb-4">History</h2>
              <div className="space-y-4">
                {sessions.map((session, index) => (
                  <div
                    key={session.date}
                    className="pb-4 border-b border-slate-700 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {format(parseISO(session.date), 'MMM d, yyyy')}
                      </span>
                      {index < sessions.length - 1 && (
                        <ProgressIndicator
                          current={session.totalVolume}
                          previous={sessions[index + 1].totalVolume}
                        />
                      )}
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      {session.sets.map((set, setIndex) => (
                        <p key={setIndex}>
                          Set {set.setNumber}: {set.weight} lbs × {set.reps}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Volume: {session.totalVolume.toLocaleString()} lbs
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
