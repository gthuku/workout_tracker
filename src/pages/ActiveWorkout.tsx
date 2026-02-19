import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, X, ChevronLeft, Save, Trash2, Trophy, Clock, Edit2, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWorkoutStore } from '../store/workoutStore';
import { ExerciseSelector } from '../components/ExerciseSelector';
import { RestTimer } from '../components/RestTimer';
import type { WorkoutSet, Equipment, MuscleGroup } from '../types';
import { WORKOUT_LIMITS } from '../constants/workout';

export function ActiveWorkout() {
  const navigate = useNavigate();
  const {
    activeWorkout,
    workoutExercises,
    workoutStartTime,
    workoutElapsedSeconds,
    isLoading,
    resumeWorkout,
    addSet,
    updateSet,
    deleteSet,
    completeWorkout,
    discardWorkout,
    updateWorkoutName,
    updateWorkoutTimer,
    error,
  } = useWorkoutStore();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  // Timer state is now managed in the store for persistence across page navigation

  // Generate auto workout name based on day, time, and muscles
  const generateWorkoutName = useCallback(() => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[now.getDay()];

    const hour = now.getHours();
    let timeOfDay = 'Morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';
    else if (hour >= 21 || hour < 5) timeOfDay = 'Night';

    // Get unique muscle groups from exercises
    const muscles = new Set<string>();
    workoutExercises.forEach((we) => {
      we.exercise.primaryMuscles.forEach((m) => muscles.add(m));
    });

    const muscleList = Array.from(muscles).slice(0, 2);
    const muscleStr = muscleList.length > 0 ? muscleList.join('/') + ' ' : '';

    return `${day} ${timeOfDay} ${muscleStr}Workout`;
  }, [workoutExercises]);

  // Timer effect - starts at 0 and counts up
  useEffect(() => {
    if (!workoutStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000);
      updateWorkoutTimer(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [workoutStartTime, updateWorkoutTimer]);

  // Ensure direct navigation to /workout (e.g. from notification click)
  // rehydrates the active session from the API.
  useEffect(() => {
    if (activeWorkout) return;
    void resumeWorkout();
  }, [activeWorkout, resumeWorkout]);

  // No longer auto-start - workout must be started from Dashboard

  // Format time as HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Use timer from store
  const elapsedSeconds = workoutElapsedSeconds;

  const handleComplete = async () => {
    const finalName = activeWorkout?.name || generateWorkoutName();
    // Ensure duration is at least 1 minute to pass validation
    const duration = Math.max(1, Math.floor(elapsedSeconds / 60));
    await completeWorkout(notes, finalName, duration);
    // Only navigate if no error
    if (!useWorkoutStore.getState().error) {
      navigate('/');
    }
  };

  const handleDiscard = async () => {
    if (window.confirm('Discard this workout? All data will be lost.')) {
      await discardWorkout();
      navigate('/');
    }
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateWorkoutName(editedName.trim());
    }
    setIsEditingName(false);
  };

  const triggerPRCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#d97706'],
    });
  };

  const displayName = activeWorkout?.name || generateWorkoutName();

  if (isLoading && !activeWorkout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!activeWorkout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="card text-center max-w-md">
          <h2 className="text-xl font-bold mb-4">No Active Workout</h2>
          <p className="text-slate-400 mb-6">
            Start a workout from the home screen to begin tracking your exercises.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary w-full py-3"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate('/')} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => setShowCompleteModal(true)}
              className="btn btn-success py-2 px-4"
            >
              <Check size={20} />
              Finish
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
                  setEditedName(displayName);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-2 hover:bg-slate-800 rounded-lg px-3 py-1 transition-colors"
              >
                <span className="font-semibold text-lg">{displayName}</span>
                <Edit2 size={14} className="text-slate-400" />
              </button>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mt-2 text-blue-400">
            <Clock size={18} />
            <span className="font-mono text-xl font-bold">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <div className="mt-0.5">⚠️</div>
            <span>{error}</span>
          </div>
        )}

        {/* Add Exercise Button - at top */}
        <button
          onClick={() => setShowExerciseSelector(true)}
          className="btn btn-primary w-full py-4 text-lg"
        >
          <Plus size={24} />
          Add Exercise
        </button>

        {/* Exercises - newest first */}
        {[...workoutExercises].reverse().map((we) => (
          <ExerciseCard
            key={we.exercise.id}
            exerciseName={we.exercise.name}
            muscleGroups={we.exercise.primaryMuscles}
            equipment={we.exercise.equipment}
            sets={we.sets}
            previousSets={we.previousSets}
            onAddSet={async (reps, weight, duration) => {
              const { isNewPR } = await addSet(we.exercise.id, reps, weight, duration);
              if (isNewPR) {
                triggerPRCelebration();
              }
              // Auto-start rest timer after logging a set
              setShowRestTimer(true);
            }}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onStartRestTimer={(seconds) => {
              setRestTimerDuration(seconds);
              setShowRestTimer(true);
            }}
          />
        ))}

        {/* Empty State */}
        {workoutExercises.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">No exercises added yet</p>
            <p className="text-sm mt-1">Tap "Add Exercise" to get started</p>
          </div>
        )}
      </div>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && (
        <ExerciseSelector onClose={() => setShowExerciseSelector(false)} />
      )}

      {/* Rest Timer Modal */}
      <RestTimer
        isVisible={showRestTimer}
        onClose={() => setShowRestTimer(false)}
        defaultSeconds={restTimerDuration}
      />

      {/* Complete Workout Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Complete Workout</h2>

            <div className="space-y-4">
              {/* Workout Summary */}
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="font-medium text-lg mb-2">{displayName}</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{formatTime(elapsedSeconds)}</p>
                    <p className="text-xs text-slate-400">Duration</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{workoutExercises.length}</p>
                    <p className="text-xs text-slate-400">Exercises</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {workoutExercises.reduce((acc, we) => acc + we.sets.length, 0)}
                    </p>
                    <p className="text-xs text-slate-400">Sets</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did it go?"
                  className="input w-full h-20 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button onClick={handleComplete} className="btn btn-success flex-1">
                  <Save size={20} />
                  Save Workout
                </button>
              </div>

              <button
                onClick={handleDiscard}
                className="btn btn-danger w-full"
              >
                <Trash2 size={20} />
                Discard Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExerciseCardProps {
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment;
  sets: WorkoutSet[];
  previousSets: WorkoutSet[];
  onAddSet: (reps: number, weight: number, duration?: number) => void;
  onUpdateSet: (setId: string, reps: number, weight: number, duration?: number) => void;
  onDeleteSet: (setId: string) => void;
  onStartRestTimer: (seconds: number) => void;
}

function ExerciseCard({
  exerciseName,
  muscleGroups,
  equipment,
  sets,
  previousSets,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onStartRestTimer,
}: ExerciseCardProps) {
  const isCardio = equipment === 'Cardio';

  const [weight, setWeight] = useState(previousSets[0]?.weight || WORKOUT_LIMITS.DEFAULT_WEIGHT);
  const [reps, setReps] = useState(previousSets[0]?.reps || WORKOUT_LIMITS.DEFAULT_REPS);
  const [duration, setDuration] = useState(previousSets[0]?.duration || 30); // Default 30 minutes
  const [editingSet, setEditingSet] = useState<string | null>(null);

  const totalVolume = isCardio
    ? sets.reduce((acc, s) => acc + (s.duration || 0), 0)
    : sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);
  const previousVolume = isCardio
    ? previousSets.reduce((acc, s) => acc + (s.duration || 0), 0)
    : previousSets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0);

  const handleAddSet = () => {
    if (isCardio) {
      onAddSet(1, 0, duration); // For cardio, reps=1, weight=0, use duration
    } else {
      onAddSet(reps, weight);
    }
    // Default rest timer for strength sets (90s)
    if (!isCardio) {
      onStartRestTimer(90);
    }
  };

  const matchesPrevious = (set: WorkoutSet, index: number) => {
    const prev = previousSets[index];
    if (!prev) return null;
    if (isCardio) {
      return (set.duration || 0) >= (prev.duration || 0);
    }
    return (set.reps || 0) >= (prev.reps || 0) && (set.weight || 0) >= (prev.weight || 0);
  };

  return (
    <div className="card">
      {/* Exercise Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{exerciseName}</h3>
          <p className="text-sm text-blue-400">{muscleGroups.join(', ')}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => onStartRestTimer(90)}
            className="text-xs flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
          >
            <Timer size={14} />
            Rest
          </button>

          {previousSets.length > 0 && (
            <div className="text-right text-xs text-slate-500">
              <span className="block mb-0.5">Previous best</span>
              <span className="font-medium text-slate-400">
                {isCardio
                  ? `${Math.max(...previousSets.map(s => s.duration || 0))} min`
                  : `${Math.max(...previousSets.map(s => s.weight || 0))} lbs`
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Set Input - Improved Layout with Dropdowns */}
      <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {isCardio ? (
            /* Duration Input for Cardio */
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-2 text-center">DURATION (minutes)</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDuration(Math.max(1, duration - 1))}
                  className="w-10 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg text-xl font-bold active:scale-95 transition-transform flex-shrink-0"
                >
                  -
                </button>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="flex-1 h-12 bg-slate-800 border-2 border-slate-600 rounded-lg text-center text-lg font-bold focus:border-blue-500 outline-none px-2 min-w-0"
                  min="1"
                  max="300"
                />
                <button
                  onClick={() => setDuration(Math.min(300, duration + 1))}
                  className="w-10 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg text-xl font-bold active:scale-95 transition-transform flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Weight Input */}
              <div>
                <label className="block text-xs text-slate-400 mb-2 text-center">WEIGHT (lbs)</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWeight(Math.max(0, weight - 1))}
                    className="w-10 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg text-xl font-bold active:scale-95 transition-transform flex-shrink-0"
                  >
                    -
                  </button>
                  <select
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="flex-1 h-12 bg-slate-800 border-2 border-slate-600 rounded-lg text-center text-lg font-bold focus:border-blue-500 outline-none appearance-none px-2 min-w-0"
                  >
                    {Array.from({ length: WORKOUT_LIMITS.MAX_WEIGHT + 1 }, (_, i) => i).map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setWeight(Math.min(WORKOUT_LIMITS.MAX_WEIGHT, weight + 1))}
                    className="w-10 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg text-xl font-bold active:scale-95 transition-transform flex-shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reps Input */}
              <div>
                <label className="block text-xs text-slate-400 mb-2 text-center">REPS</label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setReps(Math.max(1, reps - 1))}
                    className="w-10 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg text-xl font-bold active:scale-95 transition-transform flex-shrink-0"
                  >
                    -
                  </button>
                  <select
                    value={reps}
                    onChange={(e) => setReps(Number(e.target.value))}
                    className="flex-1 h-12 bg-slate-800 border-2 border-slate-600 rounded-lg text-center text-lg font-bold focus:border-blue-500 outline-none appearance-none px-2 min-w-0"
                  >
                    {Array.from({ length: WORKOUT_LIMITS.MAX_REPS }, (_, i) => i + 1).map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setReps(Math.min(WORKOUT_LIMITS.MAX_REPS, reps + 1))}
                    className="w-10 h-12 bg-slate-600 hover:bg-slate-500 rounded-lg text-xl font-bold active:scale-95 transition-transform flex-shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleAddSet}
          className="btn btn-primary w-full py-3 text-lg font-bold"
        >
          <Plus size={20} />
          Log Set
        </button>
      </div>

      {/* Logged Sets */}
      {sets.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Logged Sets</p>
          {sets.map((set, index) => {
            const isEditing = editingSet === set.id;
            const matched = matchesPrevious(set, index);

            if (isEditing && !isCardio) {
              return (
                <EditableSetRow
                  key={set.id}
                  set={set}
                  onSave={(newReps, newWeight) => {
                    onUpdateSet(set.id, newReps, newWeight);
                    setEditingSet(null);
                  }}
                  onCancel={() => setEditingSet(null)}
                  onDelete={() => {
                    onDeleteSet(set.id);
                    setEditingSet(null);
                  }}
                />
              );
            }

            return (
              <div
                key={set.id}
                onClick={() => !isCardio && setEditingSet(set.id)}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isCardio
                  ? 'bg-slate-700/50'
                  : matched === true
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-slate-700/50 hover:bg-slate-700 cursor-pointer'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium text-lg">
                    {isCardio
                      ? `${set.duration} min`
                      : `${set.weight} lbs × ${set.reps}`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {matched === true && (
                    <Check className="text-green-500" size={20} />
                  )}
                  {matched === true && (
                    isCardio
                      ? (set.duration || 0) > (previousSets[index]?.duration || 0)
                      : (set.weight || 0) > (previousSets[index]?.weight || 0)
                  ) && (
                      <span className="pr-badge">
                        <Trophy size={12} />
                        PR
                      </span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Previous Session Reference */}
      {previousSets.length > 0 && (
        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500 mb-2">Previous session:</p>
          <div className="flex flex-wrap gap-2">
            {previousSets.map((set, i) => (
              <span key={i} className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                {set.weight}×{set.reps}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Volume Summary */}
      {sets.length > 0 && (
        <div className="flex justify-between text-sm mt-3 pt-3 border-t border-slate-700">
          <span className="text-slate-400">Total Volume</span>
          <span className="font-medium">
            {totalVolume.toLocaleString()} lbs
            {previousVolume > 0 && (
              <span
                className={`ml-2 ${totalVolume > previousVolume
                  ? 'text-green-500'
                  : totalVolume < previousVolume
                    ? 'text-red-500'
                    : 'text-yellow-500'
                  }`}
              >
                ({totalVolume >= previousVolume ? '+' : ''}
                {Math.round(((totalVolume - previousVolume) / previousVolume) * 100)}%)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

interface EditableSetRowProps {
  set: WorkoutSet;
  onSave: (reps: number, weight: number) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function EditableSetRow({ set, onSave, onCancel, onDelete }: EditableSetRowProps) {
  const [editReps, setEditReps] = useState(set.reps || WORKOUT_LIMITS.DEFAULT_REPS);
  const [editWeight, setEditWeight] = useState(set.weight || WORKOUT_LIMITS.DEFAULT_WEIGHT);

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
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
          onClick={() => onSave(editReps || WORKOUT_LIMITS.DEFAULT_REPS, editWeight || WORKOUT_LIMITS.DEFAULT_WEIGHT)}
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
