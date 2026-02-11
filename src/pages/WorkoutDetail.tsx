import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Calendar, Edit2, Check, X, Trash2, Plus, Search } from 'lucide-react';
import { workoutApi, setApi, exerciseApi } from '../api/client';
import { CustomExerciseForm } from '../components/CustomExerciseForm';
import type { RawWorkout, RawWorkoutSet } from '../api/client';
import type { Exercise, MuscleGroup } from '../types';
import { format, parseISO } from 'date-fns';
import { WORKOUT_LIMITS } from '../constants/workout';

interface WorkoutWithSets extends RawWorkout {
  sets: (RawWorkoutSet & { exercise_name: string; primaryMuscles: MuscleGroup[] })[];
}

export function WorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<WorkoutWithSets | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState('');
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editedDuration, setEditedDuration] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [addingSetToExercise, setAddingSetToExercise] = useState<string | null>(null);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  const loadWorkout = useCallback(async () => {
    if (!workoutId) return;

    try {
      const data = await workoutApi.get(workoutId);
      setWorkout(data as WorkoutWithSets);
    } catch (error) {
      console.error('Failed to load workout:', error);
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    if (!workoutId) return;
    loadWorkout();
  }, [loadWorkout, workoutId]);

  const handleSaveName = async () => {
    if (!workout || !editedName.trim()) {
      setIsEditingName(false);
      return;
    }

    try {
      await workoutApi.update(workout.id, { name: editedName.trim() });
      setWorkout({ ...workout, name: editedName.trim() });
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to rename workout:', error);
    }
  };

  const handleSaveDate = async () => {
    if (!workout || !editedDate) {
      setIsEditingDate(false);
      return;
    }

    try {
      await workoutApi.update(workout.id, { date: editedDate });
      setWorkout({ ...workout, date: editedDate });
      setIsEditingDate(false);
    } catch (error) {
      console.error('Failed to update workout date:', error);
    }
  };

  const handleSaveDuration = async () => {
    if (!workout) {
      setIsEditingDuration(false);
      return;
    }

    try {
      await workoutApi.update(workout.id, { duration: editedDuration });
      setWorkout({ ...workout, duration: editedDuration });
      setIsEditingDuration(false);
    } catch (error) {
      console.error('Failed to update workout duration:', error);
    }
  };

  const handleUpdateSet = async (setId: string, reps: number, weight: number) => {
    if (!workout) return;

    try {
      await setApi.update(setId, { reps, weight });
      setWorkout({
        ...workout,
        sets: workout.sets.map(s => s.id === setId ? { ...s, reps, weight } : s),
      });
      setEditingSetId(null);
    } catch (error) {
      console.error('Failed to update set:', error);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!workout) return;
    if (!window.confirm('Delete this set?')) return;

    try {
      await setApi.delete(setId);
      setWorkout({
        ...workout,
        sets: workout.sets.filter(s => s.id !== setId),
      });
    } catch (error) {
      console.error('Failed to delete set:', error);
    }
  };

  const handleAddSet = async (exerciseId: string, reps: number, weight: number) => {
    if (!workout) return;

    const exerciseSets = workout.sets.filter(s => s.exercise_id === exerciseId);
    const setNumber = exerciseSets.length + 1;

    try {
      const newSet = await setApi.create(workout.id, {
        exerciseId,
        setNumber,
        reps,
        weight,
      });

      // Get exercise info from existing sets
      const existingSet = exerciseSets[0];

      setWorkout({
        ...workout,
        sets: [...workout.sets, {
          ...newSet,
          exercise_id: exerciseId,
          exercise_name: existingSet?.exercise_name || '',
          primaryMuscles: existingSet?.primaryMuscles || [],
        }],
      });
      setAddingSetToExercise(null);
    } catch (error) {
      console.error('Failed to add set:', error);
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!workout) return;

    const exerciseSets = workout.sets.filter(s => s.exercise_id === exerciseId);
    if (!window.confirm(`Remove this exercise and all ${exerciseSets.length} sets?`)) return;

    try {
      // Delete all sets for this exercise
      for (const set of exerciseSets) {
        await setApi.delete(set.id);
      }

      setWorkout({
        ...workout,
        sets: workout.sets.filter(s => s.exercise_id !== exerciseId),
      });
    } catch (error) {
      console.error('Failed to remove exercise:', error);
    }
  };

  const handleAddNewExercise = async (exercise: Exercise) => {
    if (!workout) return;

    const isCardio = exercise.equipment === 'Cardio';

    try {
      const newSet = await setApi.create(workout.id, {
        exerciseId: exercise.id,
        setNumber: 1,
        reps: isCardio ? undefined : WORKOUT_LIMITS.DEFAULT_REPS,
        weight: isCardio ? undefined : WORKOUT_LIMITS.DEFAULT_WEIGHT,
        duration: isCardio ? 30 : undefined,
      });

      setWorkout({
        ...workout,
        sets: [...workout.sets, {
          ...newSet,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          primaryMuscles: exercise.primaryMuscles,
          equipment: exercise.equipment,
        }],
      });
      setShowExerciseSelector(false);
    } catch (error) {
      console.error('Failed to add exercise:', error);
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Workout not found</p>
        <button onClick={() => navigate('/history')} className="btn btn-secondary mt-4">
          Back to History
        </button>
      </div>
    );
  }

  // Group sets by exercise
  const exerciseGroups = workout.sets.reduce((acc, set) => {
    const key = set.exercise_id;
    if (!acc[key]) {
      acc[key] = {
        exerciseId: key,
        exerciseName: set.exercise_name,
        primaryMuscles: set.primaryMuscles,
        sets: [],
      };
    }
    acc[key].sets.push(set);
    return acc;
  }, {} as Record<string, { exerciseId: string; exerciseName: string; primaryMuscles: MuscleGroup[]; sets: typeof workout.sets }>);

  const totalVolume = workout.sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate('/history')} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`btn py-2 px-4 ${isEditMode ? 'btn-success' : 'btn-secondary'}`}
            >
              <Edit2 size={18} />
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          </div>

          {/* Workout Name */}
          <div className="flex items-center justify-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="input py-1 px-3 text-center"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="p-1 text-green-500">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-slate-400">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditedName(workout.name || '');
                  setIsEditingName(true);
                }}
                className="flex items-center gap-2 hover:bg-slate-800 rounded-lg px-3 py-1 transition-colors"
              >
                <span className="font-semibold text-lg">{workout.name || 'Workout'}</span>
                <Edit2 size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          {/* Date and Duration */}
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-slate-400">
            {isEditingDate ? (
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="input py-1 px-2 text-sm"
                  autoFocus
                />
                <button onClick={handleSaveDate} className="p-1 text-green-500">
                  <Check size={16} />
                </button>
                <button onClick={() => setIsEditingDate(false)} className="p-1 text-slate-400">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditedDate(workout.date);
                  setIsEditingDate(true);
                }}
                className="flex items-center gap-1.5 hover:bg-slate-800 rounded px-2 py-1 transition-colors"
              >
                <Calendar size={14} />
                <span>{format(parseISO(workout.date), 'EEEE, MMM d, yyyy')}</span>
                <Edit2 size={12} className="text-slate-500" />
              </button>
            )}
            {isEditingDuration ? (
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <input
                  type="number"
                  value={editedDuration}
                  onChange={(e) => setEditedDuration(Math.max(0, Number(e.target.value) || 0))}
                  className="input py-1 px-2 text-sm w-20 font-mono text-center"
                  placeholder="mins"
                  autoFocus
                  min="0"
                  max="600"
                />
                <span className="text-xs">min</span>
                <button onClick={handleSaveDuration} className="p-1 text-green-500">
                  <Check size={16} />
                </button>
                <button onClick={() => setIsEditingDuration(false)} className="p-1 text-slate-400">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditedDuration(workout.duration || 0);
                  setIsEditingDuration(true);
                }}
                className="flex items-center gap-1.5 hover:bg-slate-800 rounded px-2 py-1 transition-colors"
              >
                <Clock size={14} />
                <span className="font-mono">{formatDuration(workout.duration)}</span>
                <Edit2 size={12} className="text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Summary */}
        <div className="card">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{Object.keys(exerciseGroups).length}</p>
              <p className="text-xs text-slate-400">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{workout.sets.length}</p>
              <p className="text-xs text-slate-400">Sets</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-slate-400">lbs Volume</p>
            </div>
          </div>
        </div>

        {/* Exercises */}
        {Object.entries(exerciseGroups).map(([exerciseId, data]) => {
          const exerciseVolume = data.sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);

          return (
            <div key={exerciseId} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{data.exerciseName}</h3>
                  <p className="text-sm text-blue-400">{data.primaryMuscles.join(', ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-sm text-slate-400">
                    <p>{data.sets.length} sets</p>
                    <p>{exerciseVolume.toLocaleString()} lbs</p>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => handleRemoveExercise(exerciseId)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove exercise"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {data.sets.map((set, index) => (
                  editingSetId === set.id ? (
                    <EditableSetRow
                      key={set.id}
                      set={set}
                      index={index}
                      onSave={(reps, weight) => handleUpdateSet(set.id, reps, weight)}
                      onCancel={() => setEditingSetId(null)}
                      onDelete={() => handleDeleteSet(set.id)}
                    />
                  ) : (
                    <div
                      key={set.id}
                      onClick={() => isEditMode && setEditingSetId(set.id)}
                      className={`flex items-center justify-between p-2 bg-slate-700/50 rounded-lg ${
                        isEditMode ? 'cursor-pointer hover:bg-slate-700' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium">
                          {set.weight} lbs × {set.reps}
                        </span>
                      </div>
                      {isEditMode && (
                        <Edit2 size={16} className="text-slate-500" />
                      )}
                    </div>
                  )
                ))}
              </div>

              {/* Add Set Button */}
              {isEditMode && (
                addingSetToExercise === exerciseId ? (
                  <AddSetForm
                    lastSet={data.sets[data.sets.length - 1]}
                    onAdd={(reps, weight) => handleAddSet(exerciseId, reps, weight)}
                    onCancel={() => setAddingSetToExercise(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingSetToExercise(exerciseId)}
                    className="btn btn-secondary w-full mt-3 py-2"
                  >
                    <Plus size={18} />
                    Add Set
                  </button>
                )
              )}
            </div>
          );
        })}

        {/* Add Exercise Button */}
        {isEditMode && (
          <button
            onClick={() => setShowExerciseSelector(true)}
            className="btn btn-primary w-full py-4 text-lg"
          >
            <Plus size={24} />
            Add Exercise
          </button>
        )}

        {/* Notes */}
        {workout.notes && (
          <div className="card">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-slate-400">{workout.notes}</p>
          </div>
        )}
      </div>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && (
        <ExerciseSelectorModal
          existingExerciseIds={Object.keys(exerciseGroups)}
          onSelect={handleAddNewExercise}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}
    </div>
  );
}

interface EditableSetRowProps {
  set: RawWorkoutSet;
  index: number;
  onSave: (reps: number, weight: number) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function EditableSetRow({ set, index, onSave, onCancel, onDelete }: EditableSetRowProps) {
  const [editReps, setEditReps] = useState(set.reps || 10);
  const [editWeight, setEditWeight] = useState(set.weight || 45);

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold">
          {index + 1}
        </span>
        <input
          type="number"
          value={editWeight}
          onChange={(e) => setEditWeight(Number(e.target.value) || 0)}
          className="w-20 h-10 bg-slate-800 border border-slate-600 rounded text-center font-bold"
        />
        <span className="text-slate-400">lbs ×</span>
        <input
          type="number"
          value={editReps}
          onChange={(e) => setEditReps(Math.max(1, Number(e.target.value) || 1))}
          className="w-16 h-10 bg-slate-800 border border-slate-600 rounded text-center font-bold"
        />
        <span className="text-slate-400">reps</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(editReps, editWeight)}
          className="btn btn-success flex-1 py-2"
        >
          <Check size={16} />
          Save
        </button>
        <button onClick={onCancel} className="btn btn-secondary py-2 px-3">
          <X size={16} />
        </button>
        <button onClick={onDelete} className="btn btn-danger py-2 px-3">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

interface AddSetFormProps {
  lastSet?: RawWorkoutSet;
  onAdd: (reps: number, weight: number) => void;
  onCancel: () => void;
}

function AddSetForm({ lastSet, onAdd, onCancel }: AddSetFormProps) {
  const [reps, setReps] = useState(lastSet?.reps || WORKOUT_LIMITS.DEFAULT_REPS);
  const [weight, setWeight] = useState(lastSet?.weight || WORKOUT_LIMITS.DEFAULT_WEIGHT);

  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-3">
      <p className="text-sm text-green-400 mb-2">Add new set</p>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value) || 0)}
          className="w-20 h-10 bg-slate-800 border border-slate-600 rounded text-center font-bold"
          placeholder="Weight"
        />
        <span className="text-slate-400">lbs ×</span>
        <input
          type="number"
          value={reps}
          onChange={(e) => setReps(Math.max(1, Number(e.target.value) || 1))}
          className="w-16 h-10 bg-slate-800 border border-slate-600 rounded text-center font-bold"
          placeholder="Reps"
        />
        <span className="text-slate-400">reps</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAdd(reps, weight)}
          className="btn btn-success flex-1 py-2"
        >
          <Plus size={16} />
          Add
        </button>
        <button onClick={onCancel} className="btn btn-secondary py-2 px-3">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

interface ExerciseSelectorModalProps {
  existingExerciseIds: string[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

function ExerciseSelectorModal({ existingExerciseIds, onSelect, onClose }: ExerciseSelectorModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const loadExercises = useCallback(async () => {
    try {
      const data = await exerciseApi.list({ search: search || undefined });
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
      <div className="bg-slate-900 flex-1 flex flex-col max-h-screen">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Add Exercise</h2>
            <button onClick={onClose} className="p-2">
              <X size={24} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full !pl-12"
            />
          </div>
        </div>

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
                const isAdded = existingExerciseIds.includes(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    onClick={() => !isAdded && onSelect(exercise)}
                    disabled={isAdded}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      isAdded
                        ? 'bg-slate-800/50 opacity-50 cursor-not-allowed'
                        : 'bg-slate-800 hover:bg-slate-700'
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
                    {isAdded && <p className="text-xs text-slate-500 mt-1">Already added</p>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create Custom Exercise Button */}
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
            onSelect(exercise);
          }}
        />
      )}
    </div>
  );
}
