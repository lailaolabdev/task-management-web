import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface KanbanFilterState {
  selectedProject: string;
  selectedTeam: string;
  selectedMember: string;
  setSelectedProject: (v: string) => void;
  setSelectedTeam: (v: string) => void;
  setSelectedMember: (v: string) => void;
}

export const useKanbanFilterStore = create<KanbanFilterState>()(
  persist(
    (set) => ({
      selectedProject: '',
      selectedTeam: '',
      selectedMember: '',
      setSelectedProject: (v) => set({ selectedProject: v }),
      setSelectedTeam: (v) => set({ selectedTeam: v }),
      setSelectedMember: (v) => set({ selectedMember: v }),
    }),
    { name: 'kanban-filters' },
  ),
);
