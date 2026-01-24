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

// Distinct muscle colors inspired by anatomical diagrams
const muscleColors = {
  chest: '#dc3545', // red
  back: '#dc3545', // red (same as chest for major muscles)
  shoulders: '#fd7e14', // orange
  biceps: '#28a745', // green
  triceps: '#007bff', // blue
  quads: '#17a2b8', // cyan
  hamstrings: '#6f42c1', // purple
  glutes: '#e83e8c', // pink
  calves: '#6f42c1', // purple (same as hamstrings)
  core: '#ffc107', // yellow
};

const getColorWithIntensity = (color: string, intensity: number) => {
  const alpha = 0.25 + intensity * 0.75;
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ===========================================
// OPTION 1: Anatomical Dual View (like reference)
// ===========================================
export function BodyDiagramNeonGlow({ muscleGroups }: BodyDiagramProps) {
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

  const skinTone = '#8B6914';
  const skinToneDark = '#6B4E0A';

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-6 justify-center">
        {/* Front View */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-2 font-medium">ANTERIOR</p>
          <svg viewBox="0 0 100 200" className="w-28 h-48">
            {/* Head */}
            <ellipse cx="50" cy="14" rx="12" ry="13" fill={skinTone} />
            {/* Neck */}
            <rect x="44" y="26" width="12" height="10" fill={skinToneDark} />

            {/* Trapezius upper */}
            <path d="M38 30 Q50 26 62 30 L58 40 Q50 38 42 40 Z" fill={getColorWithIntensity(muscleColors.back, back)} />

            {/* Deltoids/Shoulders */}
            <ellipse cx="28" cy="42" rx="12" ry="9" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />
            <ellipse cx="72" cy="42" rx="12" ry="9" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />

            {/* Pectoralis Major (Chest) */}
            <path d="M34 38 Q50 34 66 38 Q68 52 50 58 Q32 52 34 38" fill={getColorWithIntensity(muscleColors.chest, chest)} />
            {/* Chest separation line */}
            <line x1="50" y1="40" x2="50" y2="56" stroke="#1e1e1e" strokeWidth="0.5" opacity="0.4" />

            {/* Serratus/Obliques */}
            <path d="M32 52 L36 50 L38 72 L34 70 Z" fill={getColorWithIntensity(muscleColors.core, core * 0.7)} />
            <path d="M68 52 L64 50 L62 72 L66 70 Z" fill={getColorWithIntensity(muscleColors.core, core * 0.7)} />

            {/* Rectus Abdominis (Core/Abs) */}
            <path d="M40 58 L60 58 L58 88 L42 88 Z" fill={getColorWithIntensity(muscleColors.core, core)} />
            {/* Ab lines - linea alba */}
            <line x1="50" y1="60" x2="50" y2="86" stroke="#1e1e1e" strokeWidth="0.7" opacity="0.5" />
            {/* Horizontal ab lines */}
            <line x1="42" y1="66" x2="58" y2="66" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.4" />
            <line x1="42" y1="74" x2="58" y2="74" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.4" />
            <line x1="43" y1="82" x2="57" y2="82" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.4" />

            {/* Biceps */}
            <ellipse cx="20" cy="58" rx="7" ry="16" fill={getColorWithIntensity(muscleColors.biceps, biceps)} />
            <ellipse cx="80" cy="58" rx="7" ry="16" fill={getColorWithIntensity(muscleColors.biceps, biceps)} />

            {/* Brachioradialis (forearm) */}
            <ellipse cx="16" cy="82" rx="4" ry="14" fill={skinToneDark} />
            <ellipse cx="84" cy="82" rx="4" ry="14" fill={skinToneDark} />

            {/* Hip flexors */}
            <ellipse cx="44" cy="94" rx="6" ry="5" fill={skinToneDark} />
            <ellipse cx="56" cy="94" rx="6" ry="5" fill={skinToneDark} />

            {/* Quadriceps */}
            <path d="M38 98 Q32 125 36 155 Q44 160 50 155" fill={getColorWithIntensity(muscleColors.quads, quads)} />
            <path d="M62 98 Q68 125 64 155 Q56 160 50 155" fill={getColorWithIntensity(muscleColors.quads, quads)} />
            {/* Quad separation */}
            <line x1="42" y1="100" x2="44" y2="152" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.3" />
            <line x1="58" y1="100" x2="56" y2="152" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.3" />

            {/* Sartorius */}
            <path d="M44 98 Q40 120 38 145" stroke={getColorWithIntensity(muscleColors.quads, quads * 0.6)} strokeWidth="3" fill="none" opacity="0.6" />
            <path d="M56 98 Q60 120 62 145" stroke={getColorWithIntensity(muscleColors.quads, quads * 0.6)} strokeWidth="3" fill="none" opacity="0.6" />

            {/* Tibialis Anterior (shin) */}
            <ellipse cx="40" cy="172" rx="4" ry="14" fill={skinToneDark} />
            <ellipse cx="60" cy="172" rx="4" ry="14" fill={skinToneDark} />

            {/* Gastrocnemius (Calves) - inner */}
            <ellipse cx="44" cy="168" rx="5" ry="16" fill={getColorWithIntensity(muscleColors.calves, calves)} />
            <ellipse cx="56" cy="168" rx="5" ry="16" fill={getColorWithIntensity(muscleColors.calves, calves)} />

            {/* Feet */}
            <ellipse cx="42" cy="194" rx="6" ry="4" fill={skinTone} />
            <ellipse cx="58" cy="194" rx="6" ry="4" fill={skinTone} />
          </svg>
        </div>

        {/* Back View */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-2 font-medium">POSTERIOR</p>
          <svg viewBox="0 0 100 200" className="w-28 h-48">
            {/* Head */}
            <ellipse cx="50" cy="14" rx="12" ry="13" fill={skinTone} />
            {/* Neck */}
            <rect x="44" y="26" width="12" height="10" fill={skinToneDark} />

            {/* Trapezius */}
            <path d="M35 28 Q50 22 65 28 L62 48 Q50 45 38 48 Z" fill={getColorWithIntensity(muscleColors.back, back)} />

            {/* Rear Deltoids */}
            <ellipse cx="28" cy="42" rx="12" ry="9" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />
            <ellipse cx="72" cy="42" rx="12" ry="9" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />

            {/* Infraspinatus/Teres Major */}
            <ellipse cx="40" cy="50" rx="8" ry="6" fill={getColorWithIntensity(muscleColors.back, back * 0.8)} />
            <ellipse cx="60" cy="50" rx="8" ry="6" fill={getColorWithIntensity(muscleColors.back, back * 0.8)} />

            {/* Latissimus Dorsi */}
            <path d="M35 48 Q28 65 34 85 Q50 92 66 85 Q72 65 65 48 Q50 45 35 48" fill={getColorWithIntensity(muscleColors.back, back)} />
            {/* Spine line */}
            <line x1="50" y1="48" x2="50" y2="85" stroke="#1e1e1e" strokeWidth="0.7" opacity="0.5" />

            {/* Triceps */}
            <ellipse cx="20" cy="58" rx="7" ry="16" fill={getColorWithIntensity(muscleColors.triceps, triceps)} />
            <ellipse cx="80" cy="58" rx="7" ry="16" fill={getColorWithIntensity(muscleColors.triceps, triceps)} />

            {/* Forearms */}
            <ellipse cx="16" cy="82" rx="4" ry="14" fill={skinToneDark} />
            <ellipse cx="84" cy="82" rx="4" ry="14" fill={skinToneDark} />

            {/* Gluteus Maximus */}
            <ellipse cx="42" cy="98" rx="11" ry="10" fill={getColorWithIntensity(muscleColors.glutes, glutes)} />
            <ellipse cx="58" cy="98" rx="11" ry="10" fill={getColorWithIntensity(muscleColors.glutes, glutes)} />
            {/* Glute separation */}
            <line x1="50" y1="90" x2="50" y2="108" stroke="#1e1e1e" strokeWidth="0.5" opacity="0.4" />

            {/* Gluteus Medius (upper glutes) */}
            <ellipse cx="38" cy="90" rx="6" ry="4" fill={getColorWithIntensity(muscleColors.glutes, glutes * 0.7)} />
            <ellipse cx="62" cy="90" rx="6" ry="4" fill={getColorWithIntensity(muscleColors.glutes, glutes * 0.7)} />

            {/* Hamstrings */}
            <path d="M34 108 Q30 130 36 155 Q44 160 50 155" fill={getColorWithIntensity(muscleColors.hamstrings, hamstrings)} />
            <path d="M66 108 Q70 130 64 155 Q56 160 50 155" fill={getColorWithIntensity(muscleColors.hamstrings, hamstrings)} />
            {/* Hamstring separation */}
            <line x1="42" y1="112" x2="44" y2="150" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.3" />
            <line x1="58" y1="112" x2="56" y2="150" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.3" />

            {/* Gastrocnemius (Calves) */}
            <ellipse cx="42" cy="168" rx="6" ry="16" fill={getColorWithIntensity(muscleColors.calves, calves)} />
            <ellipse cx="58" cy="168" rx="6" ry="16" fill={getColorWithIntensity(muscleColors.calves, calves)} />

            {/* Soleus (lower calf) */}
            <ellipse cx="42" cy="180" rx="4" ry="8" fill={getColorWithIntensity(muscleColors.calves, calves * 0.7)} />
            <ellipse cx="58" cy="180" rx="4" ry="8" fill={getColorWithIntensity(muscleColors.calves, calves * 0.7)} />

            {/* Feet */}
            <ellipse cx="42" cy="194" rx="6" ry="4" fill={skinTone} />
            <ellipse cx="58" cy="194" rx="6" ry="4" fill={skinTone} />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 justify-center text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.chest}}></span>Chest/Back</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.shoulders}}></span>Shoulders</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.biceps}}></span>Biceps</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.triceps}}></span>Triceps</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.core}}></span>Core</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.quads}}></span>Quads</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.hamstrings}}></span>Hamstrings</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background: muscleColors.glutes}}></span>Glutes</span>
      </div>
    </div>
  );
}

// ===========================================
// OPTION 2: Muscular Detail Style
// ===========================================
export function BodyDiagramGeometric({ muscleGroups }: BodyDiagramProps) {
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

  // Gradient heat colors
  const heatColor = (intensity: number) => {
    if (intensity < 0.15) return '#1e3a8a'; // dark blue
    if (intensity < 0.3) return '#0369a1'; // blue
    if (intensity < 0.5) return '#059669'; // green
    if (intensity < 0.7) return '#ca8a04'; // yellow
    if (intensity < 0.85) return '#ea580c'; // orange
    return '#dc2626'; // red
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-8 justify-center">
        {/* Front View */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-2">Front</p>
          <svg viewBox="0 0 100 200" className="w-24 h-44">
            <defs>
              <filter id="muscleGlow2">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Body outline - darker */}
            <path
              d="M50 10 Q62 10 62 22 L62 28 Q78 32 82 46 L85 80 Q85 100 75 108 L72 115
                 Q82 122 78 155 L72 180 Q68 192 65 198 L58 198 Q55 188 52 172 L50 145
                 Q50 140 50 145 L48 172 Q45 188 42 198 L35 198 Q32 192 28 180 L22 155
                 Q18 122 28 115 L25 108 Q15 100 15 80 L18 46 Q22 32 38 28 L38 22 Q38 10 50 10"
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth="1"
            />

            {/* Head */}
            <ellipse cx="50" cy="18" rx="11" ry="12" fill="#1e293b" />

            {/* Deltoids */}
            <ellipse cx="26" cy="48" rx="11" ry="8" fill={heatColor(shoulders)} opacity={0.3 + shoulders * 0.7} filter="url(#muscleGlow2)" />
            <ellipse cx="74" cy="48" rx="11" ry="8" fill={heatColor(shoulders)} opacity={0.3 + shoulders * 0.7} filter="url(#muscleGlow2)" />

            {/* Pecs */}
            <path d="M36 44 Q50 40 50 58 Q36 62 34 52 Z" fill={heatColor(chest)} opacity={0.3 + chest * 0.7} filter="url(#muscleGlow2)" />
            <path d="M64 44 Q50 40 50 58 Q64 62 66 52 Z" fill={heatColor(chest)} opacity={0.3 + chest * 0.7} filter="url(#muscleGlow2)" />

            {/* Biceps */}
            <ellipse cx="20" cy="68" rx="6" ry="16" fill={heatColor(biceps)} opacity={0.3 + biceps * 0.7} filter="url(#muscleGlow2)" />
            <ellipse cx="80" cy="68" rx="6" ry="16" fill={heatColor(biceps)} opacity={0.3 + biceps * 0.7} filter="url(#muscleGlow2)" />

            {/* Core */}
            <rect x="40" y="60" width="20" height="38" rx="3" fill={heatColor(core)} opacity={0.3 + core * 0.7} filter="url(#muscleGlow2)" />

            {/* Quads */}
            <path d="M38 108 Q32 135 36 165 Q44 170 50 165" fill={heatColor(quads)} opacity={0.3 + quads * 0.7} filter="url(#muscleGlow2)" />
            <path d="M62 108 Q68 135 64 165 Q56 170 50 165" fill={heatColor(quads)} opacity={0.3 + quads * 0.7} filter="url(#muscleGlow2)" />

            {/* Calves */}
            <ellipse cx="40" cy="182" rx="5" ry="14" fill={heatColor(calves)} opacity={0.3 + calves * 0.7} filter="url(#muscleGlow2)" />
            <ellipse cx="60" cy="182" rx="5" ry="14" fill={heatColor(calves)} opacity={0.3 + calves * 0.7} filter="url(#muscleGlow2)" />
          </svg>
        </div>

        {/* Back View */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-2">Back</p>
          <svg viewBox="0 0 100 200" className="w-24 h-44">
            {/* Body outline */}
            <path
              d="M50 10 Q62 10 62 22 L62 28 Q78 32 82 46 L85 80 Q85 100 75 108 L72 115
                 Q82 122 78 155 L72 180 Q68 192 65 198 L58 198 Q55 188 52 172 L50 145
                 Q50 140 50 145 L48 172 Q45 188 42 198 L35 198 Q32 192 28 180 L22 155
                 Q18 122 28 115 L25 108 Q15 100 15 80 L18 46 Q22 32 38 28 L38 22 Q38 10 50 10"
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth="1"
            />

            {/* Head */}
            <ellipse cx="50" cy="18" rx="11" ry="12" fill="#1e293b" />

            {/* Rear Deltoids */}
            <ellipse cx="26" cy="48" rx="11" ry="8" fill={heatColor(shoulders)} opacity={0.3 + shoulders * 0.7} filter="url(#muscleGlow2)" />
            <ellipse cx="74" cy="48" rx="11" ry="8" fill={heatColor(shoulders)} opacity={0.3 + shoulders * 0.7} filter="url(#muscleGlow2)" />

            {/* Traps/Upper Back */}
            <path d="M35 38 Q50 34 65 38 L62 55 Q50 52 38 55 Z" fill={heatColor(back)} opacity={0.3 + back * 0.7} filter="url(#muscleGlow2)" />

            {/* Lats */}
            <path d="M35 55 Q28 75 34 98 Q50 105 66 98 Q72 75 65 55 Q50 52 35 55" fill={heatColor(back)} opacity={0.3 + back * 0.7} filter="url(#muscleGlow2)" />

            {/* Triceps */}
            <ellipse cx="20" cy="68" rx="6" ry="16" fill={heatColor(triceps)} opacity={0.3 + triceps * 0.7} filter="url(#muscleGlow2)" />
            <ellipse cx="80" cy="68" rx="6" ry="16" fill={heatColor(triceps)} opacity={0.3 + triceps * 0.7} filter="url(#muscleGlow2)" />

            {/* Glutes */}
            <ellipse cx="42" cy="112" rx="10" ry="9" fill={heatColor(glutes)} opacity={0.3 + glutes * 0.7} filter="url(#muscleGlow2)" />
            <ellipse cx="58" cy="112" rx="10" ry="9" fill={heatColor(glutes)} opacity={0.3 + glutes * 0.7} filter="url(#muscleGlow2)" />

            {/* Hamstrings */}
            <path d="M34 122 Q30 145 36 168 Q44 172 50 168" fill={heatColor(hamstrings)} opacity={0.3 + hamstrings * 0.7} filter="url(#muscleGlow2)" />
            <path d="M66 122 Q70 145 64 168 Q56 172 50 168" fill={heatColor(hamstrings)} opacity={0.3 + hamstrings * 0.7} filter="url(#muscleGlow2)" />

            {/* Calves */}
            <ellipse cx="40" cy="182" rx="5" ry="14" fill={heatColor(calves)} opacity={0.3 + calves * 0.7} filter="url(#muscleGlow2)" />
            <ellipse cx="60" cy="182" rx="5" ry="14" fill={heatColor(calves)} opacity={0.3 + calves * 0.7} filter="url(#muscleGlow2)" />
          </svg>
        </div>
      </div>

      {/* Heat scale */}
      <div className="flex items-center gap-1 mt-3">
        <span className="text-[10px] text-slate-500">Rest</span>
        <div className="flex h-2 rounded overflow-hidden">
          <div className="w-4" style={{background: '#1e3a8a'}}></div>
          <div className="w-4" style={{background: '#0369a1'}}></div>
          <div className="w-4" style={{background: '#059669'}}></div>
          <div className="w-4" style={{background: '#ca8a04'}}></div>
          <div className="w-4" style={{background: '#ea580c'}}></div>
          <div className="w-4" style={{background: '#dc2626'}}></div>
        </div>
        <span className="text-[10px] text-slate-500">Active</span>
      </div>
    </div>
  );
}

// ===========================================
// OPTION 3: Labeled Anatomical
// ===========================================
export function BodyDiagramSilhouette({ muscleGroups }: BodyDiagramProps) {
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

  const skinBase = '#5D4E37';

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3 justify-center">
        {/* Front View with Labels */}
        <div className="relative">
          <svg viewBox="0 0 140 200" className="w-36 h-48">
            {/* Labels - Left side */}
            <g className="text-[6px]" fill="#94a3b8">
              <text x="2" y="50" textAnchor="start">Deltoid</text>
              <line x1="22" y1="49" x2="30" y2="46" stroke="#475569" strokeWidth="0.5" />

              <text x="2" y="70" textAnchor="start">Biceps</text>
              <line x1="22" y1="69" x2="32" y2="66" stroke="#475569" strokeWidth="0.5" />

              <text x="2" y="90" textAnchor="start">Abs</text>
              <line x1="14" y1="89" x2="52" y2="78" stroke="#475569" strokeWidth="0.5" />
            </g>

            {/* Labels - Right side */}
            <g className="text-[6px]" fill="#94a3b8">
              <text x="138" y="55" textAnchor="end">Pectorals</text>
              <line x1="118" y1="54" x2="95" y2="52" stroke="#475569" strokeWidth="0.5" />

              <text x="138" y="130" textAnchor="end">Quads</text>
              <line x1="118" y1="129" x2="95" y2="135" stroke="#475569" strokeWidth="0.5" />

              <text x="138" y="165" textAnchor="end">Calves</text>
              <line x1="118" y1="164" x2="100" y2="170" stroke="#475569" strokeWidth="0.5" />
            </g>

            {/* Body centered */}
            <g transform="translate(30, 0)">
              {/* Head */}
              <ellipse cx="40" cy="14" rx="10" ry="11" fill={skinBase} />
              {/* Neck */}
              <rect x="35" y="24" width="10" height="8" fill={skinBase} />

              {/* Trapezius */}
              <path d="M30 28 Q40 24 50 28 L48 38 Q40 36 32 38 Z" fill={getColorWithIntensity(muscleColors.back, back)} />

              {/* Deltoids */}
              <ellipse cx="22" cy="38" rx="10" ry="7" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />
              <ellipse cx="58" cy="38" rx="10" ry="7" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />

              {/* Pectorals */}
              <path d="M28 36 Q40 32 52 36 Q54 48 40 52 Q26 48 28 36" fill={getColorWithIntensity(muscleColors.chest, chest)} />
              <line x1="40" y1="38" x2="40" y2="50" stroke="#1e1e1e" strokeWidth="0.4" opacity="0.4" />

              {/* Serratus */}
              <path d="M26 46 L28 44 L30 62 L27 60 Z" fill={getColorWithIntensity(muscleColors.core, core * 0.6)} />
              <path d="M54 46 L52 44 L50 62 L53 60 Z" fill={getColorWithIntensity(muscleColors.core, core * 0.6)} />

              {/* Abs */}
              <path d="M32 52 L48 52 L46 80 L34 80 Z" fill={getColorWithIntensity(muscleColors.core, core)} />
              <line x1="40" y1="54" x2="40" y2="78" stroke="#1e1e1e" strokeWidth="0.5" opacity="0.4" />
              <line x1="34" y1="60" x2="46" y2="60" stroke="#1e1e1e" strokeWidth="0.3" opacity="0.3" />
              <line x1="34" y1="68" x2="46" y2="68" stroke="#1e1e1e" strokeWidth="0.3" opacity="0.3" />

              {/* Biceps */}
              <ellipse cx="14" cy="52" rx="5" ry="13" fill={getColorWithIntensity(muscleColors.biceps, biceps)} />
              <ellipse cx="66" cy="52" rx="5" ry="13" fill={getColorWithIntensity(muscleColors.biceps, biceps)} />

              {/* Forearms */}
              <ellipse cx="12" cy="74" rx="3" ry="10" fill={skinBase} />
              <ellipse cx="68" cy="74" rx="3" ry="10" fill={skinBase} />

              {/* Quads */}
              <path d="M32 82 Q27 110 31 140 Q38 144 40 140" fill={getColorWithIntensity(muscleColors.quads, quads)} />
              <path d="M48 82 Q53 110 49 140 Q42 144 40 140" fill={getColorWithIntensity(muscleColors.quads, quads)} />

              {/* Calves */}
              <ellipse cx="34" cy="158" rx="4" ry="14" fill={getColorWithIntensity(muscleColors.calves, calves)} />
              <ellipse cx="46" cy="158" rx="4" ry="14" fill={getColorWithIntensity(muscleColors.calves, calves)} />

              {/* Feet */}
              <ellipse cx="34" cy="178" rx="5" ry="3" fill={skinBase} />
              <ellipse cx="46" cy="178" rx="5" ry="3" fill={skinBase} />
            </g>
          </svg>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">Anterior</span>
        </div>

        {/* Back View with Labels */}
        <div className="relative">
          <svg viewBox="0 0 140 200" className="w-36 h-48">
            {/* Labels - Left side */}
            <g className="text-[6px]" fill="#94a3b8">
              <text x="2" y="35" textAnchor="start">Trapezius</text>
              <line x1="30" y1="34" x2="45" y2="35" stroke="#475569" strokeWidth="0.5" />

              <text x="2" y="65" textAnchor="start">Triceps</text>
              <line x1="24" y1="64" x2="32" y2="60" stroke="#475569" strokeWidth="0.5" />

              <text x="2" y="100" textAnchor="start">Glutes</text>
              <line x1="22" y1="99" x2="50" y2="95" stroke="#475569" strokeWidth="0.5" />
            </g>

            {/* Labels - Right side */}
            <g className="text-[6px]" fill="#94a3b8">
              <text x="138" y="60" textAnchor="end">Lats</text>
              <line x1="118" y1="59" x2="95" y2="60" stroke="#475569" strokeWidth="0.5" />

              <text x="138" y="130" textAnchor="end">Hamstrings</text>
              <line x1="118" y1="129" x2="95" y2="130" stroke="#475569" strokeWidth="0.5" />
            </g>

            {/* Body centered */}
            <g transform="translate(30, 0)">
              {/* Head */}
              <ellipse cx="40" cy="14" rx="10" ry="11" fill={skinBase} />
              {/* Neck */}
              <rect x="35" y="24" width="10" height="8" fill={skinBase} />

              {/* Trapezius */}
              <path d="M28 26 Q40 20 52 26 L50 42 Q40 40 30 42 Z" fill={getColorWithIntensity(muscleColors.back, back)} />

              {/* Rear Deltoids */}
              <ellipse cx="22" cy="38" rx="10" ry="7" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />
              <ellipse cx="58" cy="38" rx="10" ry="7" fill={getColorWithIntensity(muscleColors.shoulders, shoulders)} />

              {/* Lats */}
              <path d="M28 42 Q22 58 27 78 Q40 84 53 78 Q58 58 52 42 Q40 40 28 42" fill={getColorWithIntensity(muscleColors.back, back)} />
              <line x1="40" y1="42" x2="40" y2="78" stroke="#1e1e1e" strokeWidth="0.5" opacity="0.4" />

              {/* Triceps */}
              <ellipse cx="14" cy="52" rx="5" ry="13" fill={getColorWithIntensity(muscleColors.triceps, triceps)} />
              <ellipse cx="66" cy="52" rx="5" ry="13" fill={getColorWithIntensity(muscleColors.triceps, triceps)} />

              {/* Forearms */}
              <ellipse cx="12" cy="74" rx="3" ry="10" fill={skinBase} />
              <ellipse cx="68" cy="74" rx="3" ry="10" fill={skinBase} />

              {/* Glutes */}
              <ellipse cx="34" cy="88" rx="9" ry="8" fill={getColorWithIntensity(muscleColors.glutes, glutes)} />
              <ellipse cx="46" cy="88" rx="9" ry="8" fill={getColorWithIntensity(muscleColors.glutes, glutes)} />

              {/* Hamstrings */}
              <path d="M28 98 Q24 120 30 142 Q38 146 40 142" fill={getColorWithIntensity(muscleColors.hamstrings, hamstrings)} />
              <path d="M52 98 Q56 120 50 142 Q42 146 40 142" fill={getColorWithIntensity(muscleColors.hamstrings, hamstrings)} />

              {/* Calves */}
              <ellipse cx="34" cy="158" rx="4" ry="14" fill={getColorWithIntensity(muscleColors.calves, calves)} />
              <ellipse cx="46" cy="158" rx="4" ry="14" fill={getColorWithIntensity(muscleColors.calves, calves)} />

              {/* Feet */}
              <ellipse cx="34" cy="178" rx="5" ry="3" fill={skinBase} />
              <ellipse cx="46" cy="178" rx="5" ry="3" fill={skinBase} />
            </g>
          </svg>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">Posterior</span>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// OPTION 4: Minimalist Heat Map
// ===========================================
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

// Export all options
export const BodyDiagramOptions = {
  NeonGlow: BodyDiagramNeonGlow,
  Geometric: BodyDiagramGeometric,
  Silhouette: BodyDiagramSilhouette,
  Heatmap: BodyDiagramHeatmap,
};
