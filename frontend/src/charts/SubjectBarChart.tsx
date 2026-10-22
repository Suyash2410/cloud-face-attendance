import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { api } from '../api/client';

export const SubjectBarChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.analytics.getSubjectComparison();
        setData(res);
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
      <div>
        <h3 className="font-serif font-bold text-lg text-ink">Subject Comparison Across Divisions</h3>
        <p className="text-xs text-muted">Comparative attendance performance (TE-A vs. TE-B vs. TE-C)</p>
      </div>

      <div className="h-64 w-full my-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-muted">
            Aggregating division stats...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" opacity={0.6} />
              <XAxis dataKey="subject" stroke="var(--color-muted)" fontSize={10} tickLine={false} />
              <YAxis domain={[60, 100]} stroke="var(--color-muted)" fontSize={11} tickLine={false} unit="%" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-2.5 rounded bg-surface border border-hairline editorial-shadow text-xs">
                        <div className="font-serif font-bold text-ink mb-1.5">{label}</div>
                        {payload.map((p) => (
                          <div key={p.name} className="flex items-center justify-between gap-3 font-mono text-[11px]">
                            <span style={{ color: p.color }}>{p.name}:</span>
                            <span className="font-bold text-ink">{p.value}%</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono', paddingTop: '8px' }}
              />
              <Bar dataKey="TE-A" fill="var(--color-teal)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="TE-B" fill="var(--color-indigo)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="TE-C" fill="var(--color-marigold)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted">
        <span>Highest: TE-C Machine Learning (93%)</span>
        <span className="text-brick font-semibold">Shortage Alert: 0 subjects</span>
      </div>
    </div>
  );
};
