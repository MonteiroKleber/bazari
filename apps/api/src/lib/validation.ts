// V-2 (2025-09-18): Normaliza erros do Ajv e amplia suporte a enums/string
import Ajv from 'ajv';
import { z } from 'zod';

const ajv = new Ajv({ allErrors: true, coerceTypes: true });

// Validação com AJV (para JSON Schema)
export function validateWithAjv(schema: any, data: any): { valid: boolean; errors?: any[] } {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (!valid) {
    return { valid: false, errors: validate.errors ?? [] };
  }
  
  return { valid: true };
}

// Conversão de JSON Schema para Zod (simplificada)
export function jsonSchemaToZod(jsonSchema: any): z.ZodSchema {
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    const shape: Record<string, z.ZodSchema> = {};
    
    for (const [key, prop] of Object.entries(jsonSchema.properties as any)) {
      shape[key] = convertPropertyToZod(prop);
    }
    
    let zodObject = z.object(shape);
    
    // Aplicar required fields
    if (jsonSchema.required && Array.isArray(jsonSchema.required)) {
      const partialKeys = Object.keys(shape).filter(
        key => !jsonSchema.required.includes(key)
      );
      
      if (partialKeys.length > 0) {
        zodObject = zodObject.partial(
          partialKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
        ) as any;
      }
    }
    
    return zodObject;
  }
  
  return z.any();
}

function convertPropertyToZod(prop: any): z.ZodSchema {
  switch (prop.type) {
    case 'string':
      let stringSchema: z.ZodString | z.ZodEnum<[string, ...string[]]>;
      if (Array.isArray(prop.enum) && prop.enum.length > 0) {
        stringSchema = z.enum(prop.enum as [string, ...string[]]);
      } else {
        stringSchema = z.string();
      }
      if (prop.pattern && stringSchema instanceof z.ZodString) {
        stringSchema = stringSchema.regex(new RegExp(prop.pattern));
      }
      return stringSchema;
      
    case 'number':
      let numberSchema = z.number();
      if (prop.minimum !== undefined) {
        numberSchema = numberSchema.min(prop.minimum);
      }
      if (prop.maximum !== undefined) {
        numberSchema = numberSchema.max(prop.maximum);
      }
      return numberSchema;
      
    case 'integer':
      let intSchema = z.number().int();
      if (prop.minimum !== undefined) {
        intSchema = intSchema.min(prop.minimum);
      }
      if (prop.maximum !== undefined) {
        intSchema = intSchema.max(prop.maximum);
      }
      return intSchema;
      
    case 'boolean':
      return z.boolean();
      
    case 'array':
      if (prop.items) {
        return z.array(convertPropertyToZod(prop.items));
      }
      return z.array(z.any());
      
    default:
      return z.any();
  }
}

// Extrair campos indexáveis dos atributos
export function extractIndexFields(
  attributes: any,
  indexHints: string[]
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const hint of indexHints) {
    if (hint in attributes) {
      result[hint] = attributes[hint];
    }
  }
  
  return result;
}

// Validação de atributos usando schema efetivo
export function validateAttributes(
  effectiveSchema: any,
  attributes: any
): { valid: boolean; errors?: string[] } {
  // Usar AJV como padrão
  const result = validateWithAjv(effectiveSchema, attributes);
  
  if (!result.valid && result.errors) {
    const errors = result.errors.map(err => 
      `${err.instancePath || 'root'}: ${err.message}`
    );
    return { valid: false, errors };
  }
  
  return { valid: true };
}
