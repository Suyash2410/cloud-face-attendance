import React, { useState, useEffect } from 'react';
import { Session, AttendanceRecord } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  History, Calendar, Clock, ChevronRight, CheckCircle2,
  Lock, Eye, Filter, ArrowLeft
} from 'lucide-react';

export const SessionHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        const list = await api.sessions.list();
        setSessions(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  const filteredSessions = sessions.filter(s => {
    if (subjectFilter !== 'all' && s.subject !== subjectFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-marigold" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
              {selectedSession ? 'Session Telemetry Detail' : 'Class Attendance Sessions'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {selectedSession
              ? `Reviewing face recognition vector matches for ${selectedSession.subject} on ${selectedSession.date}.`
              : 'Chronological log of verified biometric classroom attendance sessions.'}
          </p>
        </div>

        {selectedSession && (
          <button
            onClick={() => setSelectedSession(null)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-hairline rounded bg-surface text-xs font-mono font-semibold text-ink hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Sessions
          </button>
        )}
      </div>

      {selectedSession ? (
        /* Single Session Detail View */
        <div className="space-y-6">
          {/* Metadata banner */}
          <div className="p-5 rounded bg-surface border border-hairline editorial-shadow grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-muted block text-[10px] uppercase">Subject &amp; Division</span>
              <strong className="text-ink font-serif text-base block">{selectedSession.subject}</strong>
              <span className="text-muted">{selectedSession.division}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Date &amp; Slot</span>
              <strong className="text-ink text-sm block">{selectedSession.date}</strong>
              <span className="text-muted">{selectedSession.slot}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Recorded Faculty</span>
              <strong className="text-ink text-sm block">{selectedSession.createdByName}</strong>
              <span className="text-teal font-semibold">Verified via Rekognition</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Turnout Statistics</span>
              <strong className="text-teal text-sm block">
                {selectedSession.stats.presentCount} Present / {selectedSession.stats.absentCount} Absent
              </strong>
              <span className="text-muted">
                {Math.round((selectedSession.stats.presentCount / selectedSession.stats.rosterCount) * 100)}% attendance
              </span>
            </div>
          </div>

          {/* Records Table */}
          <div className="rounded border border-hairline bg-surface editorial-shadow overflow-hidden">
            <div className="p-4 border-b border-hairline bg-paper/50 flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-ink">
                Classroom Roster Attendance Log ({selectedSession.records.length} students)
              </span>
              <span className="text-xs font-mono text-muted">Session ID: {selectedSession.sessionId}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-hairline bg-paper/30 text-muted uppercase tracking-wider text-[10px]">
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Verification Method</th>
                    <th className="p-3">Confidence Score</th>
                    <th className="p-3">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {selectedSession.records.map((r) => (
                    <tr key={r.studentId} className="hover:bg-surface-hover">
                      <td className="p-3 font-bold text-ink">{r.rollNumber}</td>
                      <td className="p-3 font-serif font-medium text-ink">{r.studentName}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            r.status === 'present'
                              ? 'bg-teal/15 text-teal border-teal/30'
                              : r.status === 'manual'
                              ? 'bg-marigold/15 text-marigold border-marigold/30'
                              : 'bg-brick/15 text-brick border-brick/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted">
                        {r.method === 'face' ? 'Amazon Rekognition' : 'Manual Faculty Override'}
                      </td>
                      <td className="p-3">
                        {r.confidence > 0 ? (
                          <span className="font-semibold text-teal">{r.confidence}%</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted">{r.reason || 'Standard biometric match'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Sessions List */
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <Filter className="w-4 h-4" />
            <span>Filter Subject:</span>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono rounded border border-hairline bg-paper text-ink"
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

          {loading ? (
            <div className="py-16 text-center text-xs font-mono text-muted">Loading session logs...</div>
          ) : (
            <div className="rounded border border-hairline bg-surface editorial-shadow divide-y divide-hairline">
              {filteredSessions.map((sess) => {
                const turnout = Math.round((sess.stats.presentCount / sess.stats.rosterCount) * 100);
                return (
                  <div
                    key={sess.sessionId}
                    onClick={() => setSelectedSession(sess)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface-hover transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-serif font-bold text-base text-ink">{sess.subject}</h3>
                        <span className="px-2 py-0.2 rounded text-[11px] font-mono bg-paper border border-hairline font-bold text-ink">
                          {sess.division}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {sess.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {sess.slot}
                        </span>
                        <span>Faculty: {sess.createdByName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono text-xs">
                        <div className="font-bold text-teal">{sess.stats.presentCount} of {sess.stats.rosterCount} Present</div>
                        <div className="text-[11px] text-muted">{turnout}% Turnout</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
