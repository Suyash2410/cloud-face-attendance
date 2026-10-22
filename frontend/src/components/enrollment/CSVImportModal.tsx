import React, { useState } from 'react';
import Papa from 'papaparse';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Upload, AlertCircle, CheckCircle2, X, FileSpreadsheet } from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { success, error } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const errors: string[] = [];

        // Validate required headers: rollNumber, name, email, division
        const requiredHeaders = ['rollNumber', 'name', 'email', 'division'];
        const firstRow = rows[0] || {};
        const missing = requiredHeaders.filter(h => !(h in firstRow));
        if (missing.length > 0) {
          errors.push(`Missing mandatory CSV header columns: ${missing.join(', ')}`);
        }

        // Validate individual rows
        const seenRolls = new Set<string>();
        rows.forEach((r, idx) => {
          if (!r.rollNumber) errors.push(`Row ${idx + 1}: Missing rollNumber`);
          if (!r.name) errors.push(`Row ${idx + 1}: Missing name`);
          if (!r.email) errors.push(`Row ${idx + 1}: Missing email`);
          if (r.rollNumber && seenRolls.has(r.rollNumber.trim().toUpperCase())) {
            errors.push(`Row ${idx + 1}: Duplicate rollNumber "${r.rollNumber}" within CSV`);
          }
          if (r.rollNumber) seenRolls.add(r.rollNumber.trim().toUpperCase());
        });

        setParsedRows(rows);
        setValidationErrors(errors);
      },
      error: (err) => {
        setValidationErrors([`Failed to parse CSV file: ${err.message}`]);
      }
    });
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    if (validationErrors.length > 0) {
      error('Please resolve validation errors before importing.');
      return;
    }

    setIsImporting(true);
    try {
      const formatted = parsedRows.map(r => ({
        studentId: r.rollNumber.trim(),
        name: r.name.trim(),
        email: r.email.trim(),
        division: (r.division || 'TE-A').trim().toUpperCase() as any,
        year: Number(r.year) || 3,
        phone: r.phone || '',
        status: 'active' as const
      }));

      const res = await api.students.importCSV(formatted);
      if (res.errors.length > 0) {
        setValidationErrors(res.errors);
        error(`Imported ${res.added} students, but encountered ${res.errors.length} duplicate errors.`);
      } else {
        success(`Successfully imported ${res.added} students into the college registry.`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      error(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="bg-surface border border-hairline rounded max-w-2xl w-full editorial-shadow-lg flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-hairline flex items-center justify-between bg-paper/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal" />
            <h3 className="font-serif font-bold text-lg text-ink">Bulk Student Import (CSV)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-6 border-2 border-dashed border-hairline rounded bg-paper/40 text-center">
            <Upload className="w-8 h-8 text-marigold mx-auto mb-2" />
            <div className="text-sm font-serif font-bold text-ink mb-1">
              {file ? file.name : 'Choose a CSV file to upload'}
            </div>
            <p className="text-xs text-muted mb-3">
              Must include columns: <code className="font-mono text-ink">rollNumber, name, email, division, year</code>
            </p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-1.5 bg-surface border border-hairline rounded text-xs font-mono font-semibold text-ink hover:bg-surface-hover transition-colors editorial-shadow">
              <span>{file ? 'Change File' : 'Select CSV File'}</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* Validation preview table */}
          {parsedRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase text-muted">
                  Parsed Records ({parsedRows.length} rows)
                </span>
                {validationErrors.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-teal font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All rows valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-brick font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.length} errors found
                  </span>
                )}
              </div>

              {/* Error messages box */}
              {validationErrors.length > 0 && (
                <div className="p-3 rounded bg-brick/10 border border-brick/30 text-xs font-mono text-brick max-h-32 overflow-y-auto mb-3 space-y-1">
                  {validationErrors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {/* Table preview */}
              <div className="border border-hairline rounded overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-paper border-b border-hairline sticky top-0">
                    <tr>
                      <th className="p-2">Roll</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Division</th>
                      <th className="p-2">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {parsedRows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="hover:bg-surface-hover">
                        <td className="p-2 font-bold text-ink">{r.rollNumber}</td>
                        <td className="p-2 text-ink">{r.name}</td>
                        <td className="p-2 text-muted">{r.division}</td>
                        <td className="p-2 text-muted truncate max-w-[120px]">{r.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-hairline bg-paper/50 flex items-center justify-between">
          <a
            href="/scripts/sample_students.csv"
            download="sample_students.csv"
            className="text-xs font-mono text-muted hover:text-ink underline"
          >
            Download CSV template
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-hairline rounded text-xs font-medium text-ink hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              disabled={isImporting || parsedRows.length === 0 || validationErrors.length > 0}
              onClick={handleImport}
              className="px-4 py-2 rounded bg-marigold text-ink font-semibold text-xs disabled:opacity-50 hover:brightness-105 transition-all editorial-shadow"
            >
              {isImporting ? 'Importing...' : `Import ${parsedRows.length} Students`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
