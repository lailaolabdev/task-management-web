export type UserRole = 'Admin' | 'Developer' | 'Project Manager' | 'Tester' | 'UXUI' | 'Lead Team';
export type TaskStatus = 'To Do' | 'In Progress' | 'Code Review' | 'Testing' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type BlockedReason =
  | 'Waiting for API'
  | 'Waiting for Confirmation'
  | 'Tracking'
  | 'Postponed'
  | 'Continue Next Week'
  | 'Waiting';
export type PriorityLevel = 1 | 2 | 3;
export const BLOCKED_REASONS: BlockedReason[] = [
  'Waiting for API',
  'Waiting for Confirmation',
  'Tracking',
  'Postponed',
  'Continue Next Week',
  'Waiting',
];
export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
export type ProjectPhase = 'Analysis' | 'Development' | 'Testing' | 'Completed' | 'On Hold' | 'Archived';
export type TimelineStatus = 'On Track' | 'At Risk' | 'Delayed' | 'Completed';
export type InitiativeStatus = 'Planned' | 'In Progress' | 'Done' | 'On Hold';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectDocument {
  name: string;
  url: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  targetDate: string;
  internalTestDate?: string | null;
  uatDate?: string | null;
  productionDate?: string | null;
  ownerId: User | string;
  memberIds: (User | string)[];
  logoUrl?: string;
  documents?: ProjectDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  projectId: string | Project;
  epicId?: string;
  teamId?: string | null;
  sprintId?: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  priorityLevel?: PriorityLevel | null;
  blockedReason?: BlockedReason | null;
  assigneeId?: User | string;
  reporterId: User | string;
  storyPoints?: number;
  tags: string[];
  startDate?: string;
  endDate?: string;
  completedAt?: string | null;
  githubPrLink?: string;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  _id: string;
  name: string;
  leadId?: User | string | null;
  memberIds: (User | string)[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  _id: string;
  name: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  teamId?: Team | string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Initiative {
  _id: string;
  title: string;
  description?: string;
  quarter: string;
  ownerId: User | string;
  externalLink?: string;
  status: InitiativeStatus;
  progressNotes?: { body: string; createdAt: string; userId: User | string }[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReportRow {
  user: { _id: string; name: string; role: string };
  projects: {
    project: { _id: string; name: string };
    tasks: Task[];
  }[];
  totals: {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
    toDo: number;
  };
}

export interface WeeklyReport {
  sprint: Sprint | null;
  team: Team | null;
  rows: WeeklyReportRow[];
}

export interface Standup {
  _id: string;
  userId: User | string;
  projectId: Project | string;
  date: string;
  yesterday: string;
  today: string;
  blockers: string;
  createdAt: string;
}

export interface StandupComment {
  _id: string;
  standupId: string;
  userId: User | string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalTasks: number;
  completionRate: number;
  totalUsers: number;
  tasksByStatus: { _id: TaskStatus; count: number; storyPoints: number }[];
}

export interface ProjectOverviewItem {
  _id: string;
  name: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  timelineStatus: TimelineStatus;
  daysUntilDeadline: number | null;
  targetDate: string;
  internalTestDate?: string | null;
  uatDate?: string | null;
  productionDate?: string | null;
  memberCount: number;
  taskStats: {
    total: number;
    done: number;
    inProgress: number;
    testing: number;
    toDo: number;
    byStatus: Record<string, number>;
  };
  completionPct: number;
  logoUrl?: string | null;
}

export interface PeakPeriod {
  weekStart: string;
  taskCount: number;
}

export interface WorkloadItem {
  _id: string;
  taskCount: number;
  totalStoryPoints: number;
  user: { name: string; email: string; department: string; role: string };
}

export interface TopPerformer {
  userId: string;
  name: string;
  email: string;
  department?: string;
  role: string;
  count: number;
  storyPoints: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
