import type { MuscleGroupVolume } from '../types';

interface BodyDiagramProps {
  muscleGroups: MuscleGroupVolume[];
}

// Helper to get intensity (0-1) based on percentage
function getIntensity(muscleGroups: MuscleGroupVolume[], name: string): number {
  const maxSets = Math.max(...muscleGroups.map((mg) => mg.sets), 1);
  const group = muscleGroups.find(
    (g) => g.muscleGroup.toLowerCase() === name.toLowerCase()
  );
  if (!group) return 0;
  return group.sets / maxSets;
}

// Minimalist Heat Map
export function BodyDiagramHeatmap({ muscleGroups }: BodyDiagramProps) {
  const chest = getIntensity(muscleGroups, 'Chest');
  const back = getIntensity(muscleGroups, 'Back');
  const shoulders = getIntensity(muscleGroups, 'Shoulders');
  const biceps = getIntensity(muscleGroups, 'Biceps');
  const triceps = getIntensity(muscleGroups, 'Triceps');
  const quads = getIntensity(muscleGroups, 'Quads');
  const hamstrings = getIntensity(muscleGroups, 'Hamstrings');
  const glutes = getIntensity(muscleGroups, 'Glutes');
  const calves = getIntensity(muscleGroups, 'Calves');
  const core = getIntensity(muscleGroups, 'Core');

  // Heat gradient from gray to red
  const heatGradient = (intensity: number) => {
    if (intensity < 0.2) return '#374151'; // gray-700
    if (intensity < 0.4) return '#4b5563'; // gray-600
    if (intensity < 0.6) return '#b91c1c'; // red-700
    if (intensity < 0.8) return '#dc2626'; // red-600
    return '#ef4444'; // red-500
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-6 justify-center">
        {/* Front View */}
        <div className="text-center">
          <svg viewBox="0 0 80 170" className="w-20 h-40">
            <defs>
              <filter id="heatBlur">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* Glow layer */}
            <g filter="url(#heatBlur)" opacity="0.6">
              <ellipse cx="22" cy="38" rx="10" ry="7" fill={heatGradient(shoulders)} />
              <ellipse cx="58" cy="38" rx="10" ry="7" fill={heatGradient(shoulders)} />
              <ellipse cx="40" cy="48" rx="14" ry="10" fill={heatGradient(chest)} />
              <rect x="32" y="58" width="16" height="28" rx="3" fill={heatGradient(core)} />
              <ellipse cx="16" cy="52" rx="5" ry="14" fill={heatGradient(biceps)} />
              <ellipse cx="64" cy="52" rx="5" ry="14" fill={heatGradient(biceps)} />
              <ellipse cx="34" cy="115" rx="8" ry="24" fill={heatGradient(quads)} />
              <ellipse cx="46" cy="115" rx="8" ry="24" fill={heatGradient(quads)} />
              <ellipse cx="34" cy="152" rx="4" ry="12" fill={heatGradient(calves)} />
              <ellipse cx="46" cy="152" rx="4" ry="12" fill={heatGradient(calves)} />
            </g>

            {/* Body outline */}
            <g fill="none" stroke="#475569" strokeWidth="1" opacity="0.5">
              <ellipse cx="40" cy="14" rx="9" ry="10" />
              <path d="M32 24 L28 28 L18 42 L14 70 L18 95 L28 100 L32 75 L40 70 L48 75 L52 100 L62 95 L66 70 L62 42 L52 28 L48 24" />
              <path d="M28 100 L26 140 L24 168 M52 100 L54 140 L56 168" />
            </g>
          </svg>
          <p className="text-[10px] text-slate-500 mt-1">Front</p>
        </div>

        {/* Back View */}
        <div className="text-center">
          <svg viewBox="0 0 80 170" className="w-20 h-40">
            {/* Glow layer */}
            <g filter="url(#heatBlur)" opacity="0.6">
              <ellipse cx="22" cy="38" rx="10" ry="7" fill={heatGradient(shoulders)} />
              <ellipse cx="58" cy="38" rx="10" ry="7" fill={heatGradient(shoulders)} />
              <path d="M28 35 Q40 30 52 35 L50 78 Q40 85 30 78 Z" fill={heatGradient(back)} />
              <ellipse cx="16" cy="52" rx="5" ry="14" fill={heatGradient(triceps)} />
              <ellipse cx="64" cy="52" rx="5" ry="14" fill={heatGradient(triceps)} />
              <ellipse cx="34" cy="92" rx="9" ry="8" fill={heatGradient(glutes)} />
              <ellipse cx="46" cy="92" rx="9" ry="8" fill={heatGradient(glutes)} />
              <ellipse cx="34" cy="120" rx="7" ry="22" fill={heatGradient(hamstrings)} />
              <ellipse cx="46" cy="120" rx="7" ry="22" fill={heatGradient(hamstrings)} />
              <ellipse cx="34" cy="152" rx="4" ry="12" fill={heatGradient(calves)} />
              <ellipse cx="46" cy="152" rx="4" ry="12" fill={heatGradient(calves)} />
            </g>

            {/* Body outline */}
            <g fill="none" stroke="#475569" strokeWidth="1" opacity="0.5">
              <ellipse cx="40" cy="14" rx="9" ry="10" />
              <path d="M32 24 L28 28 L18 42 L14 70 L18 95 L28 100 L32 75 L40 70 L48 75 L52 100 L62 95 L66 70 L62 42 L52 28 L48 24" />
              <path d="M28 100 L26 140 L24 168 M52 100 L54 140 L56 168" />
            </g>
          </svg>
          <p className="text-[10px] text-slate-500 mt-1">Back</p>
        </div>
      </div>

      {/* Gradient legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-slate-500">Inactive</span>
        <div className="flex h-2 w-24 rounded-full overflow-hidden">
          <div className="flex-1 bg-gray-700"></div>
          <div className="flex-1 bg-gray-600"></div>
          <div className="flex-1 bg-red-700"></div>
          <div className="flex-1 bg-red-600"></div>
          <div className="flex-1 bg-red-500"></div>
        </div>
        <span className="text-[10px] text-slate-500">Active</span>
      </div>
    </div>
  );
}
