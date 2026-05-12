import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { Project, ProjectDocument, ProjectStatus, User } from '../types';
import { useAuthStore } from '../stores/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning: 'bg-gray-100 text-gray-600',
  Active: 'bg-emerald-50 text-emerald-700',
  'On Hold': 'bg-amber-50 text-amber-700',
  Completed: 'bg-primary-50 text-primary-700',
  Archived: 'bg-gray-100 text-gray-400',
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  Planning: 'bg-gray-400',
  Active: 'bg-success',
  'On Hold': 'bg-warning',
  Completed: 'bg-primary-500',
  Archived: 'bg-gray-300',
};

type DocType = 'pdf' | 'excel' | 'word' | 'image' | 'other';

function getDocType(mimetype: string): DocType {
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheetml')) return 'excel';
  if (mimetype.includes('word') || mimetype.includes('wordprocessingml')) return 'word';
  return 'other';
}

const DOC_STYLE: Record<DocType, { icon: string; label: string; badge: string }> = {
  pdf:   { icon: '📄', label: 'PDF',   badge: 'bg-red-50 text-red-600 border-red-200' },
  excel: { icon: '📊', label: 'XLSX',  badge: 'bg-green-50 text-green-700 border-green-200' },
  word:  { icon: '📝', label: 'DOCX',  badge: 'bg-primary-50 text-primary-700 border-primary-200' },
  image: { icon: '🖼️', label: 'Image', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  other: { icon: '📎', label: 'File',  badge: 'bg-gray-50 text-gray-600 border-gray-200' },
};

/** Fix mojibake from multer storing UTF-8 filename bytes as Latin-1 */
function fixFilename(name: string): string {
  try {
    return decodeURIComponent(escape(name));
  } catch {
    return name;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function forceDownload(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

function IconPreview() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Document Preview Modal ───────────────────────────────────────────────────

function DocumentPreviewModal({ doc, onClose }: { doc: ProjectDocument; onClose: () => void }) {
  const { t } = useTranslation();
  const type = getDocType(doc.mimetype);
  const name = fixFilename(doc.name);

  let previewContent: React.ReactNode;

  if (type === 'pdf') {
    previewContent = (
      <iframe
        src={doc.url}
        title={name}
        className="w-full h-full border-0 rounded-b-2xl"
      />
    );
  } else if (type === 'image') {
    previewContent = (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-b-2xl p-6">
        <img src={doc.url} alt={name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
      </div>
    );
  } else if (type === 'excel' || type === 'word') {
    // Microsoft Office Online viewer — works for publicly accessible S3 URLs
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.url)}`;
    previewContent = (
      <iframe
        src={viewerUrl}
        title={name}
        className="w-full h-full border-0 rounded-b-2xl"
      />
    );
  } else {
    previewContent = (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-b-2xl gap-4">
        <span className="text-6xl">📎</span>
        <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
        <button
          className="btn-primary"
          onClick={() => forceDownload(doc.url, name)}
        >
          Download to view
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl"
        style={{ height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{DOC_STYLE[type].icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 break-words">{name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(doc.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              className="btn-secondary text-xs gap-1.5"
              onClick={() => forceDownload(doc.url, name)}
            >
              <IconDownload /> {t('common.download')}
            </button>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={onClose}
            >
              <IconClose />
            </button>
          </div>
        </div>
        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          {previewContent}
        </div>
      </div>
    </div>
  );
}

// ─── Document Row ─────────────────────────────────────────────────────────────

function DocRow({
  doc,
  canDelete,
  onPreview,
  onDelete,
}: {
  doc: ProjectDocument;
  canDelete: boolean;
  onPreview: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const type = getDocType(doc.mimetype);
  const style = DOC_STYLE[type];
  const name = fixFilename(doc.name);

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all group">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-2xl flex-shrink-0 ${style.badge}`}>
        {style.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800" style={{ wordBreak: 'break-word' }}>
          {name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${style.badge}`}>
            {style.label}
          </span>
          <span className="text-xs text-gray-400">{formatFileSize(doc.size)}</span>
          {doc.uploadedAt && (
            <span className="text-xs text-gray-400">
              Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          title={t('common.preview')}
          onClick={onPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 hover:bg-primary-50 border border-primary-100 hover:border-primary-200 transition-colors"
        >
          <IconPreview /> {t('common.preview')}
        </button>
        <button
          title={t('common.download')}
          onClick={() => forceDownload(doc.url, name)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <IconDownload /> {t('common.download')}
        </button>
        {canDelete && onDelete && (
          <button
            title="Remove document"
            onClick={onDelete}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 border border-transparent hover:border-red-100 transition-all"
          >
            <IconTrash />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Info Chip ────────────────────────────────────────────────────────────────

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

// ─── Edit Form Modal ──────────────────────────────────────────────────────────

type FormData = {
  name: string;
  description: string;
  status: ProjectStatus;
  targetDate: string;
  internalTestDate: string;
  uatDate: string;
  productionDate: string;
};

function ProjectEditModal({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(project.logoUrl ?? '');
  const [newDocFiles, setNewDocFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<ProjectDocument[]>(project.documents ?? []);
  const [removedDocUrls, setRemovedDocUrls] = useState<string[]>([]);

  // Member picker state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() =>
    (project.memberIds as (User | string)[]).map((m) =>
      typeof m === 'object' ? m._id : m
    )
  );
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
      name: project.name,
      description: project.description,
      status: project.status,
      targetDate: project.targetDate ? project.targetDate.split('T')[0] : '',
      internalTestDate: project.internalTestDate ? project.internalTestDate.split('T')[0] : '',
      uatDate: project.uatDate ? project.uatDate.split('T')[0] : '',
      productionDate: project.productionDate ? project.productionDate.split('T')[0] : '',
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
        await api.delete(`/projects/${project._id}/documents/${encodeURIComponent(url)}`).catch(() => {});
      }

      const formData = new FormData();
      formData.append('data', JSON.stringify({
        ...data,
        targetDate: new Date(data.targetDate).toISOString(),
        internalTestDate: data.internalTestDate ? new Date(data.internalTestDate).toISOString() : null,
        uatDate: data.uatDate ? new Date(data.uatDate).toISOString() : null,
        productionDate: data.productionDate ? new Date(data.productionDate).toISOString() : null,
        memberIds: selectedMemberIds,
      }));
      if (logoFile) formData.append('logo', logoFile);
      newDocFiles.forEach((f) => formData.append('documents', f));

      await api.patch(`/projects/${project._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('projects.updateSuccess'));
      onSave();
      onClose();
    } catch {
      toast.error(t('projects.updateFailed'));
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
          <h2 className="text-lg font-bold text-gray-900">{t('projects.editProject')}</h2>
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
                  : <span className="text-2xl">🖼️</span>
                }
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
            <input className="input" {...register('name', { required: t('common.required') })} />
            {errors.name && <p className="text-danger text-xs mt-1 font-medium">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">{t('projects.description')}</label>
            <textarea className="input resize-none" rows={3} {...register('description')} />
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
            <label className="label">{t('projects.milestones.title')}</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('projects.milestones.internalTest')}</p>
                <input type="date" className="input text-sm" {...register('internalTestDate')} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('projects.milestones.uat')}</p>
                <input type="date" className="input text-sm" {...register('uatDate')} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('projects.milestones.production')}</p>
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
          {existingDocs.length > 0 && (
            <div>
              <label className="label">{t('projects.documents')}</label>
              <div className="space-y-2">
                {existingDocs.map((doc, i) => {
                  const type = getDocType(doc.mimetype);
                  const style = DOC_STYLE[type];
                  const name = fixFilename(doc.name);
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-lg flex-shrink-0">{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800" style={{ wordBreak: 'break-word' }}>{name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(doc.size)}</p>
                      </div>
                      <button
                        type="button"
                        title="Remove"
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        onClick={() => removeExistingDoc(doc.url)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add new docs */}
          <div>
            <label className="label">{t('projects.uploadDocuments')}</label>
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
              {loading ? t('common.saving') : t('projects.editProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'Admin' || user?.role === 'Project Manager' || user?.role === 'Lead Team';
  const canDelete = user?.role === 'Admin' || user?.role === 'Project Manager' || user?.role === 'Lead Team';

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<{ data: { project: Project } }>(`/projects/${id}`);
      setProject(res.data.data?.project ?? null);
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const handleDelete = async () => {
    if (!project || !confirm(t('projects.deleteConfirm'))) return;
    try {
      await api.delete(`/projects/${project._id}`);
      toast.success(t('projects.deleteSuccess'));
      navigate('/projects');
    } catch {
      toast.error(t('projects.deleteFailed'));
    }
  };

  const handleDocDelete = async (docUrl: string) => {
    if (!project || !confirm('Remove this document?')) return;
    try {
      await api.delete(`/projects/${project._id}/documents/${encodeURIComponent(docUrl)}`);
      toast.success('Document removed');
      setProject((prev) =>
        prev ? { ...prev, documents: prev.documents?.filter((d) => d.url !== docUrl) } : prev
      );
    } catch {
      toast.error('Failed to remove document');
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">{t('common.loading')}…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full py-32 text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-3">📁</p>
          <p className="font-medium">Project not found</p>
          <button className="btn-secondary mt-4" onClick={() => navigate('/projects')}>{t('projects.title')}</button>
        </div>
      </div>
    );
  }

  const owner = typeof project.ownerId === 'object' ? (project.ownerId as User) : null;

  return (
    <div className="min-h-full bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <button
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            onClick={() => navigate('/projects')}
          >
            <IconBack /> {t('projects.title')}
          </button>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button className="btn-secondary gap-2" onClick={() => setShowEditModal(true)}>
                <IconEdit /> {t('common.edit')}
              </button>
              {canDelete && (
                <button className="btn-danger gap-2" onClick={handleDelete}>
                  <IconTrash /> {t('common.delete')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Project header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-5">
            {project.logoUrl ? (
              <img
                src={project.logoUrl}
                alt="logo"
                className="w-20 h-20 rounded-2xl object-cover shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-600 flex-shrink-0">
                {project.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[project.status]}`} />
                  <span className={`badge ${STATUS_COLORS[project.status]}`}>{t(`projectStatus.${project.status}`)}</span>
                </div>
              </div>
              {project.description && (
                <p className="text-gray-600 text-sm leading-relaxed mt-2">{project.description}</p>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
            <InfoChip
              label={t('projects.targetDate')}
              value={new Date(project.targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            />
            <InfoChip
              label={t('common.members')}
              value={String(Array.isArray(project.memberIds) ? project.memberIds.length : 0)}
            />
            {owner && <InfoChip label="Owner" value={owner.name} />}
            <InfoChip
              label="Created"
              value={new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            />
            <InfoChip
              label="Last Updated"
              value={new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            />
            <InfoChip label={t('projects.documents')} value={String(project.documents?.length ?? 0)} />
          </div>
        </div>

        {/* Documents section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('projects.documents')}
              {project.documents && project.documents.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({project.documents.length} file{project.documents.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            {canEdit && (
              <button className="btn-secondary text-xs gap-1.5" onClick={() => setShowEditModal(true)}>
                <IconEdit /> Manage Files
              </button>
            )}
          </div>

          {project.documents && project.documents.length > 0 ? (
            <div className="space-y-3">
              {project.documents.map((doc, i) => (
                <DocRow
                  key={i}
                  doc={doc}
                  canDelete={canEdit}
                  onPreview={() => setPreviewDoc(doc)}
                  onDelete={() => handleDocDelete(doc.url)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 text-center">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-gray-500 font-medium">No documents attached</p>
              {canEdit && (
                <p className="text-gray-400 text-sm mt-1">
                  Click <span className="font-medium">{t('common.edit')}</span> to add PDF, Excel, or Word files.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document preview modal */}
      {previewDoc && (
        <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* Edit modal overlay */}
      {showEditModal && (
        <ProjectEditModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSave={() => { setShowEditModal(false); fetchProject(); }}
        />
      )}
    </div>
  );
}
