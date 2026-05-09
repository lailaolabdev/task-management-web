import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { Team, User } from '../types';
import { useAuthStore } from '../stores/authStore';

interface TeamForm {
  _id?: string;
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
}

const EMPTY: TeamForm = { name: '', description: '', leadId: '', memberIds: [] };

export default function TeamsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isLeadDev = user?.role === 'Lead Team';

  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<TeamForm | null>(null);

  const isMyTeam = (team: Team): boolean => {
    const leadId = typeof team.leadId === 'object' && team.leadId ? (team.leadId as User)._id : (team.leadId as string | undefined);
    return leadId === user?._id;
  };

  const load = () => {
    api.get<{ data: { teams: Team[] } }>('/teams').then((r) => setTeams(r.data.data?.teams ?? []));
  };

  useEffect(() => {
    load();
    api.get<{ data: { users: User[] } }>('/users').then((r) => setUsers(r.data.data?.users ?? []));
  }, []);

  const submit = async () => {
    if (!editing) return;
    try {
      const payload = {
        name: editing.name,
        description: editing.description || undefined,
        leadId: editing.leadId || null,
        memberIds: editing.memberIds,
      };
      if (editing._id) {
        await api.patch(`/teams/${editing._id}`, payload);
        toast.success(t('teams.updateSuccess'));
      } else {
        await api.post('/teams', payload);
        toast.success(t('teams.createSuccess'));
      }
      setEditing(null);
      load();
    } catch {
      toast.error(t('teams.saveFailed'));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('teams.deleteConfirm'))) return;
    await api.delete(`/teams/${id}`);
    toast.success(t('teams.deleteSuccess'));
    load();
  };

  const toggleMember = (uid: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      memberIds: editing.memberIds.includes(uid)
        ? editing.memberIds.filter((m) => m !== uid)
        : [...editing.memberIds, uid],
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t('teams.title')}</h1>
        <button
          className="btn-primary"
          onClick={() => setEditing({ ...EMPTY, leadId: isLeadDev ? (user?._id ?? '') : '' })}
        >
          + {t('teams.newTeam')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {teams.map((team) => {
          const lead = typeof team.leadId === 'object' && team.leadId ? (team.leadId as User) : null;
          const memberCount = team.memberIds?.length ?? 0;
          return (
            <div
              key={team._id}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{team.name}</h3>
                    {isLeadDev && isMyTeam(team) && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200">Mine</span>
                    )}
                  </div>
                  {team.description && <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>}
                </div>
                {(!isLeadDev || isMyTeam(team)) && (
                  <div className="flex gap-1">
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                      onClick={() =>
                        setEditing({
                          _id: team._id,
                          name: team.name,
                          description: team.description ?? '',
                          leadId: lead?._id ?? '',
                          memberIds: (team.memberIds ?? []).map((m) =>
                            typeof m === 'object' ? (m as User)._id : (m as string)
                          ),
                        })
                      }
                    >
                      ✎
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      onClick={() => remove(team._id)}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-3">
                <p>👤 {t('teams.lead')}: {lead?.name ?? '—'}</p>
                <p>👥 {memberCount} {t('teams.members')}</p>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">
                {editing._id ? t('teams.editTeam') : t('teams.newTeam')}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">{t('teams.name')} *</label>
                <input
                  className="input"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('common.description')}</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('teams.lead')}</label>
                <select
                  className="input"
                  value={editing.leadId}
                  onChange={(e) => setEditing({ ...editing, leadId: e.target.value })}
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('teams.members')}</label>
                <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                  {users.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={editing.memberIds.includes(u._id)}
                        onChange={() => toggleMember(u._id)}
                      />
                      <span>{u.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{u.role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-primary flex-1" onClick={submit} disabled={!editing.name.trim()}>
                  {t('common.save')}
                </button>
                <button className="btn-secondary" onClick={() => setEditing(null)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
