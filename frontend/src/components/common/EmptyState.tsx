import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction
}) => {
  return (
    <div className="py-12 px-4 text-center rounded border border-dashed border-hairline bg-surface/50 max-w-lg mx-auto my-6">
      <div className="w-12 h-12 rounded-full border border-hairline bg-paper flex items-center justify-center mx-auto mb-4 text-muted">
        <Icon className="w-6 h-6 text-marigold" />
      </div>
      <h3 className="font-serif font-bold text-lg text-ink mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-marigold text-ink text-xs font-semibold rounded hover:brightness-105 transition-all editorial-shadow"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
