import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Project,
  OpenFile,
  LayoutState,
  BuildStatus,
  RecentProject,
} from '../types/studio.types';

interface StudioState {
  // Projeto atual
  currentProject: Project | null;

  // Arquivos abertos
  openFiles: OpenFile[];
  activeFileId: string | null;

  // Layout
  layout: LayoutState;

  // Status
  buildStatus: BuildStatus;
  devServerUrl: string | null;

  // Projetos recentes
  recentProjects: RecentProject[];

  // UI Dialogs
  showNewProjectDialog: boolean;
  showOpenProjectDialog: boolean;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string) => void;
  updateLayout: (updates: Partial<LayoutState>) => void;
  setBuildStatus: (status: BuildStatus) => void;
  setDevServerUrl: (url: string | null) => void;
  addRecentProject: (project: RecentProject) => void;
  clearRecentProjects: () => void;
  setShowNewProjectDialog: (show: boolean) => void;
  setShowOpenProjectDialog: (show: boolean) => void;
  openRecentProject: (projectId: string) => Promise<void>;
}

const DEFAULT_LAYOUT: LayoutState = {
  sidebarWidth: 250,
  sidebarCollapsed: false,
  terminalHeight: 200,
  terminalVisible: false,
  previewWidth: 50, // 50% do espaco restante
  previewVisible: false,
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      openFiles: [],
      activeFileId: null,
      layout: DEFAULT_LAYOUT,
      buildStatus: 'idle',
      devServerUrl: null,
      recentProjects: [],
      showNewProjectDialog: false,
      showOpenProjectDialog: false,

      // Actions
      setCurrentProject: (project) => {
        set({ currentProject: project });

        // Adiciona aos projetos recentes
        if (project) {
          get().addRecentProject({
            id: project.id,
            name: project.name,
            path: project.path,
            type: project.type,
            lastOpened: new Date().toISOString(),
          });
        }
      },

      openFile: (file) => {
        const { openFiles } = get();
        const existing = openFiles.find((f) => f.path === file.path);

        if (existing) {
          // Arquivo ja aberto, apenas ativa
          set({ activeFileId: file.path });
        } else {
          // Adiciona novo arquivo
          set({
            openFiles: [...openFiles, file],
            activeFileId: file.path,
          });
        }
      },

      closeFile: (path) => {
        const { openFiles, activeFileId } = get();
        const newFiles = openFiles.filter((f) => f.path !== path);

        // Se fechou o arquivo ativo, ativa o proximo
        let newActiveId = activeFileId;
        if (activeFileId === path) {
          const closedIndex = openFiles.findIndex((f) => f.path === path);
          if (newFiles.length > 0) {
            newActiveId =
              newFiles[Math.min(closedIndex, newFiles.length - 1)]?.path ??
              null;
          } else {
            newActiveId = null;
          }
        }

        set({ openFiles: newFiles, activeFileId: newActiveId });
      },

      setActiveFile: (path) => {
        set({ activeFileId: path });
      },

      updateFileContent: (path, content) => {
        const { openFiles } = get();
        set({
          openFiles: openFiles.map((f) =>
            f.path === path ? { ...f, content, isDirty: true } : f
          ),
        });
      },

      markFileSaved: (path) => {
        const { openFiles } = get();
        set({
          openFiles: openFiles.map((f) =>
            f.path === path ? { ...f, isDirty: false } : f
          ),
        });
      },

      updateLayout: (updates) => {
        const { layout } = get();
        set({ layout: { ...layout, ...updates } });
      },

      setBuildStatus: (status) => {
        set({ buildStatus: status });
      },

      setDevServerUrl: (url) => {
        set({ devServerUrl: url });
      },

      addRecentProject: (project) => {
        const { recentProjects } = get();
        // Remove se ja existe para mover para o topo
        const filtered = recentProjects.filter((p) => p.id !== project.id);
        // Mantem apenas os 10 mais recentes
        const updated = [project, ...filtered].slice(0, 10);
        set({ recentProjects: updated });
      },

      clearRecentProjects: () => {
        set({ recentProjects: [] });
      },

      setShowNewProjectDialog: (show) => {
        set({ showNewProjectDialog: show });
      },

      setShowOpenProjectDialog: (show) => {
        set({ showOpenProjectDialog: show });
      },

      openRecentProject: async (projectId) => {
        const { recentProjects, setCurrentProject } = get();
        const recent = recentProjects.find((p) => p.id === projectId);
        if (!recent) return;

        try {
          // Dynamic import to avoid circular deps
          const { localServer } = await import('../services/localServer.client');
          const project = await localServer.getProject(recent.path);
          if (project) {
            setCurrentProject({
              id: project.id,
              name: project.name,
              path: project.path,
              description: project.description,
              version: project.version,
              type: project.type,
              category: project.category || 'tools',
              author: 'Developer',
              template: 'react-ts',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Failed to open recent project:', error);
        }
      },
    }),
    {
      name: 'bazari-studio',
      partialize: (state) => ({
        layout: state.layout,
        recentProjects: state.recentProjects,
      }),
    }
  )
);
