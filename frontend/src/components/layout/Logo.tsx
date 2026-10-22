import React from 'react';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ collapsed = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Custom SVG Logo: Face outline intersecting with a verified checkmark */}
      <div className="relative w-9 h-9 shrink-0 flex items-center justify-center rounded border border-hairline bg-surface editorial-shadow">
        <svg viewBox="0 0 48 48" className="w-6 h-6" fill="none">
          {/* Face boundary */}
          <path
            d="M12 20C12 13.3726 17.3726 8 24 8C30.6274 8 36 13.3726 36 20C36 27.5 30 35 24 39C18 35 12 27.5 12 20Z"
            stroke="var(--color-marigold)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Verified Checkmark */}
          <path
            d="M18 22L23 27L32 17"
            stroke="var(--color-teal)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Camera / Biometric focus brackets */}
          <path d="M7 13V8H12" stroke="var(--color-marigold)" strokeWidth="2" strokeLinecap="round" />
          <path d="M41 13V8H36" stroke="var(--color-marigold)" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 33V38H12" stroke="var(--color-marigold)" strokeWidth="2" strokeLinecap="round" />
          <path d="M41 33V38H36" stroke="var(--color-marigold)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xl tracking-wide text-ink">हाज़िरी</span>
            <span className="font-serif font-bold text-sm tracking-wider uppercase text-marigold">Haazri</span>
          </div>
          <span className="text-[10px] tracking-wider uppercase text-muted font-mono">
            Face Attendance Cloud
          </span>
        </div>
      )}
    </div>
  );
};
