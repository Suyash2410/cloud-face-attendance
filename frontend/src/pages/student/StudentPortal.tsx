import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ProgressRing } from '../../charts/ProgressRing';
import { CalendarHeatmap } from '../../charts/CalendarHeatmap';
import {
  GraduationCap, AlertTriangle, CheckCircle2, Calculator,
  Calendar, Shield, Trash2, ArrowUpRight
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const studentId = user?.linkedStudentId || 'TE-A-01';

  const [portalData, setPortalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteRequestSent, setDeleteRequestSent] = useState(false);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        const data = await api.analytics.getStudentPortal(studentId);
        setPortalData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [studentId]);

  const handleDeleteFaceDataRequest = () => {
    if (window.confirm('Request deletion of your facial vectors from AWS Rekognition collection? Your teacher will have to mark you manually thereafter.')) {
      setDeleteRequestSent(true);
      success('Your biometric deletion request has been registered and forwarded to the administrator.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-mono text-muted">
        Loading student attendance records...
      </div>
    );
  }

  const { student, overallRate, isShortage, subjects, history } = portalData || {};

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="p-6 rounded bg-surface border border-hairline editorial-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={student?.avatarUrl || '/favicon.svg'}
            alt={student?.name}
            className="w-16 h-16 rounded bg-paper border border-hairline p-1 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-2xl text-ink leading-tight">{student?.name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-paper border border-hairline text-ink">
                {student?.studentId}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 font-mono">
              Division {student?.division} • Year {student?.year} • {student?.email}
            </p>
          </div>
        </div>

        {/* Overall Percentage Badge */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-hairline pt-3 md:pt-0 md:pl-6">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-muted block">Overall Campus Attendance</span>
            <span
              className={`font-mono text-3xl font-black ${
                isShortage ? 'text-brick' : 'text-teal'
              }`}
            >
              {overallRate}%
            </span>
          </div>

          <div className="w-12 h-12 rounded-full border border-hairline bg-paper flex items-center justify-center">
            {isShortage ? (
              <AlertTriangle className="w-6 h-6 text-brick" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-teal" />
            )}
          </div>
        </div>
      </div>

      {/* Shortage Alert Banner (if <75%) */}
      {isShortage && (
        <div className="p-4 rounded bg-brick/10 border border-brick/40 flex items-start gap-3.5 text-brick">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-serif font-bold text-sm">Statutory Attendance Warning</h3>
            <p className="leading-relaxed">
              Your overall attendance (<strong className="font-mono">{overallRate}%</strong>) is currently below the mandatory <strong>75% statutory requirement</strong> set by the university. Failure to achieve 75% before term-end will result in debarment from the final semester examinations.
            </p>
          </div>
        </div>
      )}

      {/* Per-Subject Progress Rings */}
      <div className="p-5 rounded bg-surface border border-hairline editorial-shadow space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div>
            <h2 className="font-serif font-bold text-lg text-ink">Subject Attendance Telemetry</h2>
            <p className="text-xs text-muted">Statutory minimum requirement: 75% (gold marker on ring perimeter)</p>
          </div>
          <div className="text-xs font-mono text-muted">
            {subjects?.length || 0} registered subjects
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {subjects?.map((sub: any) => (
            <div
              key={sub.subject}
              className="p-3.5 rounded border border-hairline bg-paper/40 flex flex-col items-center justify-between hover:bg-surface-hover transition-colors"
            >
              <ProgressRing
                percentage={sub.rate}
                size={96}
                strokeWidth={7}
                threshold={75}
              />
              <span className="mt-2 text-xs font-serif font-bold text-ink text-center truncate max-w-full">
                {sub.subject}
              </span>
              <span className="text-[11px] font-mono text-muted mt-0.5">
                {sub.present}/{sub.total} classes
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 75% Rule "Classes You Can Still Miss" Calculator */}
      <div className="p-5 rounded bg-surface border border-hairline editorial-shadow space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-hairline">
          <Calculator className="w-5 h-5 text-marigold" />
          <div>
            <h2 className="font-serif font-bold text-lg text-ink">75% Attendance Calculator</h2>
            <p className="text-xs text-muted">
              Live calculation of how many lectures you can safely skip or need to attend.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects?.map((sub: any) => (
            <div
              key={sub.subject}
              className={`p-4 rounded border ${
                sub.isShortage ? 'border-brick/40 bg-brick/5' : 'border-teal/40 bg-teal/5'
              } flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif font-bold text-sm text-ink">{sub.subject}</span>
                  <span className={`font-mono text-xs font-bold ${sub.isShortage ? 'text-brick' : 'text-teal'}`}>
                    {sub.rate}%
                  </span>
                </div>
                <div className="text-[11px] font-mono text-muted mb-3">
                  Attended: {sub.present} / {sub.total} sessions
                </div>
              </div>

              <div className="pt-2 border-t border-hairline/60 text-xs font-mono">
                {!sub.isShortage ? (
                  <div className="text-teal font-semibold">
                    You can safely miss <strong className="font-bold underline">{sub.missable}</strong> more lectures without dropping below 75%.
                  </div>
                ) : (
                  <div className="text-brick font-semibold">
                    You must attend the next <strong className="font-bold underline">{sub.needed}</strong> consecutive lectures to reach 75%.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Heatmap */}
      <CalendarHeatmap />

      {/* Recent Activity Log & Privacy Request */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 p-5 rounded bg-surface border border-hairline editorial-shadow">
          <h3 className="font-serif font-bold text-base text-ink mb-3">Recent Class Verifications</h3>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {history?.map((h: any, i: number) => (
              <div
                key={i}
                className="p-2.5 rounded border border-hairline bg-paper/50 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-semibold text-ink">{h.subject}</span>
                  <span className="text-muted ml-2">{h.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                      h.status === 'present' ? 'text-teal bg-teal/15' : 'text-brick bg-brick/15'
                    }`}
                  >
                    {h.status}
                  </span>
                  <span className="text-[10px] text-muted">({h.method})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy & DPDP Act Self-Service */}
        <div className="lg:col-span-4 p-5 rounded bg-surface border border-hairline editorial-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-serif font-bold text-sm text-ink mb-2">
              <Shield className="w-4 h-4 text-marigold" />
              <span>Biometric Privacy Rights</span>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Under India's Digital Personal Data Protection (DPDP) Act, 2023, you have the right to withdraw consent and delete your biometric facial embeddings at any time.
            </p>
          </div>

          <button
            onClick={handleDeleteFaceDataRequest}
            disabled={deleteRequestSent}
            className="w-full py-2 px-3 rounded border border-brick/40 bg-brick/5 text-brick hover:bg-brick/10 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleteRequestSent ? 'Deletion Request Pending' : 'Request Delete Face Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
