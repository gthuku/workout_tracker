import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProgressIndicatorProps {
  current: number;
  previous: number;
  showPercentage?: boolean;
}

export function ProgressIndicator({ current, previous, showPercentage = true }: ProgressIndicatorProps) {
  if (previous === 0) {
    return <span className="text-slate-400">--</span>;
  }

  const diff = current - previous;
  const percentage = Math.round((diff / previous) * 100);

  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 progress-up">
        <TrendingUp size={16} />
        {showPercentage && <span>+{percentage}%</span>}
      </span>
    );
  } else if (diff < 0) {
    return (
      <span className="flex items-center gap-1 progress-down">
        <TrendingDown size={16} />
        {showPercentage && <span>{percentage}%</span>}
      </span>
    );
  } else {
    return (
      <span className="flex items-center gap-1 progress-same">
        <Minus size={16} />
        {showPercentage && <span>0%</span>}
      </span>
    );
  }
}
