import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { exerciseApi } from '../api/client';
import type { Exercise, MuscleGroup, Equipment } from '../types';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
];

const EQUIPMENT_TYPES: Equipment[] = [
  'Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable',
];

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: 'bg-red-500/20 text-red-400',
  Back: 'bg-blue-500/20 text-blue-400',
  Shoulders: 'bg-amber-500/20 text-amber-400',
  Biceps: 'bg-emerald-500/20 text-emerald-400',
  Triceps: 'bg-purple-500/20 text-purple-400',
  Quads: 'bg-pink-500/20 text-pink-400',
  Hamstrings: 'bg-cyan-500/20 text-cyan-400',
  Glutes: 'bg-orange-500/20 text-orange-400',
  Calves: 'bg-lime-500/20 text-lime-400',
  Core: 'bg-indigo-500/20 text-indigo-400',
};

export function ExerciseLibrary() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, [search, muscleFilter, equipmentFilter]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const data = await exerciseApi.list({
        search: search || undefined,
        muscleGroup: muscleFilter || undefined,
        equipment: equipmentFilter || undefined,
      });
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group exercises by primary muscle
  const groupedExercises = exercises.reduce((acc, exercise) => {
    const primaryMuscle = exercise.primaryMuscles[0];
    if (!acc[primaryMuscle]) {
      acc[primaryMuscle] = [];
    }
    acc[primaryMuscle].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <h1 className="text-xl font-bold mb-4">Exercise Library</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <select
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | '')}
            className="input py-2 px-3 min-w-fit text-sm"
          >
            <option value="">All Muscles</option>
            {MUSCLE_GROUPS.map((mg) => (
              <option key={mg} value={mg}>{mg}</option>
            ))}
          </select>

          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value as Equipment | '')}
            className="input py-2 px-3 min-w-fit text-sm"
          >
            <option value="">All Equipment</option>
            {EQUIPMENT_TYPES.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : Object.keys(groupedExercises).length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>No exercises found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedExercises).map(([muscle, muscleExercises]) => (
              <div key={muscle}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${MUSCLE_GROUP_COLORS[muscle]}`}>
                    {muscle}
                  </span>
                  <span className="text-xs text-slate-500">
                    {muscleExercises.length} exercises
                  </span>
                </div>
                <div className="space-y-2">
                  {muscleExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => navigate(`/exercises/${exercise.id}`)}
                      className="w-full text-left p-4 bg-slate-800 rounded-lg hover:bg-slate-700 active:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{exercise.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                              {exercise.equipment}
                            </span>
                            {exercise.primaryMuscles.length > 1 && (
                              <span className="text-xs text-slate-400">
                                +{exercise.primaryMuscles.slice(1).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="text-slate-500" size={20} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
