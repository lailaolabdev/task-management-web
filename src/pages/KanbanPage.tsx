import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { useKanbanFilterStore } from '../stores/kanbanFilterStore';
import { Task, TaskStatus, Project, User, Team } from '../types';
import TaskCard from '../components/TaskCard';
import KanbanColumn from '../components/KanbanColumn';
import TaskModal from '../components/TaskModal';

const COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'Code Review', 'Testing', 'Done'];
const PRIVILEGED = ['Admin', 'Project Manager'];

export default function KanbanPage() {
  const { t } = useTranslation();
  const { tasks, setTasks, moveTask, setLoading } = useTaskStore();
  const currentUser = useAuthStore((s) => s.user);
  const isPrivileged = PRIVILEGED.includes(currentUser?.role ?? '');
  const isAdmin = currentUser?.role === 'Admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers]   = useState<User[]>([]);
  const [teams, setTeams]       = useState<Team[]>([]);

  const { selectedProject, selectedTeam, selectedMember,
          setSelectedProject, setSelectedTeam, setSelectedMember } = useKanbanFilterStore();
  const [activeTask, setActiveTask]       = useState<Task | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [editTask, setEditTask]           = useState<Task | undefined>();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  // Pointer-first collision: detects the column the cursor is inside,
  // falls back to rectangle intersection for edge cases (empty columns, fast moves).
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  }, []);

  // ── Fetch projects ──────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get<{ data: { projects: Project[] } }>('/projects');
      setProjects(res.data.data?.projects ?? []);
    } catch {
      toast.error('Failed to load projects');
    }
  }, []);

  // ── Fetch team members ──────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!isPrivileged) return;
    try {
      const res = await api.get<{ data: { users: User[] } }>('/users');
      setMembers(res.data.data?.users ?? []);
    } catch { /* non-critical */ }
  }, [isPrivileged]);

  // ── Fetch teams (Admin only) ────────────────────────────────────────────────
  const fetchTeams = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get<{ data: { teams: Team[] } }>('/teams');
      setTeams(res.data.data?.teams ?? []);
    } catch { /* non-critical */ }
  }, [isAdmin]);

  // ── Fetch tasks ─────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProject) params.set('projectId', selectedProject);
      if (isPrivileged && selectedMember) params.set('assigneeId', selectedMember);
      if (isAdmin && selectedTeam) params.set('teamId', selectedTeam);
      const res = await api.get<{ data: { tasks: Task[] } }>(`/tasks?${params}`);
      setTasks(res.data.data?.tasks ?? []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedMember, selectedTeam, isPrivileged, isAdmin, setTasks, setLoading]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Board helpers ───────────────────────────────────────────────────────────
  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t._id === event.active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId  = active.id as string;
    const overId  = over.id as string;
    const newStatus = COLUMNS.includes(overId as TaskStatus)
      ? (overId as TaskStatus)
      : tasks.find((t) => t._id === overId)?.status;

    if (!newStatus) return;
    const currentTask = tasks.find((t) => t._id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    const newOrder = getColumnTasks(newStatus).length;
    moveTask(taskId, newStatus, newOrder);

    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus, order: newOrder });
    } catch {
      toast.error('Failed to update task status');
      fetchTasks();
    }
  };

  const openEdit = (task: Task) => { setEditTask(task); setShowModal(true); };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const openNewTask = () => { setEditTask(undefined); setShowModal(true); };

  // ── Stats for PM header ─────────────────────────────────────────────────────
  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter((t) => t.status === 'Done').length;
  const inProgTasks = tasks.filter((t) => t.status === 'In Progress').length;

  return (
    <div className="h-full flex flex-col bg-surface-bg">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isPrivileged ? 'Project Board' : t('kanban.yourTasks')}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 font-medium">
            {isPrivileged
              ? 'Manage and monitor all team tasks'
              : `Showing tasks assigned to you · ${totalTasks} task${totalTasks !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Project selector */}
          <select
            className="input w-44 text-sm"
            value={selectedProject}
            onChange={(e) => { setSelectedProject(e.target.value); setSelectedMember(''); setSelectedTeam(''); }}
          >
            <option value="">All Projects</option>
            {projects.length === 0 && <option disabled>— no projects —</option>}
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

          {/* Team filter — Admin only */}
          {isAdmin && (
            <select
              className="input w-40 text-sm"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Assignee filter — Admin / PM */}
          {isPrivileged && (
            <select
              className="input w-40 text-sm"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="">All Assignees</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          )}

          {/* New Task button */}
          <button
            className="btn-primary gap-1.5"
            onClick={openNewTask}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            {t('kanban.createTask')}
          </button>
        </div>
      </div>

      {/* ── PM quick-stat strip ─────────────────────────────────────────────── */}
      {isPrivileged && totalTasks > 0 && (
        <div className="flex items-center gap-6 px-6 py-2.5 bg-white border-b border-gray-100 text-xs font-semibold text-gray-400 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            {totalTasks} total
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-400" />
            {inProgTasks} in progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            {doneTasks} done
            {totalTasks > 0 && (
              <span className="ml-0.5 text-success">({Math.round((doneTasks / totalTasks) * 100)}%)</span>
            )}
          </span>
          <div className="ml-auto flex items-center gap-3">
            {selectedTeam && (
              <span className="flex items-center gap-1.5 text-primary-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                {teams.find((t) => t._id === selectedTeam)?.name ?? 'Team'}
                <button onClick={() => setSelectedTeam('')} className="hover:text-danger transition-colors">✕</button>
              </span>
            )}
            {selectedMember && (
              <span className="flex items-center gap-1.5 text-primary-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                {members.find((m) => m._id === selectedMember)?.name ?? 'Assignee'}
                <button onClick={() => setSelectedMember('')} className="hover:text-danger transition-colors">✕</button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="font-semibold text-gray-500 text-sm">
              {isPrivileged
                ? (selectedProject ? 'No tasks in this project yet' : 'No tasks found')
                : t('kanban.noTasks')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isPrivileged
                ? (selectedProject ? 'Create the first task to get started' : 'Select a project or create a task')
                : 'Create your first task below'}
            </p>
            <button onClick={openNewTask} className="btn-primary mt-4 text-sm">
              + {t('kanban.createTask')}
            </button>
          </div>
        </div>
      ) : (
        /* ── Board ─────────────────────────────────────────────────────────── */
        <div className="flex-1 overflow-x-auto p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full min-w-max">
              {COLUMNS.map((status) => {
                const columnTasks = getColumnTasks(status);
                return (
                  <KanbanColumn key={status} status={status} taskCount={columnTasks.length}>
                    <SortableContext
                      items={columnTasks.map((t) => t._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          showProject={!selectedProject}
                          onClick={() => openEdit(task)}
                          onEdit={() => openEdit(task)}
                          onDelete={isPrivileged ? () => handleDelete(task) : undefined}
                        />
                      ))}
                    </SortableContext>
                  </KanbanColumn>
                );
              })}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="bg-white border-2 border-primary-400 rounded-lg shadow-xl rotate-2 opacity-90 p-3">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">{activeTask.title}</p>
                  {activeTask.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{activeTask.description}</p>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* ── Task Modal ──────────────────────────────────────────────────────── */}
      {showModal && (
        <TaskModal
          task={editTask}
          projectId={selectedProject}
          defaultAssigneeId={!isPrivileged ? currentUser?._id : undefined}
          lockAssignee={!isPrivileged}
          canDelete={isPrivileged}
          onClose={() => setShowModal(false)}
          onSave={fetchTasks}
        />
      )}
    </div>
  );
}
