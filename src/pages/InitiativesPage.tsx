import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { Initiative, InitiativeStatus, User } from '../types';
import { useAuthStore } from '../stores/authStore';

const STATUS_STYLES: Record<InitiativeStatus, string> = {
  Planned: 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Done: 'bg-green-50 text-green-700',
  'On Hold': 'bg-amber-50 text-amber-700',
};

const PRIVILEGED = ['Admin', 'Project Manager', 'Lead Team'];

interface InitForm {
  _id?: string;
  title: string;
  description: string;
  quarter: string;
  ownerId: string;
  externalLink: string;
  status: InitiativeStatus;
}

const EMPTY: InitForm = {
  title: '',
  description: '',
  quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`,
  ownerId: '',
  externalLink: '',
  status: 'Planned',
};

export default function InitiativesPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canEdit = !!user && PRIVILEGED.includes(user.role);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterQuarter, setFilterQuarter] = useState('');
  const [editing, setEditing] = useState<InitForm | null>(null);
  const [activeNotes, setActiveNotes] = useState<Initiative | null>(null);
  const [noteBody, setNoteBody] = useState('');

  const load = () => {
    const qs = filterQuarter ? `?quarter=${encodeURIComponent(filterQuarter)}` : '';
    api.get<{ data: { initiatives: Initiative[] } }>(`/initiatives${qs}`).then((r) =>
      setInitiatives(r.data.data?.initiatives ?? [])
    );
  };

  useEffect(() => {
    load();
    api.get<{ data: { users: User[] } }>('/users').then((r) => setUsers(r.data.data?.users ?? []));
  }, [filterQuarter]);

  const submit = async () => {
    if (!editing) return;
    try {
      const payload = {
        title: editing.title,
        description: editing.description || undefined,
        quarter: editing.quarter,
        ownerId: editing.ownerId,
        externalLink: editing.externalLink || null,
        status: editing.status,
      };
      if (editing._id) {
        await api.patch(`/initiatives/${editing._id}`, payload);
        toast.success(t('initiatives.updateSuccess'));
      } else {
        await api.post('/initiatives', payload);
        toast.success(t('initiatives.createSuccess'));
      }
      setEditing(null);
      load();
    } catch {
      toast.error(t('initiatives.saveFailed'));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('initiatives.deleteConfirm'))) return;
    await api.delete(`/initiatives/${id}`);
    toast.success(t('initiatives.deleteSuccess'));
    load();
  };

  const postNote = async () => {
    if (!activeNotes || !noteBody.trim()) return;
    try {
      const res = await api.post<{ data: { initiative: Initiative } }>(
        `/initiatives/${activeNotes._id}/notes`,
        { body: noteBody }
      );
      const updated = res.data.data?.initiative;
      if (updated) {
        setActiveNotes(updated);
        load();
      }
      setNoteBody('');
    } catch {
      toast.error(t('initiatives.noteFailed'));
    }
  };

  const quarters = Array.from(new Set(initiatives.map((i) => i.quarter))).sort().reverse();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('initiatives.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('initiatives.subtitle')}</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>
            + {t('initiatives.newInitiative')}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">{t('initiatives.quarter')}:</label>
          <select className="input max-w-[200px]" value={filterQuarter} onChange={(e) => setFilterQuarter(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {quarters.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">#</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">{t('initiatives.title')}</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">{t('initiatives.owner')}</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">{t('initiatives.quarter')}</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">{t('common.status')}</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">{t('initiatives.link')}</th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {initiatives.map((init, idx) => {
              const owner = typeof init.ownerId === 'object' ? (init.ownerId as User) : null;
              return (
                <tr key={init._id} className="border-t border-gray-50 hover:bg-gray-50/40">
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-gray-800">{init.title}</p>
                    {init.description && <p className="text-xs text-gray-500 line-clamp-1">{init.description}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{owner?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{init.quarter}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge text-xs ${STATUS_STYLES[init.status]}`}>{init.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {init.externalLink ? (
                      <a className="text-primary-600 hover:underline text-xs" href={init.externalLink} target="_blank" rel="noreferrer">
                        ↗ {t('initiatives.openLink')}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button
                        className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500"
                        onClick={() => setActiveNotes(init)}
                      >
                        💬 {init.progressNotes?.length ?? 0}
                      </button>
                      {canEdit && (
                        <>
                          <button
                            className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500"
                            onClick={() =>
                              setEditing({
                                _id: init._id,
                                title: init.title,
                                description: init.description ?? '',
                                quarter: init.quarter,
                                ownerId: typeof init.ownerId === 'object' ? (init.ownerId as User)._id : (init.ownerId as string),
                                externalLink: init.externalLink ?? '',
                                status: init.status,
                              })
                            }
                          >
                            ✎
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-500"
                            onClick={() => remove(init._id)}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {initiatives.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {t('initiatives.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">
                {editing._id ? t('initiatives.edit') : t('initiatives.newInitiative')}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">{t('initiatives.title')} *</label>
                <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('common.description')}</label>
                <textarea className="input resize-none" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('initiatives.quarter')} *</label>
                  <input className="input" placeholder="Q4-2026" value={editing.quarter} onChange={(e) => setEditing({ ...editing, quarter: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('common.status')}</label>
                  <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as InitiativeStatus })}>
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">{t('initiatives.owner')} *</label>
                <select className="input" value={editing.ownerId} onChange={(e) => setEditing({ ...editing, ownerId: e.target.value })}>
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('initiatives.link')}</label>
                <input type="url" className="input" placeholder="https://docs.google.com/…" value={editing.externalLink} onChange={(e) => setEditing({ ...editing, externalLink: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-primary flex-1" onClick={submit} disabled={!editing.title.trim() || !editing.ownerId || !editing.quarter.trim()}>
                  {t('common.save')}
                </button>
                <button className="btn-secondary" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes drawer */}
      {activeNotes && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setActiveNotes(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{activeNotes.title}</h2>
                <p className="text-xs text-gray-500">{activeNotes.quarter} · {activeNotes.status}</p>
              </div>
              <button onClick={() => setActiveNotes(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {(activeNotes.progressNotes ?? []).length === 0 && (
                <p className="text-sm text-gray-400">{t('initiatives.noNotes')}</p>
              )}
              {(activeNotes.progressNotes ?? []).map((n, i) => {
                const author = typeof n.userId === 'object' ? (n.userId as User).name : '—';
                return (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50/40">
                    <p className="text-xs text-gray-400 mb-1">
                      {author} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.body}</p>
                  </div>
                );
              })}
              <div className="pt-3">
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder={t('initiatives.notePlaceholder')}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <button className="btn-primary mt-2" onClick={postNote} disabled={!noteBody.trim()}>
                  {t('initiatives.postNote')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
