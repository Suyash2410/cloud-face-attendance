import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AlertTriangle, UserCheck } from 'lucide-react';

export const DefaulterBarList: React.FC = () => {
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await api.analytics.getDefaulters();
        setDefaulters(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-5 rounded bg-surface border border-hairline editorial-shadow flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-serif font-bold text-lg text-ink">Top Defaulters (&lt;75%)</h3>
          <p className="text-xs text-muted">Students requiring statutory shortage notifications</p>
        </div>
        <div className="p-1.5 rounded bg-brick/10 border border-brick/30 text-brick">
          <AlertTriangle className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-2.5 my-2 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-muted">Scanning rosters...</div>
        ) : defaulters.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted flex flex-col items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal" />
            <span>Nobody is short on attendance this term!</span>
          </div>
        ) : (
          defaulters.map((d, index) => (
            <div key={d.roll} className="text-xs font-mono">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] text-muted w-3.5 text-right font-bold">{index + 1}.</span>
                  <span className="font-semibold text-ink truncate">{d.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-paper border border-hairline text-muted">
                    {d.roll} ({d.division})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted">{d.missed} missed</span>
                  <span className="font-bold text-brick">{d.rate}%</span>
                </div>
              </div>

              {/* Progress track */}
              <div className="h-1.5 w-full bg-paper rounded-xs overflow-hidden border border-hairline/60">
                <div
                  className="h-full bg-brick rounded-xs transition-all duration-500"
                  style={{ width: `${d.rate}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted">
        <span>Total Flagged: {defaulters.length} students</span>
        <span className="text-brick font-semibold">Min Statutory: 75%</span>
      </div>
    </div>
  );
};
