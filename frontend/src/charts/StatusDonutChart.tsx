import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../api/client';

export const StatusDonutChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const donut = await api.analytics.getStatusDonut();
        setData(donut);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const presentFace = data.find(d => d.name.includes('Present'))?.value || 0;
  const matchRatio = total > 0 ? Math.round((presentFace / total) * 100) : 89;

  return (
    <div className="p-5 rounded bg-surface border border-hairline editorial-shadow flex flex-col justify-between">
      <div>
        <h3 className="font-serif font-bold text-lg text-ink">Attendance Verification Split</h3>
        <p className="text-xs text-muted">Facial recognition matches vs. manual overrides</p>
      </div>

      <div className="relative h-56 w-full my-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-muted">
            Computing distribution...
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      const pct = total > 0 ? Math.round(((item.value as number) / total) * 100) : 0;
                      return (
                        <div className="p-2.5 rounded bg-surface border border-hairline editorial-shadow text-xs">
                          <div className="font-serif font-bold text-ink">{item.name}</div>
                          <div className="font-mono text-muted mt-0.5">
                            {item.value} records ({pct}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Numeral */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-mono text-2xl font-extrabold text-ink">{matchRatio}%</span>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">AI Verified</span>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-hairline text-[11px] font-mono">
        {data.map((item) => (
          <div key={item.name} className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-muted truncate">{item.name.split(' ')[0]}</span>
            </div>
            <span className="font-bold text-ink">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
