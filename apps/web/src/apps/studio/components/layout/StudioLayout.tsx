import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { useStudio } from '../../hooks/useStudio';
import { useStudioStore } from '../../stores/studio.store';
import { NewProjectWizard } from '../wizards';
import { BuildDialog, PublishDialog, OpenProjectDialog } from '../dialogs';
import type { EnvironmentStatus } from '../../types/studio.types';
import { localServer } from '../../services/localServer.client';
import { getAccessToken } from '@/modules/auth/session';

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'rs':
      return 'rust';
    default:
      return 'plaintext';
  }
}

interface StudioLayoutProps {
  children: React.ReactNode;
  environment?: EnvironmentStatus | null;
}

export function StudioLayout({ children, environment }: StudioLayoutProps) {
  const {
    currentProject,
    activeFile,
    activeFileId,
    openFiles,
    buildStatus,
    layout,
    updateLayout,
    setCurrentProject,
    setBuildStatus,
    updateFileContent,
    openFile,
    markFileSaved,
  } = useStudio();

  // Dialog states from store (for WelcomePage integration)
  const showNewProjectFromStore = useStudioStore((state) => state.showNewProjectDialog);
  const setShowNewProjectFromStore = useStudioStore((state) => state.setShowNewProjectDialog);
  const showOpenProjectFromStore = useStudioStore((state) => state.showOpenProjectDialog);
  const setShowOpenProjectFromStore = useStudioStore((state) => state.setShowOpenProjectDialog);

  // Local dialog states for toolbar
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const handleNewProject = () => {
    setShowNewProjectFromStore(true);
  };

  const handleProjectCreated = async (projectPath: string) => {
    // Load the created project
    try {
      const { localServer } = await import('../../services/localServer.client');
      const project = await localServer.getProject(projectPath);
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
      console.error('Failed to load project:', error);
    }
  };

  const handleOpenProject = () => {
    setShowOpenProjectFromStore(true);
  };

  const handleProjectSelected = async (projectPath: string) => {
    // Load the selected project
    try {
      const { localServer } = await import('../../services/localServer.client');
      const project = await localServer.getProject(projectPath);
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
      console.error('Failed to load project:', error);
    }
  };

  const handleSave = async () => {
    // Save current active file
    if (!activeFile || !activeFile.isDirty) return;

    try {
      await localServer.writeFile(activeFile.path, activeFile.content);
      markFileSaved(activeFile.path);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const handleDev = () => {
    // Dev server is handled by PreviewPanel
  };

  const handleBuild = () => {
    if (currentProject) {
      setShowBuildDialog(true);
    }
  };

  const handleBuildComplete = (success: boolean) => {
    setBuildStatus(success ? 'success' : 'error');
  };

  const handlePublish = () => {
    if (currentProject && buildStatus === 'success') {
      setShowPublishDialog(true);
    }
  };

  const handleSidebarToggle = () => {
    updateLayout({ sidebarCollapsed: !layout.sidebarCollapsed });
  };

  const handleApplyCode = async (path: string, code: string) => {
    // Apply AI-generated code to a file
    // If path matches an open file, update its content
    const targetFile = openFiles.find((f) => f.path.endsWith(path) || path.endsWith(f.path));
    if (targetFile) {
      updateFileContent(targetFile.path, code);
    } else {
      // File not open - open it first, then apply code
      const fullPath = path.startsWith('/') ? path : `${currentProject?.path}/${path}`;
      try {
        // Open the file with the new code
        openFile({
          path: fullPath,
          content: code,
          isDirty: true,
          language: getLanguageFromPath(fullPath),
        });
      } catch (error) {
        console.error('Failed to apply code:', error);
      }
    }
  };

  const handleFileSelect = async (filePath: string) => {
    // Open the selected file in the editor
    try {
      const { localServer } = await import('../../services/localServer.client');
      const content = await localServer.readFile(filePath);
      openFile({
        path: filePath,
        content,
        isDirty: false,
        language: getLanguageFromPath(filePath),
      });
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleSidebarWidthChange = (sizes: number[]) => {
    if (sizes[0]) {
      // Converte percentual para pixels (assumindo viewport width)
      const newWidth = Math.round((sizes[0] / 100) * window.innerWidth);
      if (newWidth !== layout.sidebarWidth) {
        updateLayout({ sidebarWidth: newWidth });
      }
    }
  };

  const statusMessage =
    buildStatus === 'idle'
      ? 'Pronto'
      : buildStatus === 'building'
        ? 'Buildando...'
        : buildStatus === 'success'
          ? 'Build concluido'
          : 'Erro no build';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <Toolbar
        project={currentProject}
        buildStatus={buildStatus}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSave={handleSave}
        onDev={handleDev}
        onBuild={handleBuild}
        onPublish={handlePublish}
      />

      {/* Main area with sidebar */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup
          direction="horizontal"
          onLayout={handleSidebarWidthChange}
        >
          {/* Sidebar */}
          <Panel
            defaultSize={layout.sidebarCollapsed ? 3 : 15}
            minSize={layout.sidebarCollapsed ? 3 : 10}
            maxSize={layout.sidebarCollapsed ? 3 : 30}
            collapsible
            collapsedSize={3}
          >
            <Sidebar
              width={layout.sidebarWidth}
              collapsed={layout.sidebarCollapsed}
              onToggle={handleSidebarToggle}
              project={currentProject}
              currentFile={activeFile ? { path: activeFile.path, content: activeFile.content } : undefined}
              onApplyCode={handleApplyCode}
              onFileSelect={handleFileSelect}
              selectedFile={activeFileId ?? undefined}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/30 transition-colors" />

          {/* Main content */}
          <Panel defaultSize={85} minSize={50}>
            <div className="h-full overflow-auto">{children}</div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status bar */}
      <StatusBar
        status={statusMessage}
        buildStatus={buildStatus}
        projectName={currentProject?.name}
        environment={environment}
      />

      {/* Dialogs */}
      <NewProjectWizard
        open={showNewProjectFromStore}
        onOpenChange={setShowNewProjectFromStore}
        onProjectCreated={handleProjectCreated}
      />

      <OpenProjectDialog
        open={showOpenProjectFromStore}
        onOpenChange={setShowOpenProjectFromStore}
        onProjectSelect={handleProjectSelected}
        onNewProject={handleNewProject}
      />

      {currentProject && (
        <>
          <BuildDialog
            open={showBuildDialog}
            onOpenChange={setShowBuildDialog}
            projectPath={currentProject.path}
            onBuildComplete={handleBuildComplete}
          />

          <PublishDialog
            open={showPublishDialog}
            onOpenChange={setShowPublishDialog}
            projectPath={currentProject.path}
            authToken={getAccessToken() || undefined}
          />
        </>
      )}
    </div>
  );
}
