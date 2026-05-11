import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { Task, TaskPriority, User, Project } from '../types';

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: 'bg-gray-100 text-gray-500',
  Medium: 'bg-primary-50 text-primary-600',
  High: 'bg-orange-50 text-orange-600',
  Critical: 'bg-red-50 text-red-600',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  Low: 'bg-gray-400',
  Medium: 'bg-primary-500',
  High: 'bg-orange-500',
  Critical: 'bg-red-500',
};

interface Props {
  task: Task;
  isDragging?: boolean;
  showProject?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function TaskCard({ task, isDragging = false, showProject = false, onClick, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const {
    setNodeRef,
    listeners,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const assignee =
    typeof task.assigneeId === 'object' && task.assigneeId
      ? (task.assigneeId as User)
      : null;

  const project =
    showProject && typeof task.projectId === 'object' && task.projectId
      ? (task.projectId as Project)
      : null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      className={`bg-white border rounded-lg transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'shadow-xl rotate-2 border-primary-400'
          : 'border-gray-200 hover:border-primary-200 hover:shadow-sm'
      }`}
    >
      {/* ── Drag indicator strip ── */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1 select-none">
        {/* grip dots */}
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="w-0.5 h-0.5 rounded-full bg-gray-300 block" />
              <span className="w-0.5 h-0.5 rounded-full bg-gray-300 block" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {task.priorityLevel && (
            <span className="badge bg-primary-100 text-primary-700 text-[10px] font-bold">
              P{task.priorityLevel}
            </span>
          )}
          {/* priority badge */}
          <span className={`badge text-xs ${PRIORITY_STYLES[task.priority]}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${PRIORITY_DOT[task.priority]}`} />
            {t(`taskPriority.${task.priority}`)}
          </span>
        </div>
      </div>

      {/* ── Clickable body — opens edit modal ── */}
      <div
        className="px-3 pb-3 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      >
        {/* Project badge (shown in All Projects view) */}
        {project && (
          <span className="inline-flex items-center gap-1 badge bg-primary-50 text-primary-700 text-[10px] font-semibold mb-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            {project.name}
          </span>
        )}

        {/* Title */}
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-1">
          {task.title}
        </p>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">{task.description}</p>
        )}

        {/* Blocked reason */}
        {task.blockedReason && (
          <div className="mb-2">
            <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
              ⏳ {t(`blockedReason.${task.blockedReason}`)}
            </span>
          </div>
        )}

        {/* Tags */}
        {(task.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {(task.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="badge bg-gray-100 text-gray-500 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Dates */}
        {(task.startDate || task.endDate) && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <span>📅</span>
            {task.startDate && <span>{formatDate(task.startDate)}</span>}
            {task.startDate && task.endDate && <span>→</span>}
            {task.endDate && <span>{formatDate(task.endDate)}</span>}
          </div>
        )}

        {/* Footer: story points + assignee + actions */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {task.storyPoints != null && task.storyPoints > 0 && (
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {task.storyPoints} pts
              </span>
            )}
            {assignee && (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {assignee.name[0].toUpperCase()}
                </div>
                <span className="text-xs text-gray-500 truncate max-w-[80px]">{assignee.name}</span>
              </div>
            )}
          </div>

          {/* Edit / Delete icons */}
          {!isDragging && (onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                  title="Edit task"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete task"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
