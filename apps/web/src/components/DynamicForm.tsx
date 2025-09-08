// path: apps/web/src/components/DynamicForm.tsx

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

interface DynamicFormProps {
  jsonSchema: any;
  uiSchema: any;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export function DynamicForm({ jsonSchema, uiSchema, onSubmit, loading }: DynamicFormProps) {
  const { t } = useTranslation();
  const [zodSchema, setZodSchema] = useState<z.ZodSchema | null>(null);

  // Converter JSON Schema para Zod
  useEffect(() => {
    if (!jsonSchema) return;

    const convertToZod = (schema: any): z.ZodSchema => {
      const shape: Record<string, z.ZodSchema> = {};

      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
          let field: z.ZodSchema;

          switch (prop.type) {
            case 'string':
              field = z.string();
              if (prop.minLength) field = (field as z.ZodString).min(prop.minLength);
              if (prop.maxLength) field = (field as z.ZodString).max(prop.maxLength);
              if (prop.pattern) field = (field as z.ZodString).regex(new RegExp(prop.pattern));
              break;
            
            case 'number':
            case 'integer':
              field = z.number();
              if (prop.minimum !== undefined) field = (field as z.ZodNumber).min(prop.minimum);
              if (prop.maximum !== undefined) field = (field as z.ZodNumber).max(prop.maximum);
              break;
            
            case 'boolean':
              field = z.boolean();
              break;
            
            case 'array':
              field = z.array(z.string()); // Simplificado
              break;
            
            default:
              field = z.any();
          }

          // Aplicar required
          if (!schema.required?.includes(key)) {
            field = field.optional();
          }

          shape[key] = field;
        });
      }

      return z.object(shape);
    };

    try {
      const schema = convertToZod(jsonSchema);
      setZodSchema(schema);
    } catch (error) {
      console.error('Error converting schema:', error);
    }
  }, [jsonSchema]);

  const form = useForm({
    resolver: zodSchema ? zodResolver(zodSchema) : undefined,
  });

  const renderField = (key: string, schema: any, uiHints: any = {}) => {
    const property = schema.properties[key];
    const isRequired = schema.required?.includes(key);
    const label = uiHints['ui:title'] || key;
    const placeholder = uiHints['ui:placeholder'] || '';
    const description = uiHints['ui:help'] || property.description;
    const widget = uiHints['ui:widget'];

    // Escolher widget baseado no tipo e hints
    if (widget === 'textarea' || property.type === 'string' && property.maxLength > 200) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>
            {label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id={key}
            placeholder={placeholder}
            {...form.register(key)}
            disabled={loading}
          />
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {form.formState.errors[key] && (
            <p className="text-sm text-destructive">{form.formState.errors[key]?.message as string}</p>
          )}
        </div>
      );
    }

    if (property.enum) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>
            {label} {isRequired && <span className="text-destructive">*</span>}
          </Label>
          <select
            id={key}
            className="w-full px-3 py-2 border rounded-md"
            {...form.register(key)}
            disabled={loading}
          >
            <option value="">{t('forms.select_option')}</option>
            {property.enum.map((value: string) => (
              <option key={value} value={value}>
                {uiHints['ui:enumNames']?.[property.enum.indexOf(value)] || value}
              </option>
            ))}
          </select>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {form.formState.errors[key] && (
            <p className="text-sm text-destructive">{form.formState.errors[key]?.message as string}</p>
          )}
        </div>
      );
    }

    // Campo padrão (input)
    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key}>
          {label} {isRequired && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id={key}
          type={property.type === 'number' ? 'number' : 'text'}
          placeholder={placeholder}
          {...form.register(key, {
            valueAsNumber: property.type === 'number'
          })}
          disabled={loading}
        />
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {form.formState.errors[key] && (
          <p className="text-sm text-destructive">{form.formState.errors[key]?.message as string}</p>}
        </div>
      );
    };

    if (!jsonSchema || !jsonSchema.properties) {
      return (
        <Alert>
          <AlertDescription>{t('forms.no_schema')}</AlertDescription>
        </Alert>
      );
    }

    const fieldOrder = uiSchema?.['ui:order'] || Object.keys(jsonSchema.properties);

    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {fieldOrder.map((key: string) => {
          if (!jsonSchema.properties[key]) return null;
          return renderField(key, jsonSchema, uiSchema?.[key] || {});
        })}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </form>
    );
  }