import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { AuditLogItem } from '../../types';
import { ScrollText, Search, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const list = await api.audit.list();
        setLogs(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.target.toLowerCase().includes(q) ||
      l.actor.name.toLowerCase().includes(q) ||
      l.actor.role.toLowerCase().includes(q)
    );
  });

  const getActionBadge = (action: AuditLogItem['action']) => {
    switch (action) {
      case 'ATTENDANCE_OVERRIDE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-marigold/15 border border-marigold/30 text-marigold">OVERRIDE</span>;
      case 'FACE_PURGED':
      case 'STUDENT_DELETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brick/15 border border-brick/30 text-brick">DELETION</span>;
      case 'STUDENT_ENROLLED':
      case 'SESSION_CONFIRMED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal/15 border border-teal/30 text-teal">RECORDED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-paper border border-hairline text-muted">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-marigold" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">System Audit Trail</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Immutable compliance record of logins, manual overrides, biometric indexing, and privacy purges.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded border border-hairline bg-paper text-ink focus:outline-hidden focus:border-marigold"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded border border-hairline bg-surface editorial-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-paper/70 border-b border-hairline text-[10px] text-muted uppercase">
              <tr>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Actor / Faculty</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3">Audit Details &amp; Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">Loading audit entries...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">No audit events match your search query.</td>
                </tr>
              ) : (
                filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-hover">
                    <td className="p-3 text-muted">
                      {new Date(item.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="p-3">
                      <span className="font-serif font-bold text-ink">{item.actor.name}</span>
                      <span className="block text-[10px] text-muted uppercase">{item.actor.role}</span>
                    </td>
                    <td className="p-3">{getActionBadge(item.action)}</td>
                    <td className="p-3 font-semibold text-ink">{item.target}</td>
                    <td className="p-3 text-muted">
                      {item.meta?.reason ? (
                        <span className="text-ink font-sans italic">"{item.meta.reason}"</span>
                      ) : (
                        item.meta ? JSON.stringify(item.meta) : 'System event logged'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 border-t border-hairline bg-paper/50 text-[11px] font-mono text-muted flex justify-between">
          <span>Total Audit Records: {filteredLogs.length} events</span>
          <span>Encrypted at rest with DynamoDB SSE</span>
        </div>
      </div>
    </div>
  );
};
