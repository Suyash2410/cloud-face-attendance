import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import { api } from '../api/client';

export const ConfidenceHistogram: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.analytics.getConfidenceDistribution();
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
        <h3 className="font-serif font-bold text-lg text-ink">Match Confidence Distribution</h3>
        <p className="text-xs text-muted">Rekognition vector similarity score spread across faces</p>
      </div>

      <div className="h-56 w-full my-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-muted">
            Calculating histogram...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" opacity={0.6} />
              <XAxis dataKey="range" stroke="var(--color-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="p-2.5 rounded bg-surface border border-hairline editorial-shadow text-xs">
                        <div className="font-serif font-bold text-ink">Score: {item.range}</div>
                        <div className="font-mono text-muted mt-0.5">
                          {item.count} matched faces
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted">
        <span>Confidence &ge; 90%: <strong className="text-teal">87.0%</strong></span>
        <span>Review Band (80-89%): <strong className="text-marigold">11.5%</strong></span>
      </div>
    </div>
  );
};
