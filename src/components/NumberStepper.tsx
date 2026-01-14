import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  label,
  unit,
}: NumberStepperProps) {
  const decrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const increment = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={decrement}
          className="stepper-btn"
          disabled={value <= min}
        >
          <Minus size={20} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = Number(e.target.value);
            if (!isNaN(newValue) && newValue >= min && newValue <= max) {
              onChange(newValue);
            }
          }}
          className="input input-number"
          min={min}
          max={max}
        />
        <button
          type="button"
          onClick={increment}
          className="stepper-btn"
          disabled={value >= max}
        >
          <Plus size={20} />
        </button>
      </div>
      {unit && <span className="text-xs text-slate-500">{unit}</span>}
    </div>
  );
}
