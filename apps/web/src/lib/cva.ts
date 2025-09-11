// path: apps/web/src/lib/cva.ts
// Utility local para class-variance-authority - substitui dependência externa

export interface VariantProps<T extends (...args: any) => any> {
  // Type para extrair props de variantes
}

export interface CVAConfig {
  variants?: Record<string, Record<string, string>>;
  defaultVariants?: Record<string, string>;
  compoundVariants?: Array<{
    [key: string]: string | string[];
    class: string;
  }>;
}

export function cva(
  base: string,
  config?: CVAConfig
) {
  return function(props: Record<string, any> = {}) {
    let classes = base;
    
    // Aplicar variantes
    if (config?.variants) {
      Object.entries(config.variants).forEach(([variantKey, variantOptions]) => {
        const selectedVariant = props[variantKey] || config?.defaultVariants?.[variantKey];
        if (selectedVariant && variantOptions[selectedVariant]) {
          classes += ` ${variantOptions[selectedVariant]}`;
        }
      });
    }
    
    // Aplicar compound variants
    if (config?.compoundVariants) {
      config.compoundVariants.forEach(compound => {
        const { class: compoundClass, ...conditions } = compound;
        
        const matchesAll = Object.entries(conditions).every(([key, value]) => {
          const propValue = props[key];
          if (Array.isArray(value)) {
            return value.includes(propValue);
          }
          return propValue === value;
        });
        
        if (matchesAll) {
          classes += ` ${compoundClass}`;
        }
      });
    }
    
    return classes.trim();
  };
}

// Helper para criar variant props type
export function createVariantProps<T extends Record<string, any>>(config: T): T {
  return config;
}