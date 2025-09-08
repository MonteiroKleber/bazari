import { useApiHealth } from "../hooks/useApiHealth";
import { useTranslation } from "react-i18next";

interface ApiHealthProps {
  compact?: boolean;
}

export function ApiHealth({ compact = false }: ApiHealthProps) {
  const { t } = useTranslation();
  const { loading, error, data, ok } = useApiHealth(compact ? 0 : 15000); // Poll only if not compact

  // Determinar status e cor
  const getStatus = () => {
    if (loading) return { color: "text-yellow-500", label: t("header.status.loading") };
    if (error) return { color: "text-red-500", label: t("header.status.offline") };
    if (ok) return { color: "text-green-500", label: t("header.status.online") };
    return { color: "text-yellow-500", label: t("header.status.unstable") };
  };

  const status = getStatus();

  if (compact) {
    // Versão compacta para Header público
    return (
      <div className="flex items-center gap-2">
        <span className={`relative flex h-2 w-2 ${status.color}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.color.replace('text-', 'bg-')}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${status.color.replace('text-', 'bg-')}`}></span>
        </span>
        <span className={`text-xs ${status.color}`}>{status.label}</span>
      </div>
    );
  }

  // Versão detalhada para Header interno
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className={`relative flex h-2 w-2 ${status.color}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.color.replace('text-', 'bg-')}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${status.color.replace('text-', 'bg-')}`}></span>
        </span>
        <span className={status.color}>{status.label}</span>
      </div>
      {data && !loading && (
        <>
          {data.version && (
            <span className="text-muted-foreground">v{data.version}</span>
          )}
          {data.env && (
            <span className="text-muted-foreground">{data.env}</span>
          )}
        </>
      )}
    </div>
  );
}