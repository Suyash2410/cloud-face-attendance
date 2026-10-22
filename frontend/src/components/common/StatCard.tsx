import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'teal' | 'marigold' | 'brick' | 'indigo';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit = '',
  subtitle,
  icon: Icon,
  variant = 'default',
  trend
}) => {
  const [displayValue, setDisplayValue] = useState<number | string>(
    typeof value === 'number' ? 0 : value
  );

  // Animated count-up for numbers
  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const duration = 650;
    const steps = 24;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      current += increment;
      if (stepCount >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  const variantBorder = {
    default: 'border-hairline',
    teal: 'border-teal/40',
    marigold: 'border-marigold/40',
    brick: 'border-brick/40',
    indigo: 'border-indigo/40'
  }[variant];

  const variantAccent = {
    default: 'text-ink',
    teal: 'text-teal',
    marigold: 'text-marigold',
    brick: 'text-brick',
    indigo: 'text-indigo'
  }[variant];

  return (
    <div className={`p-4 sm:p-5 rounded bg-surface border ${variantBorder} editorial-shadow transition-all`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded border border-hairline bg-paper text-muted shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1 my-1">
        <span className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-tight ${variantAccent}`}>
          {displayValue}
        </span>
        {unit && <span className="font-mono text-base font-bold text-muted">{unit}</span>}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 pt-2 border-t border-hairline/60 flex items-center justify-between text-xs text-muted">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-mono font-medium ${
                trend.isPositive ? 'text-teal' : 'text-brick'
              }`}
            >
              {trend.value} {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
