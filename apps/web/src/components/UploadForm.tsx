import { useState } from "react";
import { useTranslation } from "react-i18next";
import { postMultipart } from "../lib/api";
import { Button } from "./ui/button";
import { Upload } from "lucide-react";

interface UploadResponse {
  url: string;
  contentHash: string;
  mime: string;
  size: number;
}

export function UploadForm() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError(t("dev.upload.no_file"));
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await postMultipart<UploadResponse>("/media/upload", formData);
      setResult(response);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dev.upload.error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="file-input" className="block text-sm font-medium mb-2">
            {t("dev.upload.select_file")}
          </label>
          <input
            id="file-input"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90"
            disabled={uploading}
          />
        </div>

        <Button type="submit" disabled={!file || uploading}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? t("dev.upload.uploading") : t("dev.upload.submit")}
        </Button>
      </form>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 rounded-md bg-secondary/10 space-y-2">
          <h4 className="font-medium text-sm">{t("dev.upload.success")}</h4>
          <div className="text-xs space-y-1 font-mono">
            <div><span className="text-muted-foreground">URL:</span> {result.url}</div>
            <div><span className="text-muted-foreground">Hash:</span> {result.contentHash}</div>
            <div><span className="text-muted-foreground">MIME:</span> {result.mime}</div>
            <div><span className="text-muted-foreground">Size:</span> {result.size} bytes</div>
          </div>
        </div>
      )}
    </div>
  );
}