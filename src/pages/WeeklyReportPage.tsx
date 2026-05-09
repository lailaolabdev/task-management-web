import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { Sprint, Team, WeeklyReportRow, Task, BlockedReason } from '../types';

const STATUS_STYLES: Record<string, string> = {
  'To Do': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Code Review': 'bg-purple-50 text-purple-700',
  'Testing': 'bg-yellow-50 text-yellow-700',
  'Done': 'bg-green-50 text-green-700',
};

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function WeeklyReportPage() {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [teamId, setTeamId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [rows, setRows] = useState<WeeklyReportRow[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ data: { teams: Team[] } }>('/teams').then((r) => setTeams(r.data.data?.teams ?? []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ year: String(year) });
    if (teamId) params.set('teamId', teamId);
    api
      .get<{ data: { sprints: Sprint[] } }>(`/sprints?${params.toString()}`)
      .then((r) => setSprints(r.data.data?.sprints ?? []));
  }, [year, teamId]);

  useEffect(() => {
    if (!sprintId) {
      setRows([]);
      setActiveSprint(null);
      setActiveTeam(null);
      return;
    }
    setLoading(true);
    api
      .get<{ data: { rows: WeeklyReportRow[]; sprint: Sprint; team: Team | null } }>(
        `/sprints/report/weekly?sprintId=${sprintId}`
      )
      .then((r) => {
        setRows(r.data.data?.rows ?? []);
        setActiveSprint(r.data.data?.sprint ?? null);
        setActiveTeam(r.data.data?.team ?? null);
      })
      .finally(() => setLoading(false));
  }, [sprintId]);

  const handleExport = () => {
    if (!sprintId) return;
    const token = (JSON.parse(localStorage.getItem('auth-storage') ?? '{}') as { state?: { token?: string } }).state
      ?.token;
    fetch(`${api.defaults.baseURL}/reports/weekly.xlsx?sprintId=${sprintId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weekly-report-${activeSprint?.weekNumber ?? 'sprint'}-${activeSprint?.year ?? ''}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('weeklyReport.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('weeklyReport.subtitle')}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!sprintId}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⬇ {t('weeklyReport.exportXlsx')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">{t('weeklyReport.year')}</label>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('weeklyReport.team')}</label>
            <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {teams.map((tm) => (
                <option key={tm._id} value={tm._id}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('weeklyReport.week')}</label>
            <select className="input" value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
              <option value="">— {t('weeklyReport.selectWeek')} —</option>
              {sprints.map((s) => (
                <option key={s._id} value={s._id}>
                  W{s.weekNumber} · {formatDate(s.startDate)} – {formatDate(s.endDate)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report */}
      {!sprintId && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400">
          {t('weeklyReport.pickWeekToView')}
        </div>
      )}

      {sprintId && loading && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400">
          {t('common.loading')}
        </div>
      )}

      {sprintId && !loading && rows.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400">
          {t('weeklyReport.noTasks')}
        </div>
      )}

      {sprintId && !loading && rows.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">
                {activeSprint ? `W${activeSprint.weekNumber} · ${formatDate(activeSprint.startDate)} – ${formatDate(activeSprint.endDate)}` : ''}
              </p>
              {activeTeam && <p className="text-xs text-gray-500">{activeTeam.name}</p>}
            </div>
          </div>

          {rows.map((row) => (
            <div key={row.user._id} className="border-b border-gray-100 last:border-b-0">
              {/* Member header */}
              <div className="px-4 py-2.5 bg-primary-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                    {row.user.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{row.user.name}</p>
                    <p className="text-[11px] text-gray-500">{row.user.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="badge bg-gray-100 text-gray-600">
                    {row.totals.total} {t('weeklyReport.tasks')}
                  </span>
                  <span className="badge bg-green-50 text-green-700">
                    ✓ {row.totals.done}
                  </span>
                  <span className="badge bg-blue-50 text-blue-700">
                    ⏵ {row.totals.inProgress}
                  </span>
                  {row.totals.blocked > 0 && (
                    <span className="badge bg-amber-50 text-amber-700">
                      ⏳ {row.totals.blocked}
                    </span>
                  )}
                </div>
              </div>

              {/* Projects + tasks */}
              {row.projects.map((p) => (
                <div key={p.project._id} className="px-4 py-2 border-t border-gray-50">
                  <p className="text-xs font-bold text-primary-700 mb-1.5">📂 {p.project.name}</p>
                  <table className="w-full text-xs">
                    <tbody>
                      {p.tasks.map((tk) => (
                        <TaskRow key={tk._id} task={tk} t={t} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, t }: { task: Task; t: (k: string) => string }) {
  return (
    <tr className="border-t border-gray-50">
      <td className="py-1.5 pr-2 align-top w-[55%]">
        <p className="text-gray-700 leading-snug">{task.title}</p>
        {task.description && (
          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{task.description}</p>
        )}
      </td>
      <td className="py-1.5 pr-2 align-top w-[8%]">
        {task.priorityLevel ? (
          <span className="badge bg-primary-100 text-primary-700 text-[10px] font-bold">
            P{task.priorityLevel}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-1.5 pr-2 align-top w-[10%] text-gray-500">
        {task.startDate ? new Date(task.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '—'}
      </td>
      <td className="py-1.5 pr-2 align-top w-[10%] text-gray-500">
        {task.endDate ? new Date(task.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '—'}
      </td>
      <td className="py-1.5 align-top w-[17%]">
        <span className={`badge text-[10px] ${STATUS_STYLES[task.status] ?? ''}`}>
          {t(`taskStatus.${task.status}`)}
        </span>
        {task.blockedReason && (
          <span className="badge bg-amber-50 text-amber-700 text-[10px] ml-1">
            {t(`blockedReason.${task.blockedReason as BlockedReason}`)}
          </span>
        )}
      </td>
    </tr>
  );
}
