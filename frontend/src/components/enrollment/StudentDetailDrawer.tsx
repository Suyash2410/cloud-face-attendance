import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { ProgressRing } from '../../charts/ProgressRing';
import {
  X, Camera, Trash2, Mail, Phone, Calendar,
  ShieldCheck, AlertTriangle
} from 'lucide-react';

interface StudentDetailDrawerProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenEnrollment: (student: Student) => void;
  onStudentUpdated: () => void;
}

export const StudentDetailDrawer: React.FC<StudentDetailDrawerProps> = ({
  student,
  isOpen,
  onClose,
  onOpenEnrollment,
  onStudentUpdated
}) => {
  const { success, error } = useToast();
  const [portalData, setPortalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student && isOpen) {
      setLoading(true);
      api.analytics.getStudentPortal(student.studentId)
        .then(data => setPortalData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleDeleteStudent = async () => {
    if (!window.confirm(`Permanently delete ${student.name} (${student.studentId})? This will also purge their facial vectors and S3 photos.`)) {
      return;
    }
    try {
      await api.students.delete(student.studentId);
      success(`Deleted student ${student.name} and purged biometric face data.`);
      onStudentUpdated();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to delete student');
    }
  };

  const badgeConfig = {
    enrolled: { bg: 'bg-teal/15', border: 'border-teal/30', text: 'text-teal', label: 'Enrolled' },
    partial: { bg: 'bg-marigold/15', border: 'border-marigold/30', text: 'text-marigold', label: 'Partial' },
    not_enrolled: { bg: 'bg-brick/15', border: 'border-brick/30', text: 'text-brick', label: 'Not Enrolled' }
  }[student.enrollmentState];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" />

      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-surface border-l border-hairline shadow-2xl flex flex-col z-50">
        {/* Drawer Header */}
        <div className="p-5 border-b border-hairline flex items-center justify-between bg-paper/50">
          <div className="flex items-center gap-3">
            <img
              src={student.avatarUrl || '/favicon.svg'}
              alt={student.name}
              className="w-12 h-12 rounded border border-hairline bg-paper p-0.5"
            />
            <div>
              <h3 className="font-serif font-bold text-lg text-ink leading-tight">{student.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-muted">{student.studentId}</span>
                <span className={`px-2 py-0.2 rounded text-[10px] font-mono uppercase font-bold border ${badgeConfig.bg} ${badgeConfig.border} ${badgeConfig.text}`}>
                  {badgeConfig.label}
                </span>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Metadata Card */}
          <div className="p-4 rounded border border-hairline bg-paper/50 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-muted">Division &amp; Year:</span>
              <span className="font-bold text-ink">{student.division} • Year {student.year}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email:</span>
              <span className="font-semibold text-ink truncate max-w-[200px]">{student.email}</span>
            </div>
            {student.phone && (
              <div className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone:</span>
                <span className="font-semibold text-ink">{student.phone}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Registered:</span>
              <span className="text-muted">{new Date(student.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Biometric Status */}
          <div className="p-4 rounded border border-hairline bg-surface editorial-shadow space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-serif font-bold text-sm text-ink">
                <ShieldCheck className="w-4 h-4 text-teal" />
                <span>AWS Rekognition Vector Index</span>
              </div>
              <span className="font-mono text-xs text-muted">
                {student.faceIds?.length || 0} templates
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {student.enrollmentState === 'enrolled' ? (
                `Biometric face embeddings active in Rekognition collection 'haazri-faces'. Consent verified on ${
                  student.consentAt ? new Date(student.consentAt).toLocaleDateString() : 'N/A'
                }.`
              ) : (
                'No face vectors currently indexed. Student will be marked absent in photo attendance runs until enrolled.'
              )}
            </p>

            <button
              onClick={() => onOpenEnrollment(student)}
              className="w-full py-2 px-3 rounded bg-marigold text-ink font-semibold text-xs hover:brightness-105 transition-all editorial-shadow flex items-center justify-center gap-2"
            >
              <Camera className="w-3.5 h-3.5" />
              {student.enrollmentState === 'enrolled' ? 'Manage & Re-enroll Faces' : 'Enroll Face Biometrics'}
            </button>
          </div>

          {/* Attendance Stats & Progress Rings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-serif font-bold text-sm text-ink">Attendance Telemetry</span>
              {portalData && (
                <span className={`font-mono text-xs font-bold ${portalData.isShortage ? 'text-brick' : 'text-teal'}`}>
                  Overall: {portalData.overallRate}%
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs font-mono text-muted">Loading telemetry...</div>
            ) : portalData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {portalData.subjects.slice(0, 4).map((sub: any) => (
                    <div key={sub.subject} className="p-3 rounded border border-hairline bg-paper/40 flex flex-col items-center">
                      <ProgressRing
                        percentage={sub.rate}
                        size={84}
                        strokeWidth={6}
                        threshold={75}
                      />
                      <span className="mt-2 text-[11px] font-bold text-ink truncate max-w-full text-center">
                        {sub.subject}
                      </span>
                      <span className="text-[10px] font-mono text-muted">
                        {sub.present}/{sub.total} classes
                      </span>
                    </div>
                  ))}
                </div>

                {portalData.isShortage && (
                  <div className="p-3 rounded bg-brick/10 border border-brick/30 text-xs text-brick flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Attendance has fallen below the 75% minimum statutory cutoff. Student is flagged in exam hall eligibility audit.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-hairline bg-paper/50 flex justify-between items-center">
          <button
            onClick={handleDeleteStudent}
            className="text-xs font-mono text-brick hover:underline flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Student Record
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-hairline rounded text-xs font-medium text-ink hover:bg-surface-hover"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
