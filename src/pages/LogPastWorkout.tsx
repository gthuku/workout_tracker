import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X, Trash2, Save, Calendar, Clock } from 'lucide-react';
import { workoutApi, setApi, exerciseApi } from '../api/client';
import { CustomExerciseForm } from '../components/CustomExerciseForm';
import type { Exercise } from '../types';
import { WORKOUT_LIMITS } from '../constants/workout';

interface PastWorkoutSet {
  reps?: number;
  weight?: number;
  duration?: number;
  id?: string;
}

interface PastWorkoutExercise {
  exercise: Exercise;
  sets: PastWorkoutSet[];
}

export function LogPastWorkout() {
  const navigate = useNavigate();
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [duration, setDuration] = useState(60);
  const [exercises, setExercises] = useState<PastWorkoutExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddExercise = async (exercise: Exercise) => {
    // Check if already added
    if (exercises.some(e => e.exercise.id === exercise.id)) return;

    const isCardio = exercise.equipment === 'Cardio';
    const initialSet = isCardio
      ? { duration: 30 } // Default 30 minutes for cardio
      : { reps: WORKOUT_LIMITS.DEFAULT_REPS, weight: WORKOUT_LIMITS.DEFAULT_WEIGHT };

    setExercises([
      { exercise, sets: [initialSet] },
      ...exercises,
    ]);
    setShowExerciseSelector(false);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...exercises];
    const exercise = updated[exerciseIndex].exercise;
    const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
    const isCardio = exercise.equipment === 'Cardio';

    const newSet = isCardio
      ? { duration: lastSet?.duration || 30 }
      : { reps: lastSet?.reps || WORKOUT_LIMITS.DEFAULT_REPS, weight: lastSet?.weight || WORKOUT_LIMITS.DEFAULT_WEIGHT };

    updated[exerciseIndex].sets.push(newSet);
    setExercises(updated);
  };

  const handleUpdateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight' | 'duration', value: number) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updated);
  };

  const handleDeleteSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets.splice(setIndex, 1);
    if (updated[exerciseIndex].sets.length === 0) {
      updated.splice(exerciseIndex, 1);
    }
    setExercises(updated);
  };

  const handleDeleteExercise = (exerciseIndex: number) => {
    const updated = [...exercises];
    updated.splice(exerciseIndex, 1);
    setExercises(updated);
  };

  const handleSave = async () => {
    if (exercises.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    setSaving(true);
    try {
      // Create the workout first
      const workout = await workoutApi.create({
        name: workoutName || generateWorkoutName(),
        date: workoutDate,
        duration,
        isComplete: true,
      });

      // Save all sets to the database
      for (const exercise of exercises) {
        const isCardio = exercise.exercise.equipment === 'Cardio';
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          await setApi.create(workout.id, {
            exerciseId: exercise.exercise.id,
            setNumber: i + 1,
            reps: isCardio ? undefined : set.reps,
            weight: isCardio ? undefined : set.weight,
            duration: isCardio ? set.duration : undefined,
          });
        }
      }

      navigate('/history');
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (exercises.length > 0 && !window.confirm('Discard this workout?')) return;
    navigate('/');
  };

  const generateWorkoutName = () => {
    const muscles = new Set<string>();
    exercises.forEach(e => {
      e.exercise.primaryMuscles.forEach(m => muscles.add(m));
    });
    const muscleList = Array.from(muscles).slice(0, 2);
    const muscleStr = muscleList.length > 0 ? muscleList.join('/') + ' ' : '';
    return `${muscleStr}Workout`;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleDiscard} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Log Past Workout</h1>
            <button
              onClick={handleSave}
              disabled={saving || exercises.length === 0}
              className="btn btn-success py-2 px-4"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Workout Details Card */}
        <div className="card space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Workout Name</label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="e.g., Chest Day"
              className="input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                <Clock size={14} className="inline mr-1" />
                Duration (min)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="input w-full"
              >
                {Array.from({ length: 24 }, (_, i) => (i + 1) * 5).map(val => (
                  <option key={val} value={val}>{val} min</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowExerciseSelector(true)}
          className="btn btn-primary w-full py-4 text-lg"
        >
          <Plus size={24} />
          Add Exercise
        </button>

        {/* Exercises */}
        {exercises.map((exerciseData, exerciseIndex) => (
          <div key={exerciseData.exercise.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{exerciseData.exercise.name}</h3>
                <p className="text-sm text-blue-400">
                  {exerciseData.exercise.primaryMuscles.join(', ')}
                </p>
              </div>
              <button
                onClick={() => handleDeleteExercise(exerciseIndex)}
                className="p-2 text-slate-400 hover:text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Sets */}
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 px-2">
                <div className="col-span-2">SET</div>
                {exerciseData.exercise.equipment === 'Cardio' ? (
                  <div className="col-span-8 text-center">DURATION (minutes)</div>
                ) : (
                  <>
                    <div className="col-span-4 text-center">WEIGHT (lbs)</div>
                    <div className="col-span-4 text-center">REPS</div>
                  </>
                )}
                <div className="col-span-2"></div>
              </div>

              {exerciseData.sets.map((set, setIndex) => {
                const isCardio = exerciseData.exercise.equipment === 'Cardio';

                return (
                  <div key={setIndex} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2">
                      <span className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {setIndex + 1}
                      </span>
                    </div>
                    {isCardio ? (
                      <div className="col-span-8">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={set.duration || 30}
                            onChange={(e) => handleUpdateSet(exerciseIndex, setIndex, 'duration', Number(e.target.value))}
                            className="flex-1 h-10 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm font-bold focus:border-blue-500 outline-none"
                            min="1"
                            max="300"
                          />
                          <span className="text-slate-400 text-sm">min</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="col-span-4">
                          <select
                            value={set.weight || 0}
                            onChange={(e) => handleUpdateSet(exerciseIndex, setIndex, 'weight', Number(e.target.value))}
                            className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm font-bold focus:border-blue-500 outline-none"
                          >
                            {Array.from({ length: WORKOUT_LIMITS.MAX_WEIGHT + 1 }, (_, i) => i).map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <select
                            value={set.reps || 1}
                            onChange={(e) => handleUpdateSet(exerciseIndex, setIndex, 'reps', Number(e.target.value))}
                            className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm font-bold focus:border-blue-500 outline-none"
                          >
                            {Array.from({ length: WORKOUT_LIMITS.MAX_REPS }, (_, i) => i + 1).map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => handleDeleteSet(exerciseIndex, setIndex)}
                        className="p-2 text-slate-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => handleAddSet(exerciseIndex)}
              className="btn btn-secondary w-full py-2"
            >
              <Plus size={18} />
              Add Set
            </button>
          </div>
        ))}

        {/* Empty State */}
        {exercises.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">No exercises added yet</p>
            <p className="text-sm mt-1">Tap "Add Exercise" to get started</p>
          </div>
        )}
      </div>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && (
        <ExerciseSelectorWrapper
          onSelect={handleAddExercise}
          onClose={() => setShowExerciseSelector(false)}
          existingExerciseIds={exercises.map(e => e.exercise.id)}
        />
      )}
    </div>
  );
}

// Wrapper component to use ExerciseSelector for past workouts
function ExerciseSelectorWrapper({
  onSelect,
  onClose,
  existingExerciseIds,
}: {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  existingExerciseIds: string[];
}) {
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
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full"
          />
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
                    <p className="font-medium">{exercise.name}</p>
                    <p className="text-sm text-blue-400">
                      {exercise.primaryMuscles.join(', ')}
                    </p>
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
