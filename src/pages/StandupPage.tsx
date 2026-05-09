import { useEffect, useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { Standup, StandupComment, Project, User } from '../types';
import { useAuthStore } from '../stores/authStore';

const PRIVILEGED_ROLES = ['Admin', 'Project Manager'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(iso);
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  return (
    <div className={`${sizeClass} rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ─── Standup Content View ─────────────────────────────────────────────────────

function StandupView({ standup, compact = false }: { standup: Standup; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold text-primary-500/60 uppercase tracking-widest mb-1">{t('standup.yesterday')}</p>
        <p className={`text-gray-700 ${compact ? 'text-xs line-clamp-2' : 'text-sm'}`}>{standup.yesterday}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-primary-500/60 uppercase tracking-widest mb-1">{t('standup.today')}</p>
        <p className={`text-gray-700 ${compact ? 'text-xs line-clamp-2' : 'text-sm'}`}>{standup.today}</p>
      </div>
      {standup.blockers && (
        <div>
          <p className="text-[10px] font-bold text-danger/70 uppercase tracking-widest mb-1">{t('standup.blockers')}</p>
          <p className={`text-danger/80 ${compact ? 'text-xs line-clamp-1' : 'text-sm'}`}>{standup.blockers}</p>
        </div>
      )}
    </div>
  );
}

// ─── Standup Detail Modal (for Admin/PM) ─────────────────────────────────────

function StandupDetailModal({
  standup,
  onClose,
}: {
  standup: Standup;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<StandupComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const submitter = typeof standup.userId === 'object' ? standup.userId as User : null;
  const project = typeof standup.projectId === 'object' ? standup.projectId as Project : null;

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get<{ data: { comments: StandupComment[] } }>(`/standups/${standup._id}/comments`);
      setComments(res.data.data?.comments ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoadingComments(false);
    }
  }, [standup._id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  useEffect(() => {
    if (comments.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  const postComment = async () => {
    if (!commentBody.trim()) return;
    setPosting(true);
    try {
      await api.post(`/standups/${standup._id}/comments`, { body: commentBody.trim() });
      setCommentBody('');
      fetchComments();
    } catch {
      toast.error(t('standup.postFailed'));
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      postComment();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {submitter && <Avatar name={submitter.name} size="lg" />}
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">{submitter?.name ?? 'Unknown'}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {submitter?.role && (
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{submitter.role}</span>
                )}
                {project && (
                  <>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-primary-600 font-medium">{project.name}</span>
                  </>
                )}
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-400">{fmtDate(standup.date)} at {fmtTime(standup.date)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Standup content + comments */}
        <div className="flex-1 overflow-y-auto">
          {/* Standup fields */}
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-primary-500/60 uppercase tracking-widest mb-1.5">{t('standup.yesterday')}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{standup.yesterday}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary-500/60 uppercase tracking-widest mb-1.5">{t('standup.today')}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{standup.today}</p>
            </div>
            {standup.blockers && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-[10px] font-bold text-danger/70 uppercase tracking-widest mb-1.5">{t('standup.blockers')}</p>
                <p className="text-sm text-danger/80 leading-relaxed">{standup.blockers}</p>
              </div>
            )}
          </div>

          {/* Comments section */}
          <div className="border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 pt-4 pb-2">
              {t('standup.comments')} {comments.length > 0 && `(${comments.length})`}
            </p>

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <span className="w-5 h-5 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 px-5">{t('standup.noComments')}</p>
            ) : (
              <div className="px-5 pb-2 space-y-3">
                {comments.map((c) => {
                  const commenter = typeof c.userId === 'object' ? c.userId as User : null;
                  return (
                    <div key={c._id} className="flex gap-2.5">
                      {commenter && <Avatar name={commenter.name} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-800">{commenter?.name ?? 'Unknown'}</span>
                          <span className="text-[10px] text-gray-400">{fmtRelative(c.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{c.body}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Comment input (Admin/PM only) */}
        {PRIVILEGED_ROLES.includes(user?.role ?? '') && (
          <div className="border-t border-gray-100 p-4 flex-shrink-0">
            <div className="flex gap-2.5 items-end">
              {user && <Avatar name={user.name} size="sm" />}
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('standup.commentHint')}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 placeholder-gray-400"
                />
              </div>
              <button
                onClick={postComment}
                disabled={posting || !commentBody.trim()}
                className="btn-primary text-xs px-3 py-2 self-end"
              >
                {posting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                ) : t('standup.postComment')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team Standups View (Admin / Project Manager) ─────────────────────────────

function TeamStandupsView() {
  const { t } = useTranslation();
  const [standups, setStandups] = useState<Standup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Standup | null>(null);

  useEffect(() => {
    api.get<{ data: { projects: Project[] } }>('/projects')
      .then((r) => setProjects(r.data.data?.projects ?? []))
      .catch(() => {});
  }, []);

  const fetchStandups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      if (projectFilter) params.set('projectId', projectFilter);
      const res = await api.get<{ data: { standups: Standup[] } }>(`/standups?${params.toString()}`);
      setStandups(res.data.data?.standups ?? []);
    } catch {
      toast.error(t('standup.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [dateFilter, projectFilter, t]);

  useEffect(() => { fetchStandups(); }, [fetchStandups]);

  const filtered = standups.filter((s) => {
    if (!search) return true;
    const submitter = typeof s.userId === 'object' ? (s.userId as User).name : '';
    return submitter.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input text-sm w-auto"
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="input text-sm w-auto"
        >
          <option value="">{t('standup.allProjects')}</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[160px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder={t('standup.searchByMember')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-sm pl-8 w-full"
          />
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{t('standup.submissions', { count: filtered.length })}</span>
        {dateFilter && (
          <span>for {new Date(dateFilter + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="w-7 h-7 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-semibold text-gray-500">{t('standup.noSubmissions')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('standup.noSubmissionsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const submitter = typeof s.userId === 'object' ? s.userId as User : null;
            const project = typeof s.projectId === 'object' ? s.projectId as Project : null;
            const hasBlockers = !!s.blockers;

            return (
              <button
                key={s._id}
                onClick={() => setSelected(s)}
                className="w-full text-left card hover:border-primary-200 hover:shadow-sm transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {submitter && <Avatar name={submitter.name} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-gray-900">{submitter?.name ?? 'Unknown'}</span>
                      {submitter?.role && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
                          {submitter.role}
                        </span>
                      )}
                      {project && (
                        <span className="text-xs text-primary-600 font-medium bg-primary-50 px-1.5 py-0.5 rounded">
                          {project.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{fmtTime(s.date)}</span>
                    </div>
                    <StandupView standup={s} compact />
                    {hasBlockers && (
                      <span className="inline-block mt-2 text-[10px] font-bold text-danger bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {t('standup.hasBlockers')}
                      </span>
                    )}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors mt-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <StandupDetailModal standup={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ─── My Standup View ──────────────────────────────────────────────────────────

type FormData = { projectId: string; yesterday: string; today: string; blockers: string };

function MyStandupView() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayStandup, setTodayStandup] = useState<Standup | null>(null);
  const [recentStandups, setRecentStandups] = useState<Standup[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Standup | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>();
  const selectedProject = watch('projectId');

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get<{ data: { projects: Project[] } }>('/projects');
      const p = res.data.data?.projects ?? [];
      setProjects(p);
      if (p.length > 0) setValue('projectId', p[0]._id);
    } catch {
      toast.error('Failed to load projects');
    }
  }, [setValue]);

  const fetchStandups = useCallback(async () => {
    try {
      const [todayRes, recentRes] = await Promise.all([
        api.get<{ data: { standup: Standup | null } }>('/standups/today'),
        api.get<{ data: { standups: Standup[] } }>(`/standups?userId=${user?._id}`),
      ]);
      const today = todayRes.data.data?.standup ?? null;
      setTodayStandup(today);
      setSubmitted(!!today);
      setRecentStandups(recentRes.data.data?.standups ?? []);
    } catch {
      toast.error('Failed to load standups');
    }
  }, [user?._id]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchStandups(); }, [fetchStandups]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/standups', data);
      toast.success(t('standup.submitSuccess'));
      setSubmitted(true);
      fetchStandups();
    } catch {
      toast.error(t('standup.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {submitted && todayStandup ? (
        <button
          onClick={() => setSelected(todayStandup)}
          className="w-full text-left card border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="badge bg-emerald-100 text-emerald-700 border border-emerald-200">{t('standup.submitted')}</span>
              <p className="text-sm text-gray-500">{t('standup.submittedToday')}</p>
            </div>
            <span className="text-xs text-primary-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {t('standup.viewComments')}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <StandupView standup={todayStandup} />
        </button>
      ) : (
        <div className="card">
          <h2 className="text-sm font-bold text-gray-700 mb-4">{t('standup.submitUpdate')}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">{t('kanban.project')}</label>
              <select className="input" {...register('projectId', { required: true })}>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('standup.yesterday')}</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder={t('standup.placeholder.yesterday')}
                {...register('yesterday', { required: 'This field is required' })}
              />
              {errors.yesterday && <p className="text-danger text-xs mt-1 font-medium">{errors.yesterday.message}</p>}
            </div>
            <div>
              <label className="label">{t('standup.today')}</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder={t('standup.placeholder.today')}
                {...register('today', { required: 'This field is required' })}
              />
              {errors.today && <p className="text-danger text-xs mt-1 font-medium">{errors.today.message}</p>}
            </div>
            <div>
              <label className="label">
                {t('standup.blockers')} <span className="text-gray-400 font-normal normal-case">({t('common.optional')})</span>
              </label>
              <textarea
                className="input min-h-[60px] resize-none"
                placeholder={t('standup.placeholder.blockers')}
                {...register('blockers')}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading || !selectedProject}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('common.submitting')}
                </span>
              ) : `${t('standup.submitUpdate')} →`}
            </button>
          </form>
        </div>
      )}

      {recentStandups.length > 1 && (
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t('standup.recentUpdates')}</h2>
          <div className="space-y-3">
            {recentStandups.slice(1, 6).map((s) => (
              <button
                key={s._id}
                onClick={() => setSelected(s)}
                className="w-full text-left card hover:border-primary-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 font-semibold">{fmtDate(s.date)}</p>
                  <span className="text-xs text-primary-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {t('standup.viewComments')}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
                <StandupView standup={s} compact />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && <StandupDetailModal standup={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StandupPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? '');
  const [tab, setTab] = useState<'mine' | 'team'>(isPrivileged ? 'team' : 'mine');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('standup.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Tabs (Admin / PM only) */}
      {isPrivileged && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('team')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'team' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('standup.teamStandups')}
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('standup.myStandup')}
          </button>
        </div>
      )}

      {tab === 'team' ? <TeamStandupsView /> : <MyStandupView />}
    </div>
  );
}
