import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../../types';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { EnrollmentStudioModal } from '../../components/enrollment/EnrollmentStudioModal';
import { CSVImportModal } from '../../components/enrollment/CSVImportModal';
import { StudentDetailDrawer } from '../../components/enrollment/StudentDetailDrawer';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users, Search, Filter, Plus, FileSpreadsheet,
  ChevronLeft, ChevronRight, Camera, MoreVertical, X
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const { success, error } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<'all' | 'TE-A' | 'TE-B' | 'TE-C'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enrolled' | 'partial' | 'not_enrolled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<Student | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  // New Student Form state
  const [newRoll, setNewRoll] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDivision, setNewDivision] = useState<'TE-A' | 'TE-B' | 'TE-C'>('TE-A');
  const [newPhone, setNewPhone] = useState('');

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await api.students.list();
      setStudents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Filtered & Paginated records
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());

      const matchesDivision = divisionFilter === 'all' || s.division === divisionFilter;
      const matchesStatus = statusFilter === 'all' || s.enrollmentState === statusFilter;

      return matchesSearch && matchesDivision && matchesStatus;
    });
  }, [students, search, divisionFilter, statusFilter]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.students.create({
        studentId: newRoll.trim().toUpperCase(),
        name: newName.trim(),
        email: newEmail.trim(),
        division: newDivision,
        year: 3,
        phone: newPhone.trim(),
        status: 'active'
      });
      success(`Added student ${newName} (${newRoll}).`);
      setIsAddModalOpen(false);
      setNewRoll('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      loadStudents();
    } catch (err: any) {
      error(err.message || 'Failed to add student');
    }
  };

  const getStatusBadge = (state: Student['enrollmentState']) => {
    switch (state) {
      case 'enrolled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal/15 border border-teal/30 text-teal">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" /> Enrolled
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-marigold/15 border border-marigold/30 text-marigold">
            <span className="w-1.5 h-1.5 rounded-full bg-marigold" /> Partial
          </span>
        );
      case 'not_enrolled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brick/15 border border-brick/30 text-brick">
            <span className="w-1.5 h-1.5 rounded-full bg-brick" /> Not Enrolled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-marigold" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">Student Registry</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage student rosters, division allocations, and facial biometric enrollment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-hairline rounded bg-surface hover:bg-surface-hover text-xs font-mono font-semibold text-ink transition-colors editorial-shadow"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal" /> CSV Bulk Import
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-marigold text-ink rounded text-xs font-serif font-bold hover:brightness-105 transition-all editorial-shadow"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded bg-surface border border-hairline editorial-shadow flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, roll number, or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded border border-hairline bg-paper text-ink focus:outline-hidden focus:border-marigold"
          />
        </div>

        {/* Division & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs font-mono text-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Division:</span>
          </div>
          <select
            value={divisionFilter}
            onChange={(e) => {
              setDivisionFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 text-xs font-mono rounded border border-hairline bg-paper text-ink"
          >
            <option value="all">All Divisions</option>
            <option value="TE-A">TE-A</option>
            <option value="TE-B">TE-B</option>
            <option value="TE-C">TE-C</option>
          </select>

          <span className="text-hairline">|</span>

          <div className="flex items-center gap-1 text-xs font-mono text-muted">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 text-xs font-mono rounded border border-hairline bg-paper text-ink"
          >
            <option value="all">All Statuses</option>
            <option value="enrolled">Enrolled</option>
            <option value="partial">Partial</option>
            <option value="not_enrolled">Not Enrolled</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="rounded border border-hairline bg-surface editorial-shadow overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-muted">Loading student directory...</div>
        ) : paginatedStudents.length === 0 ? (
          <EmptyState
            title="No students match the criteria"
            description="Try adjusting your search query, division filter, or add a new student."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearch('');
              setDivisionFilter('all');
              setStatusFilter('all');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-paper/60 text-[11px] font-mono text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Division</th>
                  <th className="py-3 px-4">Biometric Status</th>
                  <th className="py-3 px-4">Rekognition Vectors</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs font-mono">
                {paginatedStudents.map((student) => (
                  <tr
                    key={student.studentId}
                    onClick={() => setSelectedStudentForDetail(student)}
                    className="hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatarUrl || '/favicon.svg'}
                          alt={student.name}
                          className="w-8 h-8 rounded bg-paper border border-hairline shrink-0"
                        />
                        <div>
                          <div className="font-serif font-bold text-ink text-sm leading-tight">
                            {student.name}
                          </div>
                          <div className="text-[11px] text-muted truncate max-w-[180px]">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-ink">{student.studentId}</td>
                    <td className="py-3 px-4 text-muted">
                      <span className="px-1.5 py-0.5 rounded bg-paper border border-hairline">
                        {student.division}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(student.enrollmentState)}</td>
                    <td className="py-3 px-4 text-muted">
                      {student.faceIds?.length || 0} templates
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedStudentForEnroll(student)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-hairline bg-paper hover:bg-surface-hover text-xs font-semibold text-ink transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-marigold" />
                        <span>{student.enrollmentState === 'enrolled' ? 'Manage' : 'Enroll'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-hairline bg-paper/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted">
          <div>
            Showing <strong className="text-ink">{paginatedStudents.length}</strong> of{' '}
            <strong className="text-ink">{filteredStudents.length}</strong> students (Total: {students.length})
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-hairline bg-surface hover:bg-surface-hover text-ink disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-ink px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-hairline bg-surface hover:bg-surface-hover text-ink disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-surface border border-hairline rounded max-w-md w-full editorial-shadow-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4">
              <h3 className="font-serif font-bold text-lg text-ink">Add New Student</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TE-C-41"
                  value={newRoll}
                  onChange={(e) => setNewRoll(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink font-mono text-xs focus:outline-hidden focus:border-marigold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Riya Mukherjee"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs focus:outline-hidden focus:border-marigold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="riya.m@engg.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs focus:outline-hidden focus:border-marigold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1">Division</label>
                  <select
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs font-mono"
                  >
                    <option value="TE-A">TE-A</option>
                    <option value="TE-B">TE-B</option>
                    <option value="TE-C">TE-C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-muted mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98201 00000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-hairline bg-paper text-ink text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-hairline flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-hairline rounded text-xs font-medium text-ink hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-marigold text-ink rounded text-xs font-semibold hover:brightness-105 editorial-shadow"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Studio Modal */}
      {selectedStudentForEnroll && (
        <EnrollmentStudioModal
          student={selectedStudentForEnroll}
          isOpen={!!selectedStudentForEnroll}
          onClose={() => setSelectedStudentForEnroll(null)}
          onSuccess={() => {
            loadStudents();
          }}
        />
      )}

      {/* CSV Bulk Import Modal */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onSuccess={() => loadStudents()}
      />

      {/* Student Detail Slide-Over */}
      <StudentDetailDrawer
        student={selectedStudentForDetail}
        isOpen={!!selectedStudentForDetail}
        onClose={() => setSelectedStudentForDetail(null)}
        onOpenEnrollment={(st) => {
          setSelectedStudentForDetail(null);
          setSelectedStudentForEnroll(st);
        }}
        onStudentUpdated={() => loadStudents()}
      />
    </div>
  );
};
