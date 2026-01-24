import { useState } from 'react';
import {
  BodyDiagramNeonGlow,
  BodyDiagramGeometric,
  BodyDiagramSilhouette,
  BodyDiagramHeatmap,
} from '../components/BodyDiagramOptions';
import type { MuscleGroupVolume } from '../types';

// Sample data to preview the diagrams
const SAMPLE_DATA: MuscleGroupVolume[] = [
  { muscleGroup: 'Chest', volume: 15000, sets: 12, percentage: 18 },
  { muscleGroup: 'Back', volume: 18000, sets: 15, percentage: 22 },
  { muscleGroup: 'Shoulders', volume: 8000, sets: 9, percentage: 12 },
  { muscleGroup: 'Biceps', volume: 5000, sets: 6, percentage: 8 },
  { muscleGroup: 'Triceps', volume: 6000, sets: 8, percentage: 10 },
  { muscleGroup: 'Quads', volume: 12000, sets: 10, percentage: 15 },
  { muscleGroup: 'Hamstrings', volume: 4000, sets: 4, percentage: 5 },
  { muscleGroup: 'Glutes', volume: 3000, sets: 3, percentage: 4 },
  { muscleGroup: 'Calves', volume: 2000, sets: 4, percentage: 3 },
  { muscleGroup: 'Core', volume: 2500, sets: 5, percentage: 3 },
];

export function DiagramPreview() {
  const [selected, setSelected] = useState<number | null>(null);

  const options = [
    { id: 1, name: 'Anatomical', description: 'Dual view with distinct muscle colors (like reference)', component: BodyDiagramNeonGlow },
    { id: 2, name: 'Heat Glow', description: 'Glowing muscles with heat color scale', component: BodyDiagramGeometric },
    { id: 3, name: 'Labeled', description: 'Anatomical with muscle labels', component: BodyDiagramSilhouette },
    { id: 4, name: 'Minimal Heat', description: 'Clean outline with purple/pink glow', component: BodyDiagramHeatmap },
  ];

  return (
    <div className="min-h-screen p-6 bg-slate-950">
      <h1 className="text-2xl font-bold text-center mb-2">Body Diagram Options</h1>
      <p className="text-slate-400 text-center mb-8">Click on an option to select it</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {options.map((option) => {
          const Component = option.component;
          return (
            <div
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`card cursor-pointer transition-all ${
                selected === option.id
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : 'hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-lg">Option {option.id}: {option.name}</h2>
                  <p className="text-sm text-slate-400">{option.description}</p>
                </div>
                {selected === option.id && (
                  <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <Component muscleGroups={SAMPLE_DATA} />
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="text-center mt-8">
          <p className="text-slate-400 mb-2">You selected: <span className="text-white font-medium">Option {selected}</span></p>
          <p className="text-sm text-slate-500">Tell me which option number you want to use!</p>
        </div>
      )}
    </div>
  );
}
