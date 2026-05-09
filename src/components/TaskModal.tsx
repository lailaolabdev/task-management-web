import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { Task, TaskStatus, TaskPriority, BlockedReason, BLOCKED_REASONS, User } from '../types';

type FormData = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  priorityLevel: '' | '1' | '2' | '3';
  blockedReason: '' | BlockedReason;
  assigneeId: string;
  storyPoints: number;
  tags: string;
  startDate: string;
  endDate: string;
  notes: string;
  githubPrLink: string;
};

interface Props {
  task?: Task;
  projectId: string;
  defaultAssigneeId?: string;
  lockAssignee?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function TaskModal({
  task,
  projectId,
  defaultAssigneeId,
  lockAssignee = false,
  canDelete = true,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const isEdit = !!task;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const resolvedAssigneeId = (() => {
    if (!task?.assigneeId) return defaultAssigneeId ?? '';
    if (typeof task.assigneeId === 'object' && task.assigneeId !== null) {
      return (task.assigneeId as { _id: string })._id ?? '';
    }
    return (task.assigneeId as string) ?? '';
  })();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title:       task?.title ?? '',
      description: task?.description ?? '',
      status:      task?.status ?? 'To Do',
      priority:    task?.priority ?? 'Medium',
      priorityLevel: task?.priorityLevel ? (String(task.priorityLevel) as '1' | '2' | '3') : '',
      blockedReason: task?.blockedReason ?? '',
      assigneeId:  resolvedAssigneeId,
      storyPoints: task?.storyPoints ?? 0,
      tags:        (task?.tags ?? []).join(', '),
      startDate:   task?.startDate ? task.startDate.split('T')[0] : '',
      endDate:     task?.endDate   ? task.endDate.split('T')[0]   : '',
      notes:       task?.notes ?? '',
      githubPrLink: task?.githubPrLink ?? '',
    },
  });

  useEffect(() => {
    api.get<{ data: { users: User[] } }>('/users').then((res) => {
      setUsers(res.data.data?.users ?? []);
    }).catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        projectId,
        tags: data.tags ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        storyPoints:  data.storyPoints || undefined,
        startDate:    data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate:      data.endDate   ? new Date(data.endDate).toISOString()   : undefined,
        assigneeId:   data.assigneeId || undefined,
        githubPrLink: data.githubPrLink || undefined,
        priorityLevel: data.priorityLevel ? (Number(data.priorityLevel) as 1 | 2 | 3) : null,
        blockedReason: data.blockedReason || null,
        notes:        data.notes || undefined,
      };

      if (isEdit) {
        await api.patch(`/tasks/${task._id}`, payload);
        toast.success(t('tasks.updatedSuccess'));
      } else {
        await api.post('/tasks', payload);
        toast.success(t('tasks.createdSuccess'));
      }
      onSave();
      onClose();
    } catch {
      toast.error(isEdit ? t('tasks.updateFailed') : t('tasks.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm(t('tasks.deleteConfirm'))) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      toast.success(t('tasks.deletedSuccess'));
      onSave();
      onClose();
    } catch {
      toast.error(t('tasks.deleteFailed'));
    }
  };

  const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'In Progress', 'Code Review', 'Testing', 'Done'];
  const PRIORITY_OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-100 rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isEdit ? t('tasks.editTask') : t('tasks.newTask')}</h2>
            {lockAssignee && (
              <p className="text-xs text-primary-500 font-medium mt-0.5">{t('tasks.assignedToYou')}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="label">{t('tasks.title')} *</label>
            <input className="input" placeholder={t('tasks.titlePlaceholder')} {...register('title', { required: t('common.required') })} />
            {errors.title && <p className="text-danger text-xs mt-1 font-medium">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">{t('tasks.description')}</label>
            <textarea className="input resize-none" rows={3} placeholder={t('tasks.descriptionPlaceholder')} {...register('description')} />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('tasks.status')}</label>
              <select className="input" {...register('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{t(`taskStatus.${s}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('tasks.priority')}</label>
              <select className="input" {...register('priority')}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{t(`taskPriority.${p}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority level + Blocked reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('tasks.priorityLevel')}</label>
              <select className="input" {...register('priorityLevel')}>
                <option value="">—</option>
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
              </select>
            </div>
            <div>
              <label className="label">{t('tasks.blockedReason')}</label>
              <select className="input" {...register('blockedReason')}>
                <option value="">{t('tasks.notBlocked')}</option>
                {BLOCKED_REASONS.map((r) => (
                  <option key={r} value={r}>{t(`blockedReason.${r}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee + Story Points */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('tasks.assignee')}</label>
              {lockAssignee ? (
                <>
                  <input type="hidden" {...register('assigneeId')} />
                  <div className="input bg-gray-50 text-gray-500 cursor-not-allowed flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {users.find((u) => u._id === resolvedAssigneeId)?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-sm truncate">
                      {users.find((u) => u._id === resolvedAssigneeId)?.name ?? t('tasks.assignedToYou')}
                    </span>
                  </div>
                </>
              ) : (
                <select className="input" {...register('assigneeId')}>
                  <option value="">{t('tasks.unassigned')}</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="label">{t('tasks.storyPoints')}</label>
              <input
                type="number" min={0} max={100}
                className="input"
                {...register('storyPoints', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('tasks.startDate')}</label>
              <input type="date" className="input" {...register('startDate')} />
            </div>
            <div>
              <label className="label">{t('tasks.endDate')}</label>
              <input type="date" className="input" {...register('endDate')} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">
              {t('tasks.tags')} <span className="text-gray-300 font-normal normal-case">({t('tasks.tagsHint')})</span>
            </label>
            <input className="input" placeholder="frontend, auth, bug…" {...register('tags')} />
          </div>

          {/* Notes */}
          <div>
            <label className="label">{t('tasks.notes')}</label>
            <textarea className="input resize-none" rows={2} {...register('notes')} />
          </div>

          {/* GitHub PR */}
          <div>
            <label className="label">{t('tasks.githubPr')}</label>
            <input type="url" className="input" placeholder="https://github.com/…" {...register('githubPrLink')} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('tasks.saving')}
                </span>
              ) : isEdit ? t('tasks.updateTask') : t('tasks.createTask')}
            </button>
            {isEdit && canDelete && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                {t('tasks.deleteTask')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
