import React from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  threshold?: number; // default: 75%
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 130,
  strokeWidth = 10,
  label,
  sublabel,
  threshold = 75
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  const isBelowThreshold = percentage < threshold;
  const strokeColor = isBelowThreshold ? 'var(--color-brick)' : 'var(--color-teal)';

  // Calculate position of 75% threshold tick mark
  const thresholdAngle = (threshold / 100) * 360 - 90; // Start at top
  const thresholdRad = (thresholdAngle * Math.PI) / 180;
  const tickOuterX = size / 2 + (radius + strokeWidth / 2 + 3) * Math.cos(thresholdRad);
  const tickOuterY = size / 2 + (radius + strokeWidth / 2 + 3) * Math.sin(thresholdRad);
  const tickInnerX = size / 2 + (radius - strokeWidth / 2 - 3) * Math.cos(thresholdRad);
  const tickInnerY = size / 2 + (radius - strokeWidth / 2 - 3) * Math.sin(thresholdRad);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--color-hairline)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Value Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
          />

          {/* 75% Minimum Statutory Threshold Tick Marker */}
          <line
            x1={tickInnerX}
            y1={tickInnerY}
            x2={tickOuterX}
            y2={tickOuterY}
            stroke="var(--color-marigold)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className={`font-mono text-xl font-black ${
              isBelowThreshold ? 'text-brick' : 'text-teal'
            }`}
          >
            {percentage}%
          </span>
          <span className="text-[9px] font-mono text-muted uppercase tracking-tighter">
            Req: {threshold}%
          </span>
        </div>
      </div>

      {label && <div className="mt-2 text-xs font-serif font-bold text-ink text-center truncate max-w-[140px]">{label}</div>}
      {sublabel && <div className="text-[10px] font-mono text-muted text-center">{sublabel}</div>}
    </div>
  );
};
