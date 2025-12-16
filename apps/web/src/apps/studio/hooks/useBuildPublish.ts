/**
 * useBuildPublish - Hook for managing build and publish operations
 */

import { useState, useCallback } from 'react';
import { localServer } from '../services/localServer.client';

export interface BuildInfo {
  hash: string;
  size: number;
  timestamp: string;
}

export interface PublishInfo {
  cid: string;
  bundleUrl: string;
  appId: string;
  versionId: string;
}

export interface UseBuildPublishOptions {
  projectPath: string;
  authToken?: string;
  onBuildStart?: () => void;
  onBuildComplete?: (success: boolean, buildInfo?: BuildInfo) => void;
  onPublishStart?: () => void;
  onPublishComplete?: (success: boolean, publishInfo?: PublishInfo) => void;
}

export interface UseBuildPublishReturn {
  // State
  isBuilding: boolean;
  isPublishing: boolean;
  buildError: string | null;
  publishError: string | null;
  lastBuildInfo: BuildInfo | null;
  lastPublishInfo: PublishInfo | null;

  // Actions
  build: () => Promise<boolean>;
  publish: (changelog?: string) => Promise<boolean>;
  installDependencies: () => Promise<boolean>;
  typeCheck: () => Promise<boolean>;

  // Project status
  checkProjectStatus: () => Promise<{
    hasNodeModules: boolean;
    hasBuild: boolean;
    buildInfo: BuildInfo | null;
  }>;

  // Reset
  clearErrors: () => void;
}

export function useBuildPublish(options: UseBuildPublishOptions): UseBuildPublishReturn {
  const { projectPath, authToken, onBuildStart, onBuildComplete, onPublishStart, onPublishComplete } = options;

  const [isBuilding, setIsBuilding] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [lastBuildInfo, setLastBuildInfo] = useState<BuildInfo | null>(null);
  const [lastPublishInfo, setLastPublishInfo] = useState<PublishInfo | null>(null);

  /**
   * Install dependencies
   */
  const installDependencies = useCallback(async (): Promise<boolean> => {
    try {
      const result = await localServer.npmInstall(projectPath);
      return result.success;
    } catch (error) {
      console.error('Install error:', error);
      return false;
    }
  }, [projectPath]);

  /**
   * Run type check
   */
  const typeCheck = useCallback(async (): Promise<boolean> => {
    try {
      const result = await localServer.typeCheck(projectPath);
      return result.success;
    } catch (error) {
      console.error('Type check error:', error);
      return false;
    }
  }, [projectPath]);

  /**
   * Build the project
   */
  const build = useCallback(async (): Promise<boolean> => {
    if (isBuilding) return false;

    setIsBuilding(true);
    setBuildError(null);
    onBuildStart?.();

    try {
      // First install dependencies
      const installResult = await localServer.npmInstall(projectPath);
      if (!installResult.success) {
        throw new Error('Failed to install dependencies');
      }

      // Then build
      const buildResult = await localServer.runBuild(projectPath);

      if (!buildResult.success) {
        throw new Error('Build failed');
      }

      const buildInfo = buildResult.buildInfo || null;
      setLastBuildInfo(buildInfo);
      onBuildComplete?.(true, buildInfo as BuildInfo | undefined);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setBuildError(errorMessage);
      onBuildComplete?.(false);
      return false;
    } finally {
      setIsBuilding(false);
    }
  }, [projectPath, isBuilding, onBuildStart, onBuildComplete]);

  /**
   * Publish the project
   */
  const publish = useCallback(async (changelog?: string): Promise<boolean> => {
    if (isPublishing) return false;

    if (!authToken) {
      setPublishError('Authentication required');
      return false;
    }

    setIsPublishing(true);
    setPublishError(null);
    onPublishStart?.();

    try {
      // Prepare publish (creates tarball)
      const prepareResult = await localServer.preparePublish(projectPath);

      if (!prepareResult.success) {
        throw new Error(prepareResult.error || 'Failed to prepare publish');
      }

      // Submit to app store
      const submitResult = await localServer.submitPublish(
        projectPath,
        authToken,
        changelog
      );

      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Failed to publish');
      }

      const publishInfo: PublishInfo = {
        cid: submitResult.cid || '',
        bundleUrl: submitResult.bundleUrl || '',
        appId: submitResult.appId || '',
        versionId: submitResult.versionId || '',
      };

      setLastPublishInfo(publishInfo);
      onPublishComplete?.(true, publishInfo);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPublishError(errorMessage);
      onPublishComplete?.(false);
      return false;
    } finally {
      setIsPublishing(false);
    }
  }, [projectPath, authToken, isPublishing, onPublishStart, onPublishComplete]);

  /**
   * Check project status
   */
  const checkProjectStatus = useCallback(async () => {
    try {
      const [hasNodeModulesCheck, hasBuildCheck] = await Promise.all([
        localServer.exists(`${projectPath}/node_modules`),
        localServer.exists(`${projectPath}/dist`),
      ]);

      let buildInfo: BuildInfo | null = null;

      if (hasBuildCheck) {
        try {
          const infoContent = await localServer.readFile(`${projectPath}/.build-info.json`);
          buildInfo = JSON.parse(infoContent);
        } catch {
          // No build info file
        }
      }

      return {
        hasNodeModules: hasNodeModulesCheck,
        hasBuild: hasBuildCheck,
        buildInfo,
      };
    } catch (error) {
      console.error('Status check error:', error);
      return {
        hasNodeModules: false,
        hasBuild: false,
        buildInfo: null,
      };
    }
  }, [projectPath]);

  /**
   * Clear errors
   */
  const clearErrors = useCallback(() => {
    setBuildError(null);
    setPublishError(null);
  }, []);

  return {
    isBuilding,
    isPublishing,
    buildError,
    publishError,
    lastBuildInfo,
    lastPublishInfo,
    build,
    publish,
    installDependencies,
    typeCheck,
    checkProjectStatus,
    clearErrors,
  };
}

export default useBuildPublish;
