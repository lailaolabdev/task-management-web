import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { Project, ProjectDocument, ProjectStatus, User } from '../types';
import { useAuthStore } from '../stores/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<ProjectStatus, string> = {
  Planning: 'bg-gray-400',
  Active: 'bg-success',
  'On Hold': 'bg-warning',
  Completed: 'bg-primary-500',
  Archived: 'bg-gray-300',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fixFilename(name: string): string {
  try { return decodeURIComponent(escape(name)); } catch { return name; }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconEdit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Project Form Modal (Create / Edit) ───────────────────────────────────────

type FormData = {
  name: string;
  description: string;
  status: ProjectStatus;
  targetDate: string;
  internalTestDate: string;
  uatDate: string;
  productionDate: string;
};

interface FormModalProps {
  project?: Project;
  onClose: () => void;
  onSave: () => void;
}

function ProjectFormModal({ project, onClose, onSave }: FormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!project;
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(project?.logoUrl ?? '');
  const [newDocFiles, setNewDocFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<ProjectDocument[]>(project?.documents ?? []);
  const [removedDocUrls, setRemovedDocUrls] = useState<string[]>([]);

  // Member picker state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (!project?.memberIds) return [];
    return (project.memberIds as (User | string)[]).map((m) =>
      typeof m === 'object' ? m._id : m
    );
  });
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    api.get<{ data: { users: User[] } }>('/users').then((res) => {
      setAllUsers(res.data.data?.users ?? []);
    }).catch(() => {});
  }, []);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const filteredUsers = allUsers.filter((u) =>
    u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'Planning',
      targetDate: project?.targetDate ? project.targetDate.split('T')[0] : '',
      internalTestDate: project?.internalTestDate ? project.internalTestDate.split('T')[0] : '',
      uatDate: project?.uatDate ? project.uatDate.split('T')[0] : '',
      productionDate: project?.productionDate ? project.productionDate.split('T')[0] : '',
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setNewDocFiles((prev) => [...prev, ...files]);
  };

  const removeExistingDoc = (url: string) => {
    setExistingDocs((prev) => prev.filter((d) => d.url !== url));
    setRemovedDocUrls((prev) => [...prev, url]);
  };

  const removeNewDoc = (idx: number) => setNewDocFiles((prev) => prev.filter((_, i) => i !== idx));

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      for (const url of removedDocUrls) {
        await api.delete(`/projects/${project?._id}/documents/${encodeURIComponent(url)}`).catch(() => {});
      }

      const formData = new FormData();
      formData.append('data', JSON.stringify({
        ...data,
        targetDate: new Date(data.targetDate).toISOString(),
        memberIds: selectedMemberIds,
        internalTestDate: data.internalTestDate ? new Date(data.internalTestDate).toISOString() : null,
        uatDate: data.uatDate ? new Date(data.uatDate).toISOString() : null,
        productionDate: data.productionDate ? new Date(data.productionDate).toISOString() : null,
      }));
      if (logoFile) formData.append('logo', logoFile);
      newDocFiles.forEach((f) => formData.append('documents', f));

      if (isEdit) {
        await api.patch(`/projects/${project._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(t('projects.updateSuccess'));
      } else {
        await api.post('/projects', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(t('projects.createSuccess'));
      }
      onSave();
      onClose();
    } catch {
      toast.error(isEdit ? t('projects.updateFailed') : t('projects.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? t('projects.editProject') : t('projects.createProject')}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Logo */}
          <div>
            <label className="label">{t('projects.logo')}</label>
            <div className="flex items-center gap-4">
              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors bg-gray-50">
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-2xl">🖼️</span>}
                <input type="file" accept="image/*" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={handleLogoChange} />
              </label>
              <div>
                <label className="btn-secondary text-xs cursor-pointer">
                  {logoPreview ? t('projects.changeLogo') : t('projects.uploadLogo')}
                  <input type="file" accept="image/*" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={handleLogoChange} />
                </label>
                <p className="text-xs text-gray-400 mt-1">{t('projects.logoHint')}</p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label">{t('projects.name')} *</label>
            <input className="input" placeholder="Q3 Platform Rewrite" {...register('name', { required: t('common.required') })} />
            {errors.name && <p className="text-danger text-xs mt-1 font-medium">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">{t('projects.description')}</label>
            <textarea className="input resize-none" rows={3} placeholder="Brief description…" {...register('description')} />
          </div>

          {/* Status + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('projects.status')}</label>
              <select className="input" {...register('status')}>
                {(['Planning', 'Active', 'On Hold', 'Completed', 'Archived'] as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>{t(`projectStatus.${s}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('projects.targetDate')} *</label>
              <input type="date" className="input" {...register('targetDate', { required: t('common.required') })} />
              {errors.targetDate && <p className="text-danger text-xs mt-1 font-medium">{errors.targetDate.message}</p>}
            </div>
          </div>

          {/* Milestone Dates */}
          <div>
            <label className="label">
              {t('projects.milestones.title')}
              <span className="text-gray-300 font-normal normal-case ml-1">({t('common.optional')})</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">{t('projects.milestones.internalTest')}</p>
                <input type="date" className="input text-sm" {...register('internalTestDate')} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">{t('projects.milestones.uat')}</p>
                <input type="date" className="input text-sm" {...register('uatDate')} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">{t('projects.milestones.production')}</p>
                <input type="date" className="input text-sm" {...register('productionDate')} />
              </div>
            </div>
          </div>

          {/* Member Picker */}
          <div>
            <label className="label">
              {t('projects.members')}
              <span className="text-gray-300 font-normal normal-case ml-1">({t('common.optional')})</span>
            </label>

            {/* Selected chips */}
            {selectedMemberIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedMemberIds.map((id) => {
                  const u = allUsers.find((u) => u._id === id);
                  if (!u) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold px-2 py-1 rounded-full">
                      <span className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {u.name[0].toUpperCase()}
                      </span>
                      {u.name}
                      <button type="button" onClick={() => toggleMember(id)} className="hover:text-danger transition-colors leading-none">×</button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search + list */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder={t('projects.searchMembers')}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border-b border-gray-100 focus:outline-none focus:bg-primary-50/30"
                />
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">{t('common.noData')}</p>
                ) : filteredUsers.map((u) => {
                  const selected = selectedMemberIds.includes(u._id);
                  return (
                    <label key={u._id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected ? 'bg-primary-50/60' : 'hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMember(u._id)}
                        className="accent-primary-600 w-4 h-4 flex-shrink-0"
                      />
                      <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.role}{u.department ? ` · ${u.department}` : ''}</p>
                      </div>
                      {selected && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            {selectedMemberIds.length > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">{selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>

          {/* Existing docs */}
          {isEdit && existingDocs.length > 0 && (
            <div>
              <label className="label">{t('projects.documents')}</label>
              <div className="space-y-2">
                {existingDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-lg flex-shrink-0">📎</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800" style={{ wordBreak: 'break-word' }}>{fixFilename(doc.name)}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(doc.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      onClick={() => removeExistingDoc(doc.url)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New docs */}
          <div>
            <label className="label">{isEdit ? t('projects.uploadDocuments') : t('projects.documents')}</label>
            <label className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center block cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
              <p className="text-sm text-gray-500">Click to attach files</p>
              <p className="text-xs text-gray-400 mt-1">PDF, Excel, Word · up to 10 files · 20 MB each</p>
              <input type="file" multiple accept=".pdf,.xls,.xlsx,.doc,.docx" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={handleDocsChange} />
            </label>
            {newDocFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {newDocFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-primary-50 rounded-lg px-3 py-2 border border-primary-100">
                    <span className="text-primary-700 text-xs font-medium" style={{ wordBreak: 'break-word' }}>{f.name}</span>
                    <button type="button" onClick={() => removeNewDoc(i)} className="ml-2 text-red-400 hover:text-red-600 flex-shrink-0">
                      <IconClose />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? t('common.saving') : isEdit ? t('projects.editProject') : t('projects.createProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'Admin' || user?.role === 'Project Manager' || user?.role === 'Lead Team';
  const canDelete = user?.role === 'Admin' || user?.role === 'Project Manager' || user?.role === 'Lead Team';

  const [projects, setProjects] = useState<Project[]>([]);
  const [modalProject, setModalProject] = useState<Project | undefined>();
  const [showForm, setShowForm] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get<{ data: { projects: Project[] } }>('/projects');
      setProjects(res.data.data?.projects ?? []);
    } catch {
      toast.error('Failed to load projects');
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openCreate = () => { setModalProject(undefined); setShowForm(true); };
  const openEdit = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    setModalProject(p);
    setShowForm(true);
  };

  const handleDelete = async (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    if (!confirm(t('projects.deleteConfirm'))) return;
    try {
      await api.delete(`/projects/${p._id}`);
      toast.success(t('projects.deleteSuccess'));
      fetchProjects();
    } catch {
      toast.error(t('projects.deleteFailed'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('projects.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={openCreate}>+ {t('projects.createProject')}</button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div
            key={p._id}
            className="card hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate(`/projects/${p._id}`)}
          >
            {/* Card header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-600 flex-shrink-0">
                    {p.name[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 leading-tight truncate">{p.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                    <span className="text-xs text-gray-500">{t(`projectStatus.${p.status}`)}</span>
                  </div>
                </div>
              </div>

              {/* Icon actions — appear on hover */}
              {canEdit && (
                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    title={t('common.edit')}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                    onClick={(e) => openEdit(e, p)}
                  >
                    <IconEdit />
                  </button>
                  {canDelete && (
                    <button
                      title={t('common.delete')}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      onClick={(e) => handleDelete(e, p)}
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            {p.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span>
                Due{' '}
                <span className="text-gray-600 font-medium">
                  {new Date(p.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </span>
              <div className="flex items-center gap-3">
                {p.documents && p.documents.length > 0 && <span>📎 {p.documents.length}</span>}
                <span>👥 {Array.isArray(p.memberIds) ? p.memberIds.length : 0}</span>
              </div>
            </div>

            {/* "View details" hint */}
            <p className="text-xs text-primary-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to view details →
            </p>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-3 text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📁</p>
            <p className="font-medium">{t('projects.noProjects')}</p>
            {canEdit && <p className="text-sm mt-1">Click "+ {t('projects.createProject')}" to get started.</p>}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <ProjectFormModal
          project={modalProject}
          onClose={() => setShowForm(false)}
          onSave={fetchProjects}
        />
      )}
    </div>
  );
}
