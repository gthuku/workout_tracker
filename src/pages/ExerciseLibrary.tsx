import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
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

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscles, setNewExerciseMuscles] = useState<MuscleGroup[]>([]);
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<Equipment>('Barbell');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadExercises = useCallback(async () => {
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
  }, [search, muscleFilter, equipmentFilter]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleToggleMuscle = (muscle: MuscleGroup) => {
    setNewExerciseMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle]
    );
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim()) {
      setError('Please enter an exercise name');
      return;
    }
    if (newExerciseMuscles.length === 0) {
      setError('Please select at least one muscle group');
      return;
    }

    setCreating(true);
    setError('');
    try {
      await exerciseApi.create({
        name: newExerciseName.trim(),
        primaryMuscles: newExerciseMuscles,
        equipment: newExerciseEquipment,
      });
      // Reset form and close modal
      setNewExerciseName('');
      setNewExerciseMuscles([]);
      setNewExerciseEquipment('Barbell');
      setShowModal(false);
      // Reload exercises
      loadExercises();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to create exercise');
    } finally {
      setCreating(false);
    }
  };

  const resetModal = () => {
    setNewExerciseName('');
    setNewExerciseMuscles([]);
    setNewExerciseEquipment('Barbell');
    setError('');
    setShowModal(false);
  };

  const handleDeleteExercise = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await exerciseApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadExercises();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to delete exercise');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Exercise Library</h1>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary !py-2 !px-4 !min-h-0"
          >
            <Plus size={18} />
            Add Exercise
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full !pl-12"
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
                    <div
                      key={exercise.id}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => navigate(`/exercises/${exercise.id}`)}
                        className="flex-1 text-left p-4 bg-slate-800 rounded-lg hover:bg-slate-700 active:bg-slate-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {exercise.name}
                              {exercise.isCustom ? (
                                <span className="ml-2 text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                                  Custom
                                </span>
                              ) : null}
                            </p>
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
                      {exercise.isCustom && (
                        <button
                          onClick={() => setDeleteTarget(exercise)}
                          className="p-3 bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete exercise"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-2">Delete Exercise</h3>
            <p className="text-slate-400 text-sm mb-1">
              Are you sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>?
            </p>
            <p className="text-red-400 text-xs mb-6">
              This will also remove all associated workout history and personal records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExercise}
                disabled={deleting}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-bold">Add Custom Exercise</h2>
              <button onClick={resetModal} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Exercise Name */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Exercise Name *</label>
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="e.g., Cable Fly"
                  className="input w-full"
                  autoFocus
                />
              </div>

              {/* Primary Muscles */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Primary Muscles *</label>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((muscle) => (
                    <button
                      key={muscle}
                      type="button"
                      onClick={() => handleToggleMuscle(muscle)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${newExerciseMuscles.includes(muscle)
                        ? MUSCLE_GROUP_COLORS[muscle] + ' ring-2 ring-white/20'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                    >
                      {muscle}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Equipment *</label>
                <select
                  value={newExerciseEquipment}
                  onChange={(e) => setNewExerciseEquipment(e.target.value as Equipment)}
                  className="input w-full"
                >
                  {EQUIPMENT_TYPES.map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary w-full"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Plus size={18} />
                      Create Exercise
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
