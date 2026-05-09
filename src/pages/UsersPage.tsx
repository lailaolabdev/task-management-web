import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { User, UserRole } from '../types';
import { useAuthStore } from '../stores/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: UserRole[] = ['Admin', 'Project Manager', 'Lead Team', 'Developer', 'Tester', 'UXUI'];

const ROLE_CFG: Record<UserRole, { bg: string; text: string; border: string }> = {
  Admin:            { bg: 'bg-primary-50',  text: 'text-primary-700',  border: 'border-primary-200' },
  'Project Manager':{ bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200' },
  'Lead Team': { bg: 'bg-violet-50',   text: 'text-violet-700',   border: 'border-violet-200' },
  Developer:        { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  Tester:           { bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200' },
  UXUI:             { bg: 'bg-fuchsia-50',  text: 'text-fuchsia-700',  border: 'border-fuchsia-200' },
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ROLE_ENUM = ['Admin', 'Developer', 'Project Manager', 'Tester', 'UXUI', 'Lead Team'] as const;

const createSchema = z.object({
  name:       z.string().min(2, 'Name must be at least 2 characters'),
  email:      z.string().email('Invalid email address'),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  role:       z.enum(ROLE_ENUM),
  department: z.string().optional(),
});

const editSchema = z.object({
  name:       z.string().min(2, 'Name must be at least 2 characters'),
  role:       z.enum(ROLE_ENUM),
  department: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData   = z.infer<typeof editSchema>;

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'Developer' },
  });

  const onSubmit = async (data: CreateFormData) => {
    setLoading(true);
    try {
      await api.post('/users', data);
      toast.success(t('users.createSuccess'));
      onSave();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-100 rounded-2xl shadow-modal w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t('users.createUser')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">New team member access</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="label">{t('users.name')} *</label>
            <input className="input" placeholder="Jane Smith" {...register('name')} />
            {errors.name && <p className="text-danger text-xs mt-1 font-medium">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label">{t('users.email')} *</label>
            <input type="email" className="input" placeholder="jane@company.com" {...register('email')} />
            {errors.email && <p className="text-danger text-xs mt-1 font-medium">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="label">{t('users.password')} *</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Min. 6 characters"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-danger text-xs mt-1 font-medium">{errors.password.message}</p>}
          </div>

          {/* Role + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('users.role')} *</label>
              <select className="input" {...register('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{t(`userRole.${r}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('users.department')}</label>
              <input className="input" placeholder="Engineering" {...register('department')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('common.saving')}
                </span>
              ) : t('users.createUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:       user.name,
      role:       user.role,
      department: user.department ?? '',
    },
  });

  const onSubmit = async (data: EditFormData) => {
    setLoading(true);
    try {
      await api.patch(`/users/${user._id}`, data);
      toast.success(t('users.updateSuccess'));
      onSave();
      onClose();
    } catch {
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-100 rounded-2xl shadow-modal w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{t('users.editUser')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">{t('users.name')} *</label>
            <input className="input" {...register('name')} />
            {errors.name && <p className="text-danger text-xs mt-1 font-medium">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('users.role')} *</label>
              <select className="input" {...register('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{t(`userRole.${r}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('users.department')}</label>
              <input className="input" placeholder="Engineering" {...register('department')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers]               = useState<User[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch]             = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [editUser, setEditUser]         = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: { users: User[] } }>(
        `/users?includeInactive=${showInactive}`
      );
      setUsers(res.data.data?.users ?? []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeactivate = async (user: User) => {
    if (!confirm(t('users.deleteConfirm'))) return;
    try {
      await api.delete(`/users/${user._id}`);
      toast.success(t('users.deleteSuccess'));
      fetchUsers();
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const handleReactivate = async (user: User) => {
    try {
      await api.patch(`/users/${user._id}/reactivate`);
      toast.success(`${user.name} reactivated`);
      fetchUsers();
    } catch {
      toast.error('Failed to reactivate user');
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q)
    );
  });

  const activeCount   = users.filter((u) => u.isActive).length;
  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">
            Manage accounts and access for your workspace
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {t('users.createUser')}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('common.members')}</p>
            <p className="text-2xl font-extrabold text-gray-900 leading-none mt-0.5">{users.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-success" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('common.active')}</p>
            <p className="text-2xl font-extrabold text-gray-900 leading-none mt-0.5">{activeCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t('common.inactive')}</p>
            <p className="text-2xl font-extrabold text-gray-900 leading-none mt-0.5">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>

        {/* Toggle inactive */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setShowInactive((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors ${showInactive ? 'bg-primary-600' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showInactive ? 'translate-x-4' : ''}`}
            />
          </div>
          <span className="text-sm text-gray-600 font-medium">Show inactive</span>
        </label>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <p className="font-semibold text-sm">{t('users.noUsers')}</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-5 py-3">{t('common.members')}</th>
                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3">{t('common.role')}</th>
                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3">{t('common.department')}</th>
                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3">{t('common.date')}</th>
                <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => {
                const cfg     = ROLE_CFG[u.role];
                const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                const isSelf  = currentUser?._id === u._id;

                return (
                  <tr key={u._id} className={`group transition-colors hover:bg-surface-sidebar/40 ${!u.isActive ? 'opacity-50' : ''}`}>
                    {/* Member */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white">
                            {initials}
                          </div>
                          {u.isActive && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {u.name}
                            {isSelf && <span className="ml-1.5 text-[10px] font-bold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full">You</span>}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <span className={`badge ${cfg.bg} ${cfg.text} border ${cfg.border} text-xs`}>
                        {t(`userRole.${u.role}`)}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">{u.department || <span className="text-gray-300">—</span>}</span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {u.isActive ? (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">{t('users.active')}</span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-400 border border-gray-200 text-xs">{t('users.inactive')}</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Edit */}
                        <button
                          onClick={() => setEditUser(u)}
                          title={t('common.edit')}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>

                        {/* Deactivate / Reactivate */}
                        {!isSelf && (
                          u.isActive ? (
                            <button
                              onClick={() => handleDeactivate(u)}
                              title="Deactivate account"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11A6 6 0 0114.89 13.476zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(u)}
                              title="Reactivate account"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onSave={fetchUsers} />
      )}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={fetchUsers} />
      )}
    </div>
  );
}
