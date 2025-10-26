import { X, Loader2 } from "lucide-react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { UploadProgress as UploadProgressType } from "../lib/chunkedUpload";

interface UploadProgressProps {
  progress: UploadProgressType;
  onCancel?: () => void;
  filename: string;
}

export function UploadProgressBar({ progress, onCancel, filename }: UploadProgressProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="border rounded-lg p-4 bg-background">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{filename}</p>
            <p className="text-xs text-muted-foreground">
              Enviando vídeo...
            </p>
          </div>
        </div>
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <Progress value={progress.progress} className="h-2 mb-2" />

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{progress.progress.toFixed(1)}%</span>
        <span>{formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}</span>
        <span>{formatSpeed(progress.speed)}</span>
        {progress.estimatedTime > 0 && (
          <span>~{formatTime(progress.estimatedTime)} restante</span>
        )}
        <span className="hidden md:inline">
          Chunk {progress.currentChunk}/{progress.totalChunks}
        </span>
      </div>
    </div>
  );
}
