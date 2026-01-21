import { useState, useEffect, useCallback } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { exerciseApi } from '../api/client';
import { useWorkoutStore } from '../store/workoutStore';
import { CustomExerciseForm, MUSCLE_GROUPS, EQUIPMENT_TYPES } from './CustomExerciseForm';
import type { Exercise, MuscleGroup, Equipment } from '../types';

const BODY_PARTS = [
  { value: '', label: 'All Body Parts' },
  { value: 'upper', label: 'Upper Body', muscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] },
  { value: 'lower', label: 'Lower Body', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  { value: 'core', label: 'Core', muscles: ['Core'] },
  { value: 'cardio', label: 'Cardio', muscles: ['Cardio'] },
];

interface ExerciseSelectorProps {
  onClose: () => void;
}

export function ExerciseSelector({ onClose }: ExerciseSelectorProps) {
  const { addExercise, workoutExercises } = useWorkoutStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | ''>('');
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const loadExercises = useCallback(async () => {
    try {
      // Use muscle filter if specified, otherwise don't filter by muscle
      const muscleGroupParam = muscleFilter || undefined;

      const data = await exerciseApi.list({
        search: search || undefined,
        muscleGroup: muscleGroupParam,
        equipment: equipmentFilter || undefined,
      });

      // Client-side filtering for body parts when no specific muscle is selected
      let filteredData = data;
      if (bodyPartFilter && !muscleFilter) {
        const bodyPart = BODY_PARTS.find(bp => bp.value === bodyPartFilter);
        if (bodyPart && bodyPart.muscles) {
          filteredData = data.filter(exercise =>
            exercise.primaryMuscles.some(muscle => bodyPart.muscles!.includes(muscle))
          );
        }
      }

      setExercises(filteredData);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [search, bodyPartFilter, muscleFilter, equipmentFilter]);

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
              value={bodyPartFilter}
              onChange={(e) => {
                setBodyPartFilter(e.target.value);
                // Reset muscle filter when body part changes
                if (e.target.value) setMuscleFilter('');
              }}
              className="input py-2 px-3 min-w-fit"
            >
              {BODY_PARTS.map((bp) => (
                <option key={bp.value} value={bp.value}>{bp.label}</option>
              ))}
            </select>

            <select
              value={muscleFilter}
              onChange={(e) => {
                setMuscleFilter(e.target.value as MuscleGroup | '');
                // Reset body part filter when specific muscle is selected
                if (e.target.value) setBodyPartFilter('');
              }}
              className="input py-2 px-3 min-w-fit"
            >
              <option value="">All Muscles</option>
              {MUSCLE_GROUPS.filter(mg => {
                if (!bodyPartFilter) return true;
                const bodyPart = BODY_PARTS.find(bp => bp.value === bodyPartFilter);
                return bodyPart && bodyPart.muscles && bodyPart.muscles.includes(mg);
              }).map((mg) => (
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

