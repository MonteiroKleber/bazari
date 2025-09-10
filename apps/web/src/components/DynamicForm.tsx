// V-2: i18n fixes — mensagens/labels/CTA (2025-09-10)

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowRight } from 'lucide-react';

interface DynamicFormProps {
  schema: any;
  uiSchema?: any;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export function DynamicForm({ schema, uiSchema = {}, onSubmit, loading = false }: DynamicFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sanitizeAttributes = (raw: Record<string, any>) => {
    const clean: Record<string, any> = {};
    const props = schema?.properties || {};

    const normalize = (v: any) => (v === '' || v === null ? undefined : v);

    for (const [key, def] of Object.entries(props as Record<string, any>)) {
      const val = raw[key];

      // remove vazios se não requerido
      const isRequired = Array.isArray(schema?.required) && schema.required.includes(key);
      if ((val === '' || val === null || typeof val === 'undefined') && !isRequired) {
        continue;
      }

      // enum → garante que é string e tenta casar exatamente
      if (Array.isArray((def as any).enum)) {
        if (typeof val !== 'string') continue;
        const options = (def as any).enum as string[];
        // match exato primeiro
        if (options.includes(val)) {
          clean[key] = val;
          continue;
        }
        // normalização leve (case/acentos)
        const norm = (s: string) =>
          s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
        const found = options.find((opt) => norm(opt) === norm(val));
        if (found) {
          clean[key] = found;
          continue;
        }
        // não conseguiu normalizar, mantém original para o backend validar
        clean[key] = val;
        continue;
      }

      // tipos básicos
      if ((def as any).type === 'boolean') {
        clean[key] = Boolean(val);
        continue;
      }
      if ((def as any).type === 'integer') {
        const n = typeof val === 'number' ? val : parseInt(String(val), 10);
        if (Number.isFinite(n)) clean[key] = n;
        continue;
      }
      if ((def as any).type === 'number') {
        const n = typeof val === 'number' ? val : parseFloat(String(val));
        if (Number.isFinite(n)) clean[key] = n;
        continue;
      }
      if ((def as any).type === 'array' && (def as any).items?.type === 'string') {
        if (Array.isArray(val)) {
          const arr = val.filter((s) => typeof s === 'string' && s.trim() !== '');
          if (arr.length) clean[key] = arr;
        } else if (typeof val === 'string') {
          const arr = val
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s !== '');
          if (arr.length) clean[key] = arr;
        }
        continue;
      }

      // default (string/objeto/etc)
      const v2 = normalize(val);
      if (typeof v2 !== 'undefined') clean[key] = v2;
    }

    return clean;
  };

  if (!schema || !schema.properties) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>{t('new.no_schema_title', 'Sem atributos específicos')}</p>
        <p className="text-sm mt-2">
          {t('new.no_schema_desc', 'Categoria sem atributos específicos configurados')}
        </p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    const newErrors: Record<string, string> = {};
    
    if (schema.required) {
      schema.required.forEach((field: string) => {
        if (!formData[field] || formData[field] === '') {
          newErrors[field] = t('forms.field_required', 'Campo obrigatório');
        }
      });
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(sanitizeAttributes(formData));
  };

  const renderField = (name: string, property: any) => {
    const value = formData[name] ?? '';
    const error = errors[name];
    const isRequired = schema.required?.includes(name);
    
    // Enum com uiSchema.widget: 'select' (padrão) ou 'radio'
    if (property.enum) {
      const widget = uiSchema?.[name]?.widget || 'select';
      const options: string[] = property.enum as string[];
      const inputId = `field-${name}`;

      if (widget === 'radio') {
        return (
          <div key={name}>
            <Label className="mb-2 block">
              {name} {isRequired && '*'}
            </Label>
            <div className="flex flex-wrap gap-3">
              {options.map((option) => {
                const optId = `${inputId}-${option}`;
                return (
                  <label key={optId} htmlFor={optId} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      id={optId}
                      type="radio"
                      name={name}
                      value={option}
                      checked={value === option}
                      onChange={(e) => {
                        setFormData({ ...formData, [name]: e.target.value });
                        setErrors({ ...errors, [name]: '' });
                      }}
                      className="h-4 w-4 border-gray-300"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                );
              })}
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
      }

      // default => select
      return (
        <div key={name}>
          <Label htmlFor={inputId}>
            {name} {isRequired && '*'}
          </Label>
          <select
            id={inputId}
            value={value ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : e.target.value;
              setFormData({ ...formData, [name]: v });
              setErrors({ ...errors, [name]: '' });
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            {!isRequired && <option value="">--</option>}
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    }
    
    // Checkbox simples para boolean
    if (property.type === 'boolean') {
      return (
        <div key={name} className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={name}
            checked={value === true}
            onChange={(e) => {
              setFormData({ ...formData, [name]: e.target.checked });
              setErrors({ ...errors, [name]: '' });
            }}
            className="w-4 h-4 rounded border-gray-300"
          />
          <Label htmlFor={name} className="cursor-pointer">
            {name} {isRequired && '*'}
          </Label>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    }
    
    // Number input
    if (property.type === 'number' || property.type === 'integer') {
      return (
        <div key={name}>
          <Label htmlFor={name}>
            {name} {isRequired && '*'}
          </Label>
          <Input
            id={name}
            type="number"
            value={value}
            onChange={(e) => {
              const val = property.type === 'integer' 
                ? (e.target.value === '' ? '' : parseInt(e.target.value) || '')
                : (e.target.value === '' ? '' : parseFloat(e.target.value) || '');
              setFormData({ ...formData, [name]: val });
              setErrors({ ...errors, [name]: '' });
            }}
            min={property.minimum}
            max={property.maximum}
            step={property.type === 'integer' ? '1' : 'any'}
            placeholder={property.minimum ? `${t('forms.min', 'Mínimo')}: ${property.minimum}` : ''}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    }
    
    // Array de strings (chips simplificado)
    if (property.type === 'array' && property.items?.type === 'string') {
      return (
        <div key={name}>
          <Label htmlFor={name}>
            {name} {isRequired && '*'}
            <span className="text-xs text-muted-foreground ml-2">
              {t('forms.separate_by_commas', '(separe com vírgulas)')}
            </span>
          </Label>
          <Input
            id={name}
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => {
              setFormData({ ...formData, [name]: e.target.value });
              setErrors({ ...errors, [name]: '' });
            }}
            placeholder={t('forms.example_colors', 'ex.: Azul, Branco')}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    // Text input por padrão
    return (
      <div key={name}>
        <Label htmlFor={name}>
          {name} {isRequired && '*'}
        </Label>
        <Input
          id={name}
          value={value}
          onChange={(e) => {
            setFormData({ ...formData, [name]: e.target.value });
            setErrors({ ...errors, [name]: '' });
          }}
          placeholder={t('forms.type_x', 'Digite {{field}}', { field: name })}
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  };

  const properties = Object.entries(schema.properties || {});
  
  if (properties.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">
          {t('new.no_attributes', 'Esta categoria não possui atributos específicos.')}
        </p>
        <Button 
          onClick={() => onSubmit({})} 
          disabled={loading}
          className="mt-4"
        >
          {loading ? t('common.sending', 'Enviando...') : t('new.finish', 'Finalizar Cadastro')}
          {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {properties.map(([name, property]) => 
        renderField(name, property as any)
      )}
      
      <div className="pt-4">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('common.sending', 'Enviando...') : t('new.finish', 'Finalizar Cadastro')}
          {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </form>
  );
}

export default DynamicForm;
