import { useState } from 'react';
import { exerciseApi } from '../api/client';
import type { Exercise, MuscleGroup, Equipment } from '../types';

// eslint-disable-next-line react-refresh/only-export-components
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Cardio',
];

// eslint-disable-next-line react-refresh/only-export-components
export const EQUIPMENT_TYPES: Equipment[] = [
  'Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio',
];

interface CustomExerciseFormProps {
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
}

export function CustomExerciseForm({ onClose, onCreated }: CustomExerciseFormProps) {
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
