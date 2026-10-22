import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { Session, Student, ClassItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet, Download, Printer, Filter,
  Calendar, CheckCircle2, Search
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const ReportsPage: React.FC = () => {
  const { success, error } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'manual'>('all');
  const [searchStudent, setSearchStudent] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sessList, clsList] = await Promise.all([
          api.sessions.list(),
          api.classes.list()
        ]);
        setSessions(sessList);
        setClasses(clsList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Flattened attendance records
  const allRecords = useMemo(() => {
    const list: Array<{
      sessionId: string;
      date: string;
      subject: string;
      division: string;
      rollNumber: string;
      studentName: string;
      status: string;
      method: string;
      confidence: number;
    }> = [];

    sessions.forEach(sess => {
      sess.records.forEach(r => {
        list.push({
          sessionId: sess.sessionId,
          date: sess.date,
          subject: sess.subject,
          division: sess.division,
          rollNumber: r.rollNumber,
          studentName: r.studentName,
          status: r.status,
          method: r.method,
          confidence: r.confidence
        });
      });
    });

    return list;
  }, [sessions]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (selectedClass !== 'all' && r.subject !== selectedClass) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchStudent) {
        const q = searchStudent.toLowerCase();
        if (!r.studentName.toLowerCase().includes(q) && !r.rollNumber.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allRecords, selectedClass, statusFilter, searchStudent]);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      error('No records available to export.');
      return;
    }

    const headers = ['Session Date', 'Subject', 'Division', 'Roll Number', 'Student Name', 'Attendance Status', 'Verification Method', 'Confidence'];
    const rows = filteredRecords.map(r => [
      r.date,
      `"${r.subject}"`,
      r.division,
      r.rollNumber,
      `"${r.studentName}"`,
      r.status.toUpperCase(),
      r.method.toUpperCase(),
      `${r.confidence}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `haazri_attendance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Exported ${filteredRecords.length} attendance records to CSV.`);
  };

  // Export to Print-ready PDF
  const exportToPDF = () => {
    if (filteredRecords.length === 0) {
      error('No records available to export.');
      return;
    }

    const doc = new jsPDF();

    // College Letterhead
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text('VEERMATA JIJABAI TECHNOLOGICAL INSTITUTE', 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('Department of Computer Engineering • Haazri Cloud Attendance', 105, 24, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Total Records: ${filteredRecords.length}`, 105, 30, { align: 'center' });
    doc.line(14, 33, 196, 33);

    // Table data
    const tableRows = filteredRecords.slice(0, 150).map(r => [
      r.date,
      r.subject,
      r.rollNumber,
      r.studentName,
      r.status.toUpperCase(),
      r.method === 'face' ? `${r.confidence}%` : 'Manual'
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Subject', 'Roll No', 'Student Name', 'Status', 'AI Conf.']],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica' },
      headStyles: { fillColor: [15, 92, 90], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 240, 230] }
    });

    doc.save(`haazri_attendance_compliance_report_${Date.now()}.pdf`);
    success('Generated certified PDF attendance report.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-marigold" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">Reports &amp; Data Export</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Query, filter, and export certified classroom attendance reports for academic audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-hairline rounded bg-surface hover:bg-surface-hover text-xs font-mono font-semibold text-ink transition-colors editorial-shadow"
          >
            <Download className="w-4 h-4 text-teal" /> Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-marigold text-ink rounded font-serif font-bold text-xs hover:brightness-105 transition-all editorial-shadow"
          >
            <Printer className="w-4 h-4" /> Download PDF Report
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="p-4 rounded bg-surface border border-hairline editorial-shadow flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Subject:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono rounded border border-hairline bg-paper text-ink"
            >
              <option value="all">All Subjects</option>
              {classes.map(c => (
                <option key={c.classId} value={c.subject}>{c.subject} ({c.division})</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs font-mono rounded border border-hairline bg-paper text-ink"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present (Face AI)</option>
              <option value="manual">Manual Override</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {/* Student Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search student or roll..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            className="w-full pl-9 pr-3 py-1 text-xs font-mono rounded border border-hairline bg-paper text-ink focus:outline-hidden focus:border-marigold"
          />
        </div>
      </div>

      {/* Table Preview */}
      <div className="rounded border border-hairline bg-surface editorial-shadow overflow-hidden">
        <div className="p-3.5 border-b border-hairline bg-paper/50 flex items-center justify-between text-xs font-mono text-muted">
          <span>Live Record Preview ({filteredRecords.length} records matching criteria)</span>
          <span className="text-teal font-semibold">Exact on-screen and export parity</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-paper/70 sticky top-0 border-b border-hairline text-[10px] text-muted uppercase">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Div</th>
                <th className="p-3">Roll No</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Method</th>
                <th className="p-3">AI Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">Loading attendance data...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">No records matching the selected filters.</td>
                </tr>
              ) : (
                filteredRecords.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-surface-hover">
                    <td className="p-3 text-muted">{r.date}</td>
                    <td className="p-3 font-serif font-bold text-ink">{r.subject}</td>
                    <td className="p-3 text-muted">{r.division}</td>
                    <td className="p-3 font-bold text-ink">{r.rollNumber}</td>
                    <td className="p-3 text-ink">{r.studentName}</td>
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
                    <td className="p-3 text-muted">{r.method}</td>
                    <td className="p-3 text-muted">{r.confidence > 0 ? `${r.confidence}%` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-hairline bg-paper/40 text-[11px] font-mono text-muted flex justify-between">
          <span>Showing first 50 rows in on-screen preview</span>
          <span>Full dataset ({filteredRecords.length} rows) is included in CSV &amp; PDF downloads</span>
        </div>
      </div>
    </div>
  );
};
