import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { TaskStatus } from '../types';

const COLUMN_CFG: Record<TaskStatus, { border: string; header: string; countBg: string; countText: string; dot: string }> = {
  'To Do':       { border: 'border-gray-200',    header: 'text-gray-500',    countBg: 'bg-gray-100',        countText: 'text-gray-500',    dot: 'bg-gray-400' },
  'In Progress': { border: 'border-primary-300', header: 'text-primary-600', countBg: 'bg-primary-50',      countText: 'text-primary-600', dot: 'bg-primary-500' },
  'Code Review': { border: 'border-amber-300',   header: 'text-amber-600',   countBg: 'bg-amber-50',        countText: 'text-amber-600',   dot: 'bg-amber-400' },
  'Testing':     { border: 'border-purple-300',  header: 'text-purple-600',  countBg: 'bg-purple-50',       countText: 'text-purple-600',  dot: 'bg-purple-400' },
  'Done':        { border: 'border-emerald-300', header: 'text-emerald-600', countBg: 'bg-emerald-50',      countText: 'text-emerald-600', dot: 'bg-emerald-400' },
};

interface Props {
  status: TaskStatus;
  taskCount: number;
  children: React.ReactNode;
}

export default function KanbanColumn({ status, taskCount, children }: Props) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cfg = COLUMN_CFG[status];

  return (
    <div className="w-72 flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <h3 className={`text-sm font-bold ${cfg.header}`}>{t(`taskStatus.${status}`)}</h3>
        <span className={`badge ${cfg.countBg} ${cfg.countText} text-xs ml-auto`}>{taskCount}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 p-2 space-y-2 min-h-[200px] transition-colors ${cfg.border} ${
          isOver ? 'bg-primary-50/60' : 'bg-white/60'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
