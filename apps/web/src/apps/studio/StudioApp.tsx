import { EnvironmentCheck } from './components/layout/EnvironmentCheck';
import { StudioLayout } from './components/layout/StudioLayout';
import { EditorPreviewLayout } from './components/layout/EditorPreviewLayout';
import { WelcomePage } from './pages/WelcomePage';
import { useStudioStore } from './stores/studio.store';

export default function StudioApp() {
  const currentProject = useStudioStore((state) => state.currentProject);

  // EnvironmentCheck verifica CLI Server e ferramentas ANTES de renderizar
  // Passa o environment para o StudioLayout via render props
  return (
    <EnvironmentCheck>
      {(environment) => (
        <StudioLayout environment={environment}>
          {currentProject ? (
            <EditorPreviewLayout projectPath={currentProject.path} />
          ) : (
            <WelcomePage />
          )}
        </StudioLayout>
      )}
    </EnvironmentCheck>
  );
}
