import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, Sparkles, TrendingUp, Calendar, ChevronRight, Activity, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { prApi, exerciseApi } from '../api/client';
import type { PersonalRecord, PRTrends, PRTrendType, Exercise } from '../types';
import { format, parseISO } from 'date-fns';

// Helper to handle both snake_case and camelCase date fields from API
function getAchievedAt(pr: PersonalRecord & { exerciseName: string; achieved_at?: string }): string {
    return pr.achievedAt || pr.achieved_at || new Date().toISOString();
}

export function RecentPRs() {
    const navigate = useNavigate();
    const [prs, setPrs] = useState<(PersonalRecord & { exerciseName: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [search, setSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
    const [trends, setTrends] = useState<PRTrends | null>(null);
    const [trendType, setTrendType] = useState<PRTrendType>('max_weight');
    const [loadingTrends, setLoadingTrends] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadInitialData() {
            try {
                const [prData, exerciseData] = await Promise.all([
                    prApi.list(50),
                    exerciseApi.list({})
                ]);
                setPrs(prData);
                setExercises(exerciseData);
                if (prData.length > 0) {
                    setSelectedExerciseId(prData[0].exerciseId);
                    setSelectedExerciseName(prData[0].exerciseName);
                }
            } catch (err) {
                const error = err as Error;
                console.error('Failed to load data:', error);
                // If auth failed, force full page reload to show profile selector
                if (error.message === 'Authentication required' || error.message === 'Unauthorized') {
                    window.location.reload();
                    return;
                }
                setError(error.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    const loadTrends = useCallback(async (exerciseId: string, type: PRTrendType) => {
        setLoadingTrends(true);
        try {
            const data = await prApi.getTrends(exerciseId, type, 52);
            setTrends(data);
        } catch {
            // Endpoint may not exist on production - silently fail and show empty state
            setTrends(null);
        } finally {
            setLoadingTrends(false);
        }
    }, []);

    useEffect(() => {
        if (selectedExerciseId) {
            loadTrends(selectedExerciseId, trendType);
        }
    }, [selectedExerciseId, trendType, loadTrends]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">
                    Go to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold">Personal Records</h1>
                </div>
            </header>

            <div className="p-4 max-w-lg mx-auto space-y-6">
                {/* Exercise Selector */}
                <div className="relative z-20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Select or search exercise..."
                            value={isSearching ? search : selectedExerciseName}
                            onFocus={() => {
                                setIsSearching(true);
                                setSearch('');
                            }}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input w-full !pl-10 pr-16"
                        />
                        {isSearching && (
                            <button
                                onClick={() => setIsSearching(false)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 font-medium"
                            >
                                Done
                            </button>
                        )}
                    </div>

                    {isSearching && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-30">
                            {exercises
                                .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
                                .slice(0, 20)
                                .map(exercise => (
                                    <button
                                        key={exercise.id}
                                        onClick={() => {
                                            setSelectedExerciseId(exercise.id);
                                            setSelectedExerciseName(exercise.name);
                                            setIsSearching(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700/50 last:border-0 flex items-center justify-between"
                                    >
                                        <span className="font-medium">{exercise.name}</span>
                                        <span className="text-xs text-slate-500">{exercise.equipment}</span>
                                    </button>
                                ))
                            }
                            {exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                                <div className="p-8 text-center text-slate-500 italic">
                                    No exercises found
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Trend Chart */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-semibold flex items-center gap-2">
                                <TrendingUp size={18} className="text-blue-400" />
                                PR Trends
                            </h2>
                            <p className="text-xs text-slate-500">{selectedExerciseName || 'Select an exercise'}</p>
                        </div>
                        <select
                            value={trendType}
                            onChange={(e) => setTrendType(e.target.value as PRTrendType)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                        >
                            <option value="max_weight">Weight</option>
                            <option value="max_volume">Volume</option>
                            <option value="max_reps">Reps</option>
                        </select>
                    </div>

                    <div className="h-48 w-full">
                        {loadingTrends ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-pulse flex space-x-2">
                                    <div className="h-2 w-2 bg-slate-600 rounded-full"></div>
                                    <div className="h-2 w-2 bg-slate-600 rounded-full"></div>
                                    <div className="h-2 w-2 bg-slate-600 rounded-full"></div>
                                </div>
                            </div>
                        ) : trends && trends.trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trends.trends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                    <XAxis
                                        dataKey="date"
                                        hide
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <Activity size={32} className="mb-2 opacity-20" />
                                <p className="text-sm italic">Not enough data for trends</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PR List */}
                <div className="space-y-3">
                    <h2 className="font-semibold flex items-center gap-2 px-1">
                        <Trophy size={18} className="text-amber-500" />
                        Recent Achievements
                        <Sparkles size={14} className="text-amber-500" />
                    </h2>

                    {prs.length === 0 ? (
                        <div className="card text-center py-12">
                            <Trophy className="mx-auto text-slate-700 mb-4 opacity-20" size={48} />
                            <p className="text-slate-400 font-medium">No PRs recorded yet</p>
                            <p className="text-sm text-slate-600 mt-1">Keep training and they&apos;ll appear here!</p>
                        </div>
                    ) : (
                        prs.map((pr) => (
                            <div
                                key={pr.id}
                                onClick={() => {
                                    setSelectedExerciseId(pr.exerciseId);
                                    setSelectedExerciseName(pr.exerciseName);
                                }}
                                className={`card cursor-pointer transition-all duration-200 border-l-4 ${selectedExerciseId === pr.exerciseId
                                    ? 'bg-blue-500/5 border-l-blue-500 translate-x-1'
                                    : 'hover:bg-white/[0.02] border-l-transparent'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold">{pr.exerciseName}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-lg font-mono text-amber-400">
                                                {pr.type === 'max_weight' && `${pr.value} lbs`}
                                                {pr.type === 'max_volume' && `${pr.value} lbs vol`}
                                                {pr.type === 'max_reps' && `${pr.value} reps`}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Calendar size={12} />
                                                <span>{format(parseISO(getAchievedAt(pr)), 'MMM d, yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="pr-badge">
                                            <Trophy size={12} />
                                            PR
                                        </span>
                                        <ChevronRight size={18} className={selectedExerciseId === pr.exerciseId ? 'text-blue-400' : 'text-slate-600'} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
