import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/axios';

interface SheetInfo {
  name: string;
  rowCount: number;
}

interface PreviewData {
  sheetName: string;
  blocks: { weekLabel: string; weekNumber: number; taskCount: number }[];
  totalTasks: number;
  employees: string[];
  teams: string[];
  projects: string[];
}

interface ImportReport {
  sheet: string;
  weeks: { label: string; weekNumber: number; tasksFound: number }[];
  unmatched: { employees: string[]; statuses: string[]; teams: string[]; projects: string[] };
  created: { teams: number; sprints: number; projects: number; tasks: number };
  skipped: number;
}

export default function ImportPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (endpoint: string, extra?: Record<string, string>) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    if (extra) Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    const res = await api.post(endpoint, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return res.data?.data;
  };

  const onFileChosen = async (f: File | null) => {
    setFile(f);
    setSheets([]);
    setSelectedSheet('');
    setPreview(null);
    setReport(null);
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await api.post('/import/sheets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSheets(res.data?.data?.sheets ?? []);
    } catch {
      toast.error(t('import.readFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onPreview = async () => {
    if (!file || !selectedSheet) return;
    setBusy(true);
    try {
      const data = await upload('/import/preview', { sheetName: selectedSheet });
      setPreview(data);
      setReport(null);
    } catch {
      toast.error(t('import.previewFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onRun = async () => {
    if (!file || !selectedSheet) return;
    if (!confirm(t('import.confirmRun'))) return;
    setBusy(true);
    try {
      const data = await upload('/import/run', { sheetName: selectedSheet });
      setReport(data?.report ?? null);
      toast.success(t('import.runSuccess'));
    } catch {
      toast.error(t('import.runFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{t('import.title')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('import.subtitle')}</p>

      {/* Step 1: file picker */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <p className="text-sm font-bold text-gray-800 mb-3">{t('import.step1')}</p>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />
      </div>

      {/* Step 2: pick sheet */}
      {sheets.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
          <p className="text-sm font-bold text-gray-800 mb-3">{t('import.step2')}</p>
          <select
            className="input"
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
          >
            <option value="">— {t('import.chooseSheet')} —</option>
            {sheets.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.rowCount} rows)
              </option>
            ))}
          </select>
          <div className="mt-3 flex gap-2">
            <button className="btn-secondary" onClick={onPreview} disabled={!selectedSheet || busy}>
              {t('import.preview')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: preview + run */}
      {preview && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
          <p className="text-sm font-bold text-gray-800 mb-3">{t('import.step3')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label={t('import.totalTasks')} value={preview.totalTasks} />
            <Stat label={t('import.weeks')} value={preview.blocks.length} />
            <Stat label={t('import.uniqueEmployees')} value={preview.employees.length} />
            <Stat label={t('import.uniqueProjects')} value={preview.projects.length} />
          </div>
          <details className="text-xs mb-2">
            <summary className="cursor-pointer text-gray-600 font-semibold">
              {t('import.weeks')} ({preview.blocks.length})
            </summary>
            <ul className="mt-2 ml-4 list-disc text-gray-500">
              {preview.blocks.map((b) => (
                <li key={b.weekLabel}>
                  W{b.weekNumber}: {b.weekLabel} — {b.taskCount} tasks
                </li>
              ))}
            </ul>
          </details>
          <details className="text-xs mb-2">
            <summary className="cursor-pointer text-gray-600 font-semibold">
              {t('import.employeesFound')} ({preview.employees.length})
            </summary>
            <p className="mt-2 ml-4 text-gray-500">{preview.employees.join(', ')}</p>
          </details>
          <details className="text-xs mb-3">
            <summary className="cursor-pointer text-gray-600 font-semibold">
              {t('import.projectsFound')} ({preview.projects.length})
            </summary>
            <p className="mt-2 ml-4 text-gray-500">{preview.projects.slice(0, 50).join(', ')}{preview.projects.length > 50 ? '…' : ''}</p>
          </details>
          <button className="btn-primary" onClick={onRun} disabled={busy}>
            {t('import.runImport')}
          </button>
        </div>
      )}

      {/* Step 4: result */}
      {report && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm font-bold text-gray-800 mb-3">{t('import.result')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Stat label={t('import.tasksCreated')} value={report.created.tasks} tone="success" />
            <Stat label={t('import.projectsCreated')} value={report.created.projects} tone="success" />
            <Stat label={t('import.sprintsCreated')} value={report.created.sprints} tone="success" />
            <Stat label={t('import.skipped')} value={report.skipped} tone="warning" />
          </div>
          {report.unmatched.employees.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-amber-700">⚠ {t('import.unmatchedEmployees')}</p>
              <p className="text-xs text-amber-600 ml-4">{report.unmatched.employees.join(', ')}</p>
              <p className="text-[11px] text-gray-500 ml-4 mt-1">{t('import.unmatchedEmployeesHint')}</p>
            </div>
          )}
          {report.unmatched.statuses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700">⚠ {t('import.unmatchedStatuses')}</p>
              <p className="text-xs text-amber-600 ml-4">{report.unmatched.statuses.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'warning' }) {
  const color =
    tone === 'success' ? 'text-green-700 bg-green-50 border-green-200' :
    tone === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-gray-700 bg-gray-50 border-gray-200';
  return (
    <div className={`border rounded-lg px-3 py-2 ${color}`}>
      <p className="text-[10px] uppercase font-bold tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
