import React, { useState, useEffect } from 'react';
import { ClassItem, Student } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen, Plus, Users, Calendar, Clock,
  CheckCircle2, X
} from 'lucide-react';
import { MOCK_TEACHERS } from '../../mock/seedData';

export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New class state
  const [subject, setSubject] = useState('');
  const [division, setDivision] = useState<'TE-A' | 'TE-B' | 'TE-C'>('TE-C');
  const [teacherId, setTeacherId] = useState(MOCK_TEACHERS[0].userId);
  const [schedule, setSchedule] = useState('Mon, Wed 10:00 AM');

  const loadData = async () => {
    setLoading(true);
    try {
      // In teacher mode, list only teacher's classes
      const teacherFilter = user?.role === 'teacher' ? user.userId : undefined;
      const [classList, studentList] = await Promise.all([
        api.classes.list(teacherFilter),
        api.students.list()
      ]);
      setClasses(classList);
      setStudents(studentList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignedTeacher = MOCK_TEACHERS.find(t => t.userId === teacherId) || MOCK_TEACHERS[0];
      const divStudents = students.filter(s => s.division === division).map(s => s.studentId);

      await api.classes.create({
        subject: subject.trim(),
        division,
        year: 3,
        teacherId: assignedTeacher.userId,
        teacherName: assignedTeacher.name,
        studentIds: divStudents,
        schedule: schedule.trim()
      });

      success(`Class "${subject} (${division})" created with ${divStudents.length} assigned students.`);
      setIsCreateOpen(false);
      setSubject('');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to create class');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-marigold" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
              {user?.role === 'teacher' ? 'My Assigned Classes' : 'Academic Class Roster'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {user?.role === 'teacher'
              ? 'Lectures and student rosters assigned to your faculty profile.'
              : 'Configure lecture classes, assign faculty, and manage student division rosters.'}
          </p>
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-marigold text-ink rounded text-xs font-serif font-bold hover:brightness-105 transition-all editorial-shadow"
          >
            <Plus className="w-4 h-4" /> Create Class
          </button>
        )}
      </div>

      {/* Class Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-muted">Loading class directories...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.classId}
              className="p-5 rounded bg-surface border border-hairline editorial-shadow flex flex-col justify-between hover:border-marigold/60 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-paper border border-hairline text-ink">
                    {cls.division} • Year {cls.year}
                  </span>
                  <span className="text-[11px] font-mono text-muted">{cls.classId}</span>
                </div>

                <h3 className="font-serif font-bold text-lg text-ink leading-snug mb-1">
                  {cls.subject}
                </h3>
                <p className="text-xs text-muted mb-4">
                  Faculty: <strong className="text-ink font-sans">{cls.teacherName}</strong>
                </p>
              </div>

              <div className="pt-3 border-t border-hairline space-y-2 text-xs font-mono text-muted">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal" /> Enrolled Students:
                  </span>
                  <span className="font-bold text-ink">{cls.studentIds.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-marigold" /> Schedule:
                  </span>
                  <span className="text-ink truncate max-w-[150px]">{cls.schedule}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo" /> Total Sessions:
                  </span>
                  <span className="font-bold text-ink">{cls.totalSessions} sessions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-surface border border-hairline rounded max-w-md w-full editorial-shadow-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4">
              <h3 className="font-serif font-bold text-lg text-ink">Create Academic Class</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Computing"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs focus:outline-hidden focus:border-marigold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1">Division</label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs font-mono"
                  >
                    <option value="TE-A">TE-A</option>
                    <option value="TE-B">TE-B</option>
                    <option value="TE-C">TE-C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1">Year</label>
                  <input
                    type="number"
                    disabled
                    value={3}
                    className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-muted text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Assigned Teacher</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs"
                >
                  {MOCK_TEACHERS.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Weekly Schedule</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mon, Wed 10:00 AM"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-hairline flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-hairline rounded text-xs font-medium text-ink hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-marigold text-ink rounded text-xs font-semibold hover:brightness-105 editorial-shadow"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
