import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export const CalendarHeatmap: React.FC = () => {
  const [days, setDays] = useState<Array<{ date: string; rate: number; level: number }>>([]);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; rate: number } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const heatmap = await api.analytics.getHeatmap();
        setDays(heatmap);
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 4: return 'bg-teal';
      case 3: return 'bg-teal/75';
      case 2: return 'bg-marigold/80';
      case 1: return 'bg-brick/80';
      default: return 'bg-hairline/40';
    }
  };

  return (
    <div className="p-5 rounded bg-surface border border-hairline editorial-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif font-bold text-lg text-ink">Attendance Intensity Heatmap</h3>
          <p className="text-xs text-muted">Daily campus turnout across the last 60 lecture days</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
          <span>&lt;70%</span>
          <span className="w-2.5 h-2.5 rounded-xs bg-brick/80" />
          <span className="w-2.5 h-2.5 rounded-xs bg-marigold/80" />
          <span className="w-2.5 h-2.5 rounded-xs bg-teal/75" />
          <span className="w-2.5 h-2.5 rounded-xs bg-teal" />
          <span>&gt;90%</span>
        </div>
      </div>

      {/* Grid */}
      <div className="relative">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-2">
          {days.map((d) => (
            <div
              key={d.date}
              onMouseEnter={() => setHoveredDay(d)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`w-4 h-4 rounded-xs cursor-pointer transition-transform hover:scale-125 hover:z-10 ${getLevelColor(
                d.level
              )}`}
              title={`${d.date}: ${d.rate}% attendance`}
            />
          ))}
        </div>

        {/* Hover detail pill */}
        {hoveredDay && (
          <div className="mt-2 text-xs font-mono text-ink bg-paper p-2 rounded border border-hairline inline-flex items-center gap-2">
            <span className="font-bold">{hoveredDay.date}:</span>
            <span className={hoveredDay.rate >= 75 ? 'text-teal font-semibold' : 'text-brick font-semibold'}>
              {hoveredDay.rate}% attendance
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
