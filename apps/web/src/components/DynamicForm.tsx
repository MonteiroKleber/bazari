// V-4: i18n aprimorado para campos dinâmicos
// - Suporta chaves globais (new.dynamicFields.*) e i18n embutido no spec: uiSchema.i18n[lang][field]
// - Tradução de labels, placeholders e opções enum
// - Mantém layout/estilo; sem alterações visuais
// - 2025-09-10

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowRight } from 'lucide-react';

interface JsonSchemaProp {
  type?: string | string[];
  enum?: string[];
  items?: { type?: string; enum?: string[] };
  title?: string;
  description?: string;
  format?: string;
}

interface UiFieldI18n {
  label?: string;
  placeholder?: string;
  options?: Record<string, string>;
}

interface UiSchemaI18nByLang {
  [lang: string]: {
    [fieldName: string]: UiFieldI18n;
  };
}

interface DynamicFormProps {
  schema: {
    type: 'object';
    properties: Record<string, JsonSchemaProp>;
    required?: string[];
  };
  uiSchema?: Record<string, any> & { i18n?: UiSchemaI18nByLang };
  onSubmit: (data: any) => void;
  loading?: boolean;
}

/**
 * Dynamic form driven by a JSON Schema and optional uiSchema.
 * NOTE: Visual stays intact. Only behavior for i18n/sanitization improved.
 */
function DynamicForm({ schema, uiSchema = {}, onSubmit, loading = false }: DynamicFormProps) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lang = (i18n.language || 'pt').split('-')[0];

  const required = useMemo(() => new Set(schema?.required ?? []), [schema?.required]);

  const uiI18n: UiSchemaI18nByLang | undefined = (uiSchema as any).i18n;

  const prettyName = (name: string) =>
    name
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const specI18nLabel = (name: string): string | undefined =>
    uiI18n?.[lang]?.[name]?.label ?? uiI18n?.[lang]?.[name]?.label; // redundância intencional p/ clareza

  const specI18nPlaceholder = (name: string): string | undefined =>
    uiI18n?.[lang]?.[name]?.placeholder ?? uiI18n?.[lang]?.[name]?.placeholder;

  const specI18nOption = (name: string, option: string): string | undefined =>
    uiI18n?.[lang]?.[name]?.options?.[option];

  const toLabel = (name: string, def?: JsonSchemaProp) => {
    // 1) i18n no spec (por idioma)
    const fromSpec = specI18nLabel(name);
    if (fromSpec) return fromSpec;

    // 2) i18n global do app
    const key = `new.dynamicFields.${name}.label`;
    const fallback = def?.title ?? def?.description ?? prettyName(name);
    const fromGlobal = t(key, fallback);
    return fromGlobal;
  };

  const toPlaceholder = (name: string) => {
    // 1) i18n no spec (por idioma)
    const fromSpec = specI18nPlaceholder(name);
    if (fromSpec) return fromSpec;

    // 2) i18n global do app
    const key = `new.dynamicFields.${name}.placeholder`;
    return t(key, t('new.dynamic.inputPlaceholder', 'Digite o valor'));
  };

  const toOptionLabel = (name: string, opt: string) => {
    // 1) i18n no spec (por idioma)
    const fromSpec = specI18nOption(name, opt);
    if (fromSpec) return fromSpec;

    // 2) i18n global do app
    const key = `new.dynamicFields.${name}.options.${opt}`;
    return t(key, opt);
  };

  const normalizeEnum = (val: string, options: string[]) => {
    const norm = (s: string) =>
      (s ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    const found = options.find((opt) => norm(opt) === norm(val));
    return found ?? val;
  };

  const sanitizePayload = (data: Record<string, any>) => {
    const out: Record<string, any> = {};
    for (const [key, defAny] of Object.entries(schema.properties ?? {})) {
      const def = defAny as JsonSchemaProp;
      let val = (data as any)[key];
      if (val === '' || val === null || typeof val === 'undefined') {
        continue;
      }

      const type = Array.isArray(def.type) ? def.type[0] : def.type;

      if (def.enum && typeof val === 'string') {
        out[key] = normalizeEnum(val, def.enum);
        continue;
      }

      if (type === 'number' || type === 'integer') {
        const num = typeof val === 'number' ? val : Number(String(val).replace(',', '.'));
        if (!Number.isNaN(num)) out[key] = num;
        continue;
      }

      if (type === 'boolean') {
        out[key] = Boolean(val);
        continue;
      }

      if (type === 'array') {
        if (Array.isArray(val)) {
          out[key] = val.filter((v) => v !== '' && v !== null && typeof v !== 'undefined');
        } else if (typeof val === 'string') {
          out[key] = val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
        continue;
      }

      // default: string or unknown
      out[key] = val;
    }
    return out;
  };

  const validate = (data: Record<string, any>) => {
    const errs: Record<string, string> = {};
    for (const req of required) {
      const v = (data as any)[req];
      if (v === '' || v === null || typeof v === 'undefined') {
        errs[req] = t('new.dynamic.required', 'Campo obrigatório');
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizePayload(formData);
    if (!validate(clean)) return;
    onSubmit(clean);
  };

  const renderField = (name: string, def: JsonSchemaProp) => {
    const ui = (uiSchema as any)[name] ?? {};
    const label = toLabel(name, def);
    const isRequired = required.has(name);

    // ENUM
    if (def.enum && Array.isArray(def.enum)) {
      const asRadio = ui?.widget === 'radio';
      const options = def.enum;

      if (asRadio) {
        return (
          <div key={name} className="space-y-2">
            <Label className="font-medium">
              {label} {isRequired && <span className="text-red-600">*</span>}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {options.map((opt) => (
                <label key={opt} className="flex items-center space-x-2 p-2 rounded border">
                  <input
                    type="radio"
                    name={name}
                    value={opt}
                    checked={formData[name] === opt}
                    onChange={(e) => {
                      setFormData({ ...formData, [name]: e.target.value });
                      setErrors({ ...errors, [name]: '' });
                    }}
                  />
                  <span>{toOptionLabel(name, opt)}</span>
                </label>
              ))}
            </div>
            {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
          </div>
        );
      }

      // default enum -> select
      return (
        <div key={name} className="space-y-2">
          <Label className="font-medium">
            {label} {isRequired && <span className="text-red-600">*</span>}
          </Label>
          <select
            className="w-full rounded border px-3 py-2 bg-background"
            value={formData[name] ?? ''}
            onChange={(e) => {
              setFormData({ ...formData, [name]: e.target.value });
              setErrors({ ...errors, [name]: '' });
            }}
          >
            <option value="">{t('new.dynamic.selectOption', 'Selecione')}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {toOptionLabel(name, opt)}
              </option>
            ))}
          </select>
          {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
        </div>
      );
    }

    // BOOLEAN
    if (def.type === 'boolean') {
      return (
        <div key={name} className="flex items-center space-x-2">
          <input
            id={name}
            type="checkbox"
            checked={Boolean(formData[name])}
            onChange={(e) => {
              setFormData({ ...formData, [name]: e.target.checked });
              setErrors({ ...errors, [name]: '' });
            }}
          />
          <Label htmlFor={name}>
            {label} {isRequired && <span className="text-red-600">*</span>}
          </Label>
          {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
        </div>
      );
    }

    // ARRAY of strings (simple CSV input)
    if (def.type === 'array' && def.items?.type === 'string') {
      const val: string[] = Array.isArray(formData[name]) ? formData[name] : [];
      const placeholder = toPlaceholder(name);
      return (
        <div key={name} className="space-y-2">
          <Label className="font-medium">
            {label} {isRequired && <span className="text-red-600">*</span>}
          </Label>
          <Input
            value={val.join(', ')}
            placeholder={placeholder}
            onChange={(e) => {
              const raw = e.target.value;
              const arr = raw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              setFormData({ ...formData, [name]: arr });
              setErrors({ ...errors, [name]: '' });
            }}
          />
          <p className="text-xs text-muted-foreground">{t('new.dynamic.hintCsv', 'Separe por vírgulas')}</p>
          {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
        </div>
      );
    }

    // NUMBER / INTEGER
    if (def.type === 'number' || def.type === 'integer') {
      return (
        <div key={name} className="space-y-2">
          <Label className="font-medium">
            {label} {isRequired && <span className="text-red-600">*</span>}
          </Label>
          <Input
            type="number"
            value={formData[name] ?? ''}
            placeholder={toPlaceholder(name)}
            onChange={(e) => {
              setFormData({ ...formData, [name]: e.target.value });
              setErrors({ ...errors, [name]: '' });
            }}
          />
          {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
        </div>
      );
    }

    // STRING (default)
    const widget = ui?.widget as string | undefined;
    if (widget === 'textarea') {
      const rows = ui?.rows ?? 4;
      return (
        <div key={name} className="space-y-2">
          <Label className="font-medium">
            {label} {isRequired && <span className="text-red-600">*</span>}
          </Label>
          <textarea
            className="w-full rounded border px-3 py-2 bg-background"
            rows={rows}
            value={formData[name] ?? ''}
            placeholder={toPlaceholder(name)}
            onChange={(e) => {
              setFormData({ ...formData, [name]: e.target.value });
              setErrors({ ...errors, [name]: '' });
            }}
          />
          {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
        </div>
      );
    }

    // default input
    return (
      <div key={name} className="space-y-2">
        <Label className="font-medium">
          {label} {isRequired && <span className="text-red-600">*</span>}
        </Label>
        <Input
          value={formData[name] ?? ''}
          placeholder={toPlaceholder(name)}
          onChange={(e) => {
            setFormData({ ...formData, [name]: e.target.value });
            setErrors({ ...errors, [name]: '' });
          }}
        />
        {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
      </div>
    );
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {Object.entries(schema?.properties ?? {}).map(([name, def]) => renderField(name, def as JsonSchemaProp))}

      <div className="pt-4">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('common.sending', 'Enviando...') : t('new.finish', 'Finalizar Cadastro')}
          {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </form>
  );
}

export { DynamicForm };
export default DynamicForm;
