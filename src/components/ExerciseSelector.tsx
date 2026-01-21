import { useState, useEffect, useCallback } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { exerciseApi } from '../api/client';
import { useWorkoutStore } from '../store/workoutStore';
import type { Exercise, MuscleGroup, Equipment } from '../types';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Cardio',
];

const EQUIPMENT_TYPES: Equipment[] = [
  'Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio',
];

interface ExerciseSelectorProps {
  onClose: () => void;
}

export function ExerciseSelector({ onClose }: ExerciseSelectorProps) {
  const { addExercise, workoutExercises } = useWorkoutStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | ''>('');
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const loadExercises = useCallback(async () => {
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
  }, [search, muscleFilter, equipmentFilter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleSelect = async (exercise: Exercise) => {
    await addExercise(exercise);
    onClose();
  };

  const isAlreadyAdded = (exerciseId: string) => {
    return workoutExercises.some((we) => we.exercise.id === exerciseId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
      <div className="bg-slate-900 flex-1 flex flex-col max-h-screen">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Add Exercise</h2>
            <button onClick={onClose} className="p-2">
              <X size={24} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full !pl-12"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <select
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | '')}
              className="input py-2 px-3 min-w-fit"
            >
              <option value="">All Muscles</option>
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>

            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value as Equipment | '')}
              className="input py-2 px-3 min-w-fit"
            >
              <option value="">All Equipment</option>
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No exercises found</p>
              <button
                onClick={() => setShowCustomForm(true)}
                className="btn btn-secondary mt-4"
              >
                <Plus size={20} />
                Create Custom Exercise
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {exercises.map((exercise) => {
                const added = isAlreadyAdded(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    onClick={() => !added && handleSelect(exercise)}
                    disabled={added}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      added
                        ? 'bg-slate-800/50 opacity-50 cursor-not-allowed'
                        : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{exercise.name}</p>
                        <p className="text-sm text-blue-400">
                          {exercise.primaryMuscles.join(', ')}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                        {exercise.equipment}
                      </span>
                    </div>
                    {added && (
                      <p className="text-xs text-slate-500 mt-1">Already added</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create Custom Button */}
          {!loading && exercises.length > 0 && (
            <button
              onClick={() => setShowCustomForm(true)}
              className="btn btn-secondary w-full mt-4"
            >
              <Plus size={20} />
              Create Custom Exercise
            </button>
          )}
        </div>
      </div>

      {/* Custom Exercise Form */}
      {showCustomForm && (
        <CustomExerciseForm
          onClose={() => setShowCustomForm(false)}
          onCreated={(exercise) => {
            setShowCustomForm(false);
            handleSelect(exercise);
          }}
        />
      )}
    </div>
  );
}

interface CustomExerciseFormProps {
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
}

function CustomExerciseForm({ onClose, onCreated }: CustomExerciseFormProps) {
  const [name, setName] = useState('');
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('Barbell');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || primaryMuscles.length === 0) return;

    setSaving(true);
    try {
      const exercise = await exerciseApi.create({
        name: name.trim(),
        primaryMuscles,
        equipment,
      });
      onCreated(exercise);
    } catch (error) {
      console.error('Failed to create exercise:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleMuscle = (muscle: MuscleGroup) => {
    if (primaryMuscles.includes(muscle)) {
      setPrimaryMuscles(primaryMuscles.filter((m) => m !== muscle));
    } else if (primaryMuscles.length < 2) {
      setPrimaryMuscles([...primaryMuscles, muscle]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg">
        <h3 className="text-lg font-bold mb-4">Create Custom Exercise</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Exercise Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smith Machine Squat"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Primary Muscle Groups (select 1-2)
            </label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((muscle) => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => toggleMuscle(muscle)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    primaryMuscles.includes(muscle)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Equipment</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment)}
              className="input w-full"
            >
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || primaryMuscles.length === 0 || saving}
              className="btn btn-primary flex-1"
            >
              {saving ? 'Creating...' : 'Create Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
