import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { DashboardMetrics, WorkloadItem, Standup, ProjectOverviewItem, PeakPeriod, ProjectPhase, TimelineStatus } from '../types';
import { useAuthStore } from '../stores/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtWeekRange(iso: string) {
  const start = new Date(iso);
  const end = new Date(iso);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// ─── Phase & Timeline configs ─────────────────────────────────────────────────

const PHASE_CFG: Record<ProjectPhase, { bg: string; text: string; dot: string }> = {
  Analysis:    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-400' },
  Development: { bg: 'bg-primary-50', text: 'text-primary-700', dot: 'bg-primary-500' },
  Testing:     { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  Completed:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'On Hold':   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  Archived:    { bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
};

const TIMELINE_CFG: Record<TimelineStatus, { bg: string; text: string; border: string }> = {
  'On Track':  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'At Risk':   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  Delayed:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  Completed:   { bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200' },
};

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  'To Do':       { color: '#64748b', bg: '#f1f5f9' },
  'In Progress': { color: '#0088b9', bg: '#e6f3f8' },
  'Code Review': { color: '#d97706', bg: '#fef3c7' },
  'Testing':     { color: '#7c3aed', bg: '#ede9fe' },
  'Done':        { color: '#10b981', bg: '#d1fae5' },
};

// ─── Momentum Ring ────────────────────────────────────────────────────────────

function MomentumRing({ value, max, size = 80, stroke = 8, color, label }: {
  value: number; max: number; size?: number; stroke?: number; color: string; label: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const center = size / 2;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={center} cy={center} r={r} className="ring-track" strokeWidth={stroke} />
          <circle cx={center} cy={center} r={r} className="ring-progress" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-gray-800">{max > 0 ? `${Math.round(pct * 100)}%` : '—'}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-500 text-center">{label}</p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, trend, trendUp }: {
  label: string; value: string | number; icon: string; trend: string; trendUp: boolean;
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-2xl flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-extrabold text-gray-900 mt-0.5 leading-none">{value}</p>
        <p className={`text-xs font-semibold mt-1.5 ${trendUp ? 'text-success' : 'text-warning'}`}>
          {trendUp ? '↑' : '→'} {trend}
        </p>
      </div>
    </div>
  );
}

// ─── Project Portfolio Row ────────────────────────────────────────────────────

function ProjectRow({ project }: { project: ProjectOverviewItem }) {
  const { t } = useTranslation();
  const phase    = PHASE_CFG[project.phase] ?? PHASE_CFG.Analysis;
  const timeline = TIMELINE_CFG[project.timelineStatus] ?? TIMELINE_CFG['On Track'];
  const { total, done } = project.taskStats;
  const intTestDate = fmtDate(project.internalTestDate);
  const uatDate     = fmtDate(project.uatDate);
  const prodDate    = fmtDate(project.productionDate);
  const targetDate  = fmtDate(project.targetDate);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all">
      {/* Logo / initial */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center bg-primary-100 text-primary-700 font-bold text-sm shadow-sm">
        {project.logoUrl
          ? <img src={project.logoUrl} alt="" className="w-full h-full object-cover" />
          : project.name[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <p className="text-sm font-bold text-gray-900 truncate">{project.name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${phase.bg} ${phase.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${phase.dot}`} />
            {t(`projectPhase.${project.phase}`)}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${timeline.bg} ${timeline.text} ${timeline.border}`}>
            {project.timelineStatus === 'Delayed' && '⚠ '}
            {project.timelineStatus === 'At Risk' && '⏳ '}
            {t(`timelineStatus.${project.timelineStatus}`)}
            {project.daysUntilDeadline !== null && project.timelineStatus !== 'Completed' && (
              <span className="ml-1 opacity-70">
                ({project.daysUntilDeadline < 0
                  ? t('dashboard.portfolio.daysOverdue', { count: Math.abs(project.daysUntilDeadline) })
                  : project.daysUntilDeadline === 0
                    ? t('dashboard.portfolio.today')
                    : t('dashboard.portfolio.daysLeft', { count: project.daysUntilDeadline })})
              </span>
            )}
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${project.completionPct}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-600 flex-shrink-0">{project.completionPct}%</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{done}/{total} {t('dashboard.workload.tasks')}</span>
        </div>

        {/* Milestone dates */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs">
          {intTestDate && (
            <span className="flex items-center gap-1">
              <span>📋</span><span className="text-gray-400">{t('dashboard.portfolio.internalTest')}:</span>
              <span className="font-semibold text-gray-700">{intTestDate}</span>
            </span>
          )}
          {uatDate && (
            <span className="flex items-center gap-1">
              <span>🧪</span><span className="text-gray-400">{t('dashboard.portfolio.uat')}:</span>
              <span className="font-semibold text-gray-700">{uatDate}</span>
            </span>
          )}
          {prodDate && (
            <span className="flex items-center gap-1">
              <span>🚀</span><span className="text-gray-400">{t('dashboard.portfolio.production')}:</span>
              <span className="font-semibold text-gray-700">{prodDate}</span>
            </span>
          )}
          {!intTestDate && !uatDate && !prodDate && targetDate && (
            <span className="flex items-center gap-1">
              <span>📅</span><span className="text-gray-400">Target:</span>
              <span className="font-semibold text-gray-700">{targetDate}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-gray-400">
          <span className="font-semibold text-gray-600">{project.memberCount}</span> {t('common.members')}
        </span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isLeadDev = user?.role === 'Lead Team';
  const memberParam = isLeadDev && user?._id ? `?memberId=${user._id}` : '';

  const [metrics, setMetrics]               = useState<DashboardMetrics | null>(null);
  const [projectOverview, setProjectOverview] = useState<ProjectOverviewItem[]>([]);
  const [workload, setWorkload]             = useState<WorkloadItem[]>([]);
  const [peakPeriod, setPeakPeriod]         = useState<PeakPeriod | null>(null);
  const [blockers, setBlockers]             = useState<Standup[]>([]);
  const [loading, setLoading]               = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, projectsRes, workloadRes, blockersRes] = await Promise.all([
        api.get<{ data: { metrics: DashboardMetrics } }>(`/dashboard/metrics${memberParam}`),
        api.get<{ data: { projects: ProjectOverviewItem[] } }>(`/dashboard/projects${memberParam}`),
        api.get<{ data: { workload: WorkloadItem[]; peakPeriod: PeakPeriod | null } }>(`/dashboard/workload${memberParam}`),
        api.get<{ data: { blockers: Standup[] } }>('/dashboard/blockers'),
      ]);
      setMetrics(metricsRes.data.data?.metrics ?? null);
      setProjectOverview(projectsRes.data.data?.projects ?? []);
      setWorkload(workloadRes.data.data?.workload ?? []);
      setPeakPeriod(workloadRes.data.data?.peakPeriod ?? null);
      setBlockers(blockersRes.data.data?.blockers ?? []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, memberParam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-primary-500 font-medium">{t('common.loading')}…</p>
        </div>
      </div>
    );
  }

  const total      = metrics?.totalTasks ?? 0;
  const done       = metrics?.tasksByStatus?.find((s) => s._id === 'Done')?.count ?? 0;
  const inProgress = metrics?.tasksByStatus?.find((s) => s._id === 'In Progress')?.count ?? 0;

  const phaseCounts  = projectOverview.reduce<Record<string, number>>((acc, p) => { acc[p.phase] = (acc[p.phase] ?? 0) + 1; return acc; }, {});
  const delayedCount = projectOverview.filter((p) => p.timelineStatus === 'Delayed').length;
  const atRiskCount  = projectOverview.filter((p) => p.timelineStatus === 'At Risk').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            {isLeadDev && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
                My Projects
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary text-xs gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Momentum Rings */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Project Momentum</h2>
            <p className="text-xs text-gray-400 mt-0.5">Overall sprint health at a glance</p>
          </div>
          <span className="badge bg-primary-50 text-primary-700 border border-primary-100 text-xs">{total} total tasks</span>
        </div>
        <div className="flex items-center justify-around py-2">
          <MomentumRing value={done} max={total} color="#10b981" label="Completed" />
          <MomentumRing value={inProgress} max={total} color="#006782" label="In Progress" />
          <MomentumRing value={metrics?.completionRate ?? 0} max={100} color="#f59e0b" label="Velocity Rate" />
          <MomentumRing value={metrics?.totalUsers ?? 0} max={Math.max(metrics?.totalUsers ?? 1, 10)} color="#7c3aed" label="Active Members" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t('dashboard.totalTasks')}     value={total} icon="📋" trend={`${done} done`} trendUp={done > 0} />
        <KpiCard label={t('dashboard.completionRate')} value={`${metrics?.completionRate ?? 0}%`} icon="✅" trend={`${inProgress} in progress`} trendUp={(metrics?.completionRate ?? 0) > 50} />
        <KpiCard label={t('dashboard.totalProjects')}  value={projectOverview.length} icon="📁" trend={`${phaseCounts['Development'] ?? 0} in development`} trendUp={true} />
        <KpiCard label={t('dashboard.totalUsers')}     value={metrics?.totalUsers ?? 0} icon="👥" trend={`${blockers.length} active blockers`} trendUp={blockers.length === 0} />
      </div>

      {/* Project Portfolio */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-gray-800">{t('dashboard.portfolio.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Phases, milestones, and timeline health for all projects</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {delayedCount > 0 && <span className="badge bg-red-50 text-red-700 border border-red-200 text-xs">⚠ {delayedCount} delayed</span>}
            {atRiskCount  > 0 && <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">⏳ {atRiskCount} at risk</span>}
            <span className="badge bg-gray-100 text-gray-600 text-xs">{projectOverview.length} projects</span>
          </div>
        </div>

        {/* Phase summary strip */}
        {projectOverview.length > 0 && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 flex-wrap">
            {(Object.keys(PHASE_CFG) as ProjectPhase[]).map((phase) => {
              const count = phaseCounts[phase] ?? 0;
              if (count === 0) return null;
              const cfg = PHASE_CFG[phase];
              return (
                <span key={phase} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {count} {t(`projectPhase.${phase}`)}
                </span>
              );
            })}
          </div>
        )}

        {projectOverview.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">📁</p>
            <p className="text-sm font-medium">{t('dashboard.portfolio.noProjects')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projectOverview.map((p) => <ProjectRow key={p._id} project={p} />)}
          </div>
        )}
      </div>

      {/* Task Breakdown + Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Task Status Breakdown */}
        <div className="card">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Task Status Breakdown</h2>
          <div className="space-y-3.5">
            {(metrics?.tasksByStatus.length ?? 0) === 0 && <p className="text-gray-400 text-sm">No task data yet.</p>}
            {metrics?.tasksByStatus.map((s) => {
              const pct = total > 0 ? (s.count / total) * 100 : 0;
              const cfg = STATUS_CFG[s._id] ?? { color: '#64748b', bg: '#f1f5f9' };
              return (
                <div key={s._id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{s._id}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{s.count} {t('dashboard.workload.tasks')}</span>
                      {s.storyPoints > 0 && <><span className="text-gray-300">·</span><span>{s.storyPoints} pts</span></>}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cfg.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Workload */}
        <div className="card">
          <h2 className="text-sm font-bold text-gray-800 mb-3">{t('dashboard.workload.title')}</h2>

          {peakPeriod && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4">
              <span className="text-xl flex-shrink-0">📈</span>
              <div>
                <p className="text-xs font-bold text-amber-800">Team Peak Workload Period</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {t('dashboard.workload.peakPeriod', { range: fmtWeekRange(peakPeriod.weekStart), count: peakPeriod.taskCount })}
                </p>
              </div>
            </div>
          )}

          {workload.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">👋</p>
              <p className="text-sm">{t('dashboard.workload.noWorkload')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workload.map((w) => {
                const maxTasks = Math.max(...workload.map((x) => x.taskCount), 1);
                const pct = (w.taskCount / maxTasks) * 100;
                const isHeavy = pct === 100;
                return (
                  <div key={w._id} className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isHeavy ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                        {w.user.name[0].toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-success border border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{w.user.name}</p>
                          {w.user.role && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md flex-shrink-0">{t(`userRole.${w.user.role}`)}</span>
                          )}
                          {isHeavy && (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md flex-shrink-0">{t('dashboard.workload.heaviest')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-2 flex-shrink-0">
                          <span className={`font-semibold ${isHeavy ? 'text-amber-600' : 'text-gray-700'}`}>{w.taskCount}</span> {t('dashboard.workload.tasks')}
                          {w.totalStoryPoints > 0 && <><span className="text-gray-300">·</span><span>{w.totalStoryPoints} {t('dashboard.workload.storyPoints')}</span></>}
                        </div>
                      </div>
                      <div className="h-1.5 bg-primary-50 rounded-full">
                        <div className={`h-full rounded-full transition-all duration-700 ${isHeavy ? 'bg-amber-400' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Blocker Alerts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800">{t('dashboard.blockers.title')}</h2>
          {blockers.length > 0 && <span className="badge bg-red-50 text-danger border border-red-100">🚨 {blockers.length} open</span>}
        </div>
        {blockers.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800">All clear!</p>
              <p className="text-xs text-green-600">{t('dashboard.blockers.noBlockers')}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blockers.map((b) => {
              const u = typeof b.userId === 'object' ? b.userId : null;
              return (
                <div key={b._id} className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">
                    {u?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-red-700 mb-1">{u?.name ?? 'Unknown'}</p>
                    <p className="text-sm text-gray-700 leading-snug">{b.blockers}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
