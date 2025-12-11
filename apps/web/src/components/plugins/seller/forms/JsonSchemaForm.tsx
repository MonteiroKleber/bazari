/**
 * JSON Schema Form Component
 *
 * Renderiza formulários dinamicamente a partir de JSON Schema
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

interface JsonSchemaFormProps {
  schema: JsonSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

export function JsonSchemaForm({ schema, value, onChange }: JsonSchemaFormProps) {
  if (!schema.properties) {
    return null;
  }

  const handleChange = (key: string, newValue: unknown) => {
    onChange({ ...value, [key]: newValue });
  };

  return (
    <div className="space-y-6">
      {Object.entries(schema.properties).map(([key, fieldSchema]) => (
        <FieldRenderer
          key={key}
          name={key}
          schema={fieldSchema}
          value={value[key]}
          onChange={(newValue) => handleChange(key, newValue)}
          required={schema.required?.includes(key)}
        />
      ))}
    </div>
  );
}

interface FieldRendererProps {
  name: string;
  schema: JsonSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
}

function FieldRenderer({ name, schema, value, onChange, required }: FieldRendererProps) {
  const label = schema.title || formatFieldLabel(name);
  const description = schema.description;

  // Boolean - Switch
  if (schema.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={name}>{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Switch
          id={name}
          checked={(value as boolean) ?? (schema.default as boolean) ?? false}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  // Enum - Select
  if (schema.enum) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          {required && ' *'}
        </Label>
        <Select
          value={(value as string) ?? (schema.default as string)}
          onValueChange={onChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {formatEnumLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Number with min/max - Slider
  if (
    schema.type === 'number' &&
    schema.minimum !== undefined &&
    schema.maximum !== undefined
  ) {
    const currentValue =
      (value as number) ?? (schema.default as number) ?? schema.minimum;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={name}>
            {label}
            {required && ' *'}
          </Label>
          <span className="text-sm font-medium">{currentValue}</span>
        </div>
        <Slider
          id={name}
          min={schema.minimum}
          max={schema.maximum}
          step={1}
          value={[currentValue]}
          onValueChange={([v]) => onChange(v)}
        />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Number - Input
  if (schema.type === 'number') {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          {required && ' *'}
        </Label>
        <Input
          id={name}
          type="number"
          value={(value as number) ?? (schema.default as number) ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : undefined)
          }
          min={schema.minimum}
          max={schema.maximum}
        />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Array - Lista editável
  if (schema.type === 'array' && schema.items) {
    return (
      <ArrayFieldRenderer
        name={name}
        schema={schema}
        value={(value as unknown[]) ?? (schema.default as unknown[]) ?? []}
        onChange={onChange}
      />
    );
  }

  // Object - Nested form
  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <Label>{label}</Label>
        <JsonSchemaForm
          schema={schema}
          value={(value as Record<string, unknown>) ?? {}}
          onChange={(v) => onChange(v)}
        />
      </div>
    );
  }

  // String - Input
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && ' *'}
      </Label>
      <Input
        id={name}
        value={(value as string) ?? (schema.default as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.description}
      />
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function ArrayFieldRenderer({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: JsonSchema;
  value: unknown[];
  onChange: (value: unknown[]) => void;
}) {
  const itemSchema = schema.items!;

  const addItem = () => {
    const newItem = getDefaultValue(itemSchema);
    onChange([...value, newItem]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: unknown) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label>{schema.title || formatFieldLabel(name)}</Label>

      {value.map((item, index) => (
        <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
          <div className="flex-1">
            {itemSchema.type === 'object' && itemSchema.properties ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(itemSchema.properties).map(([key, fieldSchema]) => (
                  <FieldRenderer
                    key={key}
                    name={key}
                    schema={fieldSchema}
                    value={(item as Record<string, unknown>)[key]}
                    onChange={(v) =>
                      updateItem(index, { ...(item as Record<string, unknown>), [key]: v })
                    }
                  />
                ))}
              </div>
            ) : (
              <FieldRenderer
                name={`${name}[${index}]`}
                schema={itemSchema}
                value={item}
                onChange={(v) => updateItem(index, v)}
              />
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button variant="outline" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar
      </Button>
    </div>
  );
}

function getDefaultValue(schema: JsonSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  if (schema.type === 'object') {
    const obj: Record<string, unknown> = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = getDefaultValue(prop);
      }
    }
    return obj;
  }
  if (schema.type === 'array') return [];
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number') return 0;
  return '';
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default JsonSchemaForm;
