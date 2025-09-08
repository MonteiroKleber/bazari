import { useTranslation } from "react-i18next";
import { useCategories } from "../hooks/useCategories";
import { UploadForm } from "./UploadForm";

export function DevPanel() {
  const { t, i18n } = useTranslation();
  const { loading, error, categories } = useCategories();

  // Só renderiza em desenvolvimento
  if (import.meta.env.PROD) {
    return null;
  }

  const getCategoryName = (category: any) => {
    switch (i18n.language) {
      case "en":
        return category.nameEn;
      case "es":
        return category.nameEs;
      default:
        return category.namePt;
    }
  };

  const getCategoryType = (pathSlugs: string[]) => {
    // O primeiro item do pathSlugs é "products" ou "services"
    return pathSlugs[0] === "products" ? "product" : "service";
  };

  return (
    <div className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">{t("dev.panel.title")}</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Categories Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("dev.categories.title")}</h3>
              
              {loading && (
                <p className="text-sm text-muted-foreground">{t("dev.categories.loading")}</p>
              )}
              
              {error && (
                <p className="text-sm text-destructive">{t("dev.categories.error")}</p>
              )}
              
              {!loading && !error && categories.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">{t("dev.categories.name")}</th>
                        <th className="text-left py-2">{t("dev.categories.level")}</th>
                        <th className="text-left py-2">{t("dev.categories.type")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.slice(0, 10).map((category) => (
                        <tr key={category.id} className="border-b">
                          <td className="py-2">{getCategoryName(category)}</td>
                          <td className="py-2">{category.level}</td>
                          <td className="py-2">{getCategoryType(category.pathSlugs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {categories.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("dev.categories.showing", { count: 10, total: categories.length })}
                    </p>
                  )}
                </div>
              )}
              
              {!loading && !error && categories.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("dev.categories.empty")}</p>
              )}
            </div>

            {/* Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("dev.upload.title")}</h3>
              <UploadForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}