import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Plus, Minus, Volume2, VolumeX } from 'lucide-react';
import { pushApi } from '../api/client';

interface RestTimerProps {
  isVisible: boolean;
  onClose: () => void;
  defaultSeconds?: number;
}

interface PersistedRestTimerState {
  initialTime: number;
  timeRemaining: number;
  isRunning: boolean;
  endAt: number | null;
  soundEnabled: boolean;
}

const REST_TIMER_STORAGE_KEY = 'rest_timer_state_v1';
const VAPID_PUBLIC_KEY_STORAGE_KEY = 'workout_push_vapid_public_key';

// Preset rest times in seconds
const REST_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

function loadPersistedState(): PersistedRestTimerState | null {
  try {
    const raw = localStorage.getItem(REST_TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRestTimerState;
    if (
      typeof parsed.initialTime !== 'number' ||
      typeof parsed.timeRemaining !== 'number' ||
      typeof parsed.isRunning !== 'boolean' ||
      !(typeof parsed.endAt === 'number' || parsed.endAt === null) ||
      typeof parsed.soundEnabled !== 'boolean'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedState(state: PersistedRestTimerState): void {
  try {
    localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore write failures.
  }
}

function clearPersistedState(): void {
  try {
    localStorage.removeItem(REST_TIMER_STORAGE_KEY);
  } catch {
    // Ignore clear failures.
  }
}

function getRemainingSeconds(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const normalized = base64String.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const base64 = normalized + padding;
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function createTimerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function RestTimer({ isVisible, onClose, defaultSeconds = 90 }: RestTimerProps) {
  const pushSupported =
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  const [persistedState] = useState<PersistedRestTimerState | null>(() => loadPersistedState());
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (persistedState?.isRunning && persistedState.endAt) {
      return getRemainingSeconds(persistedState.endAt);
    }
    return persistedState?.timeRemaining ?? defaultSeconds;
  });
  const [initialTime, setInitialTime] = useState(() => persistedState?.initialTime ?? defaultSeconds);
  const [isRunning, setIsRunning] = useState(() => {
    if (persistedState?.isRunning && persistedState.endAt) {
      return getRemainingSeconds(persistedState.endAt) > 0;
    }
    return persistedState?.isRunning ?? false;
  });
  const [endAt, setEndAt] = useState<number | null>(() => {
    if (persistedState?.isRunning && persistedState.endAt) {
      return getRemainingSeconds(persistedState.endAt) > 0 ? persistedState.endAt : null;
    }
    return null;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => persistedState?.soundEnabled ?? true);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => (
    pushSupported ? Notification.permission : 'default'
  ));
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activePushTimerId, setActivePushTimerId] = useState<string | null>(null);

  const wasVisibleRef = useRef(false);
  const completionHandledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pushPublicKeyRef = useRef<string | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playBeep = useCallback((frequency = 800, duration = 200, volume = 0.3) => {
    if (!soundEnabled) return;

    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.value = volume;

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch {
      // Audio may be blocked by platform policy.
    }
  }, [soundEnabled, getAudioContext]);

  const playCompletionSound = useCallback(() => {
    if (!soundEnabled) return;

    playBeep(1000, 150, 0.4);
    setTimeout(() => playBeep(1000, 150, 0.4), 200);
    setTimeout(() => playBeep(1200, 300, 0.5), 400);

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  }, [soundEnabled, playBeep]);

  const startTimer = useCallback((seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    setInitialTime(safeSeconds);
    setTimeRemaining(safeSeconds);
    setIsRunning(safeSeconds > 0);
    setEndAt(safeSeconds > 0 ? Date.now() + safeSeconds * 1000 : null);
    completionHandledRef.current = false;
  }, []);

  const pauseTimer = useCallback(() => {
    if (isRunning && endAt) {
      setTimeRemaining(getRemainingSeconds(endAt));
    }
    setIsRunning(false);
    setEndAt(null);
  }, [isRunning, endAt]);

  const cancelPushNotification = useCallback(async () => {
    if (!activePushTimerId) return;

    const timerId = activePushTimerId;
    setActivePushTimerId(null);
    try {
      await pushApi.cancelRestTimerNotification(timerId);
    } catch (error) {
      console.warn('Failed to cancel push timer notification:', error);
    }
  }, [activePushTimerId]);

  const loadPushConfig = useCallback(async () => {
    if (!pushSupported) return { enabled: false, publicKey: null as string | null };

    try {
      const config = await pushApi.getPublicKey();
      pushPublicKeyRef.current = config.publicKey;
      return config;
    } catch (error) {
      console.warn('Failed to fetch push config:', error);
      pushPublicKeyRef.current = null;
      return { enabled: false, publicKey: null as string | null };
    }
  }, [pushSupported]);

  const ensurePushSubscription = useCallback(async (shouldPromptPermission: boolean) => {
    if (!pushSupported) return false;

    const cachedConfig = pushPublicKeyRef.current
      ? { enabled: pushConfigured, publicKey: pushPublicKeyRef.current }
      : await loadPushConfig();

    if (!cachedConfig.enabled || !cachedConfig.publicKey) {
      return false;
    }

    let permission: NotificationPermission = Notification.permission;
    setPushPermission(permission);

    if (permission !== 'granted') {
      if (!shouldPromptPermission) return false;
      permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      const storedPublicKey = localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE_KEY);
      if (subscription && storedPublicKey && storedPublicKey !== cachedConfig.publicKey) {
        await pushApi.removeSubscription(subscription.endpoint).catch(() => {
          // Ignore stale-subscription cleanup failures.
        });
        await subscription.unsubscribe().catch(() => {
          // Ignore stale local subscription cleanup failures.
        });
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cachedConfig.publicKey),
        });
      }

      await pushApi.saveSubscription(subscription.toJSON());
      localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE_KEY, cachedConfig.publicKey);
      setPushEnabled(true);
      return true;
    } catch (error) {
      console.warn('Failed to establish push subscription:', error);
      setPushEnabled(false);
      return false;
    }
  }, [loadPushConfig, pushConfigured, pushSupported]);

  useEffect(() => {
    if (!isVisible || !pushSupported) return;

    let cancelled = false;
    loadPushConfig()
      .then((config) => {
        if (!cancelled) {
          setPushConfigured(Boolean(config.enabled && config.publicKey));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPushConfigured(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, pushSupported, loadPushConfig]);

  useEffect(() => {
    if (!isVisible || !pushSupported) return;
    if (Notification.permission !== 'granted') {
      const timeoutId = window.setTimeout(() => setPushEnabled(false), 0);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (cancelled) return;
        if (!subscription) {
          setPushEnabled(false);
          return;
        }
        setPushEnabled(true);
        await pushApi.saveSubscription(subscription.toJSON()).catch(() => {
          // Ignore background sync failures.
        });
      })
      .catch(() => {
        if (!cancelled) setPushEnabled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, pushSupported, pushPermission]);

  // Persist state whenever timer changes.
  useEffect(() => {
    savePersistedState({
      initialTime,
      timeRemaining,
      isRunning,
      endAt,
      soundEnabled,
    });
  }, [initialTime, timeRemaining, isRunning, endAt, soundEnabled]);

  // Keep timer accurate from wall-clock time.
  useEffect(() => {
    if (!isRunning || !endAt) return;

    const tick = () => {
      const remaining = getRemainingSeconds(endAt);

      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsRunning(false);
        setEndAt(null);
        if (!completionHandledRef.current) {
          completionHandledRef.current = true;
          playCompletionSound();
        }
        return;
      }

      if (remaining <= 3) {
        playBeep(600, 100, 0.2);
      }

      setTimeRemaining(remaining);
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isRunning, endAt, playBeep, playCompletionSound]);

  // Re-sync timer immediately when app/tab becomes visible again.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && endAt) {
        setTimeRemaining(getRemainingSeconds(endAt));
      }
    };

    const onPageShow = () => {
      if (isRunning && endAt) {
        setTimeRemaining(getRemainingSeconds(endAt));
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [isRunning, endAt]);

  // Open/close behavior from parent modal visibility.
  useEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      const timeoutId = window.setTimeout(() => {
        startTimer(defaultSeconds);
      }, 0);
      wasVisibleRef.current = isVisible;
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (!isVisible && wasVisibleRef.current) {
      const timeoutId = window.setTimeout(() => {
        pauseTimer();
        void cancelPushNotification();
      }, 0);
      wasVisibleRef.current = isVisible;
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    wasVisibleRef.current = isVisible;
  }, [isVisible, defaultSeconds, startTimer, pauseTimer, cancelPushNotification]);

  // Keep server-side rest notifications in sync for background push alerts.
  useEffect(() => {
    if (!isVisible || !pushSupported || !pushConfigured) return;

    let cancelled = false;

    const syncTimerNotification = async () => {
      if (!isRunning || !endAt) {
        if (activePushTimerId) {
          const timerId = activePushTimerId;
          setActivePushTimerId(null);
          await pushApi.cancelRestTimerNotification(timerId).catch((error) => {
            console.warn('Failed to cancel push timer notification:', error);
          });
        }
        return;
      }

      const canPush = await ensurePushSubscription(false);
      if (!canPush) return;

      const timerId = activePushTimerId || createTimerId();
      await pushApi.scheduleRestTimerNotification({
        timerId,
        dueAt: endAt,
        title: 'Rest Complete',
        body: 'Time for your next set.',
      }).catch((error) => {
        console.warn('Failed to schedule push timer notification:', error);
      });

      if (!cancelled) {
        setActivePushTimerId(timerId);
      }
    };

    void syncTimerNotification();
    return () => {
      cancelled = true;
    };
  }, [
    isVisible,
    pushSupported,
    pushConfigured,
    isRunning,
    endAt,
    activePushTimerId,
    ensurePushSubscription,
  ]);

  const handleReset = () => {
    setTimeRemaining(initialTime);
    setIsRunning(false);
    setEndAt(null);
    completionHandledRef.current = false;
    void cancelPushNotification();
  };

  const handleToggle = () => {
    if (isRunning) {
      pauseTimer();
      return;
    }

    if (timeRemaining <= 0) {
      startTimer(initialTime);
      return;
    }

    setIsRunning(true);
    setEndAt(Date.now() + timeRemaining * 1000);
    completionHandledRef.current = false;
  };

  const handlePreset = (seconds: number) => {
    startTimer(seconds);
  };

  const handleAdjustTime = (delta: number) => {
    const baseRemaining = isRunning && endAt ? getRemainingSeconds(endAt) : timeRemaining;
    const newTime = Math.max(0, baseRemaining + delta);
    setTimeRemaining(newTime);
    if (isRunning) {
      setEndAt(newTime > 0 ? Date.now() + newTime * 1000 : null);
      if (newTime <= 0) {
        setIsRunning(false);
      }
    }
    completionHandledRef.current = newTime <= 0;
  };

  const handleClose = () => {
    pauseTimer();
    void cancelPushNotification();
    clearPersistedState();
    onClose();
  };

  const handleEnablePush = async () => {
    const enabled = await ensurePushSubscription(true);
    if (enabled) {
      setPushEnabled(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = initialTime > 0 ? ((initialTime - timeRemaining) / initialTime) * 100 : 0;
  const isComplete = timeRemaining === 0 && !isRunning;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-sm rounded-2xl p-6 transition-colors ${isComplete ? 'bg-green-900/90' : 'bg-slate-800'
          }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isComplete ? '🎉 Rest Complete!' : 'Rest Timer'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-slate-500" />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="relative w-48 h-48 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                strokeLinecap="round"
                className={`transition-all duration-300 ${isComplete ? 'text-green-500' : timeRemaining <= 10 ? 'text-orange-500' : 'text-blue-500'
                  }`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-mono font-bold ${isComplete ? 'text-green-400' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
              <span className="text-sm text-slate-400 mt-1">
                {isRunning ? 'Resting...' : isComplete ? 'Ready!' : 'Paused'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => handleAdjustTime(-15)}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Minus size={16} />
            <span className="text-sm">15s</span>
          </button>
          <button
            onClick={handleToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isRunning
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-blue-500 hover:bg-blue-600'
              }`}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          <button
            onClick={() => handleAdjustTime(15)}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm">15s</span>
          </button>
        </div>

        <div className="grid grid-cols-6 gap-2 mb-4">
          {REST_PRESETS.map((preset) => (
            <button
              key={preset.seconds}
              onClick={() => handlePreset(preset.seconds)}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${initialTime === preset.seconds
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {pushSupported && (
          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs">
            {pushEnabled ? (
              <p className="text-green-400">Background push alerts are enabled for this timer.</p>
            ) : pushPermission === 'denied' ? (
              <p className="text-orange-300">
                Push alerts are blocked. Enable notifications for this app in iPhone Settings.
              </p>
            ) : pushConfigured ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300">Enable push alerts so rest completion notifies you in background.</span>
                <button
                  onClick={handleEnablePush}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  Enable
                </button>
              </div>
            ) : (
              <p className="text-slate-500">Push notifications are not configured on this environment yet.</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 btn btn-secondary py-3 flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Reset
          </button>
          <button
            onClick={handleClose}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${isComplete
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600'
              }`}
          >
            {isComplete ? 'Done!' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RestTimer;
