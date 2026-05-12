import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom';

interface KanbanFilterState {
  selectedProject: string;
  selectedTeam: string;
  selectedMember: string;
  datePreset: DatePreset;
  customStart: string;  // YYYY-MM-DD
  customEnd: string;    // YYYY-MM-DD
  setSelectedProject: (v: string) => void;
  setSelectedTeam: (v: string) => void;
  setSelectedMember: (v: string) => void;
  setDatePreset: (v: DatePreset) => void;
  setCustomRange: (start: string, end: string) => void;
}

export const useKanbanFilterStore = create<KanbanFilterState>()(
  persist(
    (set) => ({
      selectedProject: '',
      selectedTeam: '',
      selectedMember: '',
      datePreset: 'all',
      customStart: '',
      customEnd: '',
      setSelectedProject: (v) => set({ selectedProject: v }),
      setSelectedTeam: (v) => set({ selectedTeam: v }),
      setSelectedMember: (v) => set({ selectedMember: v }),
      setDatePreset: (v) => set({ datePreset: v }),
      setCustomRange: (customStart, customEnd) => set({ customStart, customEnd }),
    }),
    { name: 'kanban-filters' },
  ),
);

/** Convert a preset (or custom range) into ISO strings for the /tasks query. */
export function resolveDateRange(
  preset: DatePreset,
  customStart: string,
  customEnd: string,
): { startDate?: string; endDate?: string } {
  const now = new Date();
  const startOfDay = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
  const endOfDay = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };

  switch (preset) {
    case 'today': {
      return {
        startDate: startOfDay(new Date()).toISOString(),
        endDate: endOfDay(new Date()).toISOString(),
      };
    }
    case 'yesterday': {
      const y = new Date(); y.setDate(y.getDate() - 1);
      return {
        startDate: startOfDay(new Date(y)).toISOString(),
        endDate: endOfDay(new Date(y)).toISOString(),
      };
    }
    case 'thisWeek': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());  // Sunday
      return {
        startDate: startOfDay(start).toISOString(),
        endDate: endOfDay(new Date()).toISOString(),
      };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfDay(start).toISOString(),
        endDate: endOfDay(new Date()).toISOString(),
      };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: startOfDay(start).toISOString(),
        endDate: endOfDay(new Date()).toISOString(),
      };
    }
    case 'custom': {
      const out: { startDate?: string; endDate?: string } = {};
      if (customStart) out.startDate = startOfDay(new Date(customStart)).toISOString();
      if (customEnd) out.endDate = endOfDay(new Date(customEnd)).toISOString();
      return out;
    }
    default:
      return {};
  }
}
