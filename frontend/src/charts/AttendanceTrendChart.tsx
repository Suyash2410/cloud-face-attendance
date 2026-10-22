import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { api } from '../api/client';

interface AttendanceTrendChartProps {
  initialSubject?: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ initialSubject = 'all' }) => {
  const [subject, setSubject] = useState(initialSubject);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const trend = await api.analytics.getTrend(subject);
        setData(trend);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [subject]);

  return (
    <div className="p-5 rounded bg-surface border border-hairline editorial-shadow flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-serif font-bold text-lg text-ink">Daily Attendance Trend</h3>
          <p className="text-xs text-muted">Last 30 days overall student presence percentage</p>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="subject-select" className="text-xs font-mono text-muted">Subject:</label>
          <select
            id="subject-select"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-2.5 py-1 text-xs rounded border border-hairline bg-paper text-ink font-mono focus:outline-hidden focus:border-marigold"
          >
            <option value="all">All Subjects</option>
            <option value="Cloud Computing">Cloud Computing</option>
            <option value="Database Systems">Database Systems</option>
            <option value="Computer Networks">Computer Networks</option>
            <option value="Machine Learning">Machine Learning</option>
            <option value="Operating Systems">Operating Systems</option>
            <option value="Web Technologies">Web Technologies</option>
          </select>
        </div>
      </div>

      <div className="h-64 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-muted">
            Loading trend telemetry...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" opacity={0.6} />
              <XAxis
                dataKey="label"
                stroke="var(--color-muted)"
                fontSize={11}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[50, 100]}
                stroke="var(--color-muted)"
                fontSize={11}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="p-2.5 rounded bg-surface border border-hairline editorial-shadow text-xs">
                        <div className="font-serif font-bold text-ink mb-1">{label}</div>
                        <div className="font-mono text-teal font-semibold">
                          Attendance: {item.rate}%
                        </div>
                        <div className="font-mono text-[10px] text-muted">
                          {item.present} present of {item.total} enrolled
                        </div>
                        {item.isWeekend && (
                          <div className="mt-1 text-[9px] font-mono text-brick uppercase">Weekend lecture</div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="var(--color-teal)"
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#trendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between text-[11px] font-mono text-muted">
        <span>75% statutory requirement threshold</span>
        <span className="text-teal font-semibold">Average: 88.4%</span>
      </div>
    </div>
  );
};
