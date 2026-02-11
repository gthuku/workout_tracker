import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Plus, Minus, Volume2, VolumeX } from 'lucide-react';

interface RestTimerProps {
    isVisible: boolean;
    onClose: () => void;
    defaultSeconds?: number;
}

// Preset rest times in seconds
const REST_PRESETS = [
    { label: '30s', seconds: 30 },
    { label: '60s', seconds: 60 },
    { label: '90s', seconds: 90 },
    { label: '2m', seconds: 120 },
    { label: '3m', seconds: 180 },
    { label: '5m', seconds: 300 },
];

export function RestTimer({ isVisible, onClose, defaultSeconds = 90 }: RestTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState(defaultSeconds);
    const [initialTime, setInitialTime] = useState(defaultSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Create audio context for beep sounds
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // Play beep sound
    const playBeep = useCallback((frequency: number = 800, duration: number = 200, volume: number = 0.3) => {
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
            // Audio not supported
        }
    }, [soundEnabled, getAudioContext]);

    // Play completion sound (3 beeps)
    const playCompletionSound = useCallback(() => {
        if (!soundEnabled) return;

        playBeep(1000, 150, 0.4);
        setTimeout(() => playBeep(1000, 150, 0.4), 200);
        setTimeout(() => playBeep(1200, 300, 0.5), 400);

        // Also try to vibrate on mobile
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 300]);
        }
    }, [soundEnabled, playBeep]);

    // Timer logic
    useEffect(() => {
        if (isRunning && timeRemaining > 0) {
            intervalRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    const newTime = prev - 1;

                    // Countdown beeps for last 3 seconds
                    if (newTime <= 3 && newTime > 0) {
                        playBeep(600, 100, 0.2);
                    }

                    // Timer complete
                    if (newTime <= 0) {
                        setIsRunning(false);
                        playCompletionSound();
                        return 0;
                    }

                    return newTime;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeRemaining, playBeep, playCompletionSound]);

    // Auto-start when opened
    useEffect(() => {
        if (isVisible) {
            setTimeRemaining(initialTime);
            setIsRunning(true);
        } else {
            setIsRunning(false);
        }
    }, [isVisible, initialTime]);

    const handleReset = () => {
        setTimeRemaining(initialTime);
        setIsRunning(false);
    };

    const handleToggle = () => {
        setIsRunning(!isRunning);
    };

    const handlePreset = (seconds: number) => {
        setInitialTime(seconds);
        setTimeRemaining(seconds);
        setIsRunning(true);
    };

    const handleAdjustTime = (delta: number) => {
        const newTime = Math.max(0, timeRemaining + delta);
        setTimeRemaining(newTime);
        if (newTime > 0 && !isRunning) {
            setIsRunning(true);
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
                {/* Header */}
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
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Timer Display */}
                <div className="relative mb-6">
                    {/* Progress Ring */}
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
                                className={`transition-all duration-1000 ${isComplete ? 'text-green-500' : timeRemaining <= 10 ? 'text-orange-500' : 'text-blue-500'
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

                {/* Quick Adjust */}
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

                {/* Presets */}
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

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex-1 btn btn-secondary py-3 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={18} />
                        Reset
                    </button>
                    <button
                        onClick={onClose}
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
