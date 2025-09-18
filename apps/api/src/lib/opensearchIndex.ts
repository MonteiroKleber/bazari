// V-5 (2025-09-14): ensureOsIndex com mapping COMPLETO para attrs e priceBzr
// RESTAURADO: dynamic_templates para attrs.* como keyword
import { osClient, osEnabled } from './opensearch';

export const indexName = process.env.OS_INDEX || 'bazari-items-v3'; // v3 para novo mapping

export async function ensureOsIndex() {
  if (!osEnabled || !osClient) return;

  const exists = await (osClient as any).indices.exists({ index: indexName });
  const already =
    (exists && exists.body === true) ||
    (typeof exists === 'boolean' && exists === true);
  if (already) return;

  await (osClient as any).indices.create({
    index: indexName,
    body: {
      settings: {
        analysis: {
          analyzer: {
            pt_an: { type: 'standard', stopwords: '_portuguese_' },
            en_an: { type: 'standard', stopwords: '_english_' },
            es_an: { type: 'standard', stopwords: '_spanish_' },
            cat_path_an: { type: 'custom', tokenizer: 'path_tok' }
          },
          tokenizer: {
            path_tok: { type: 'path_hierarchy', delimiter: '/' }
          }
        }
      },
      mappings: {
        dynamic: true, // RESTAURADO: permite campos dinâmicos
        dynamic_templates: [ // RESTAURADO: templates para attrs e indexHints
          {
            attrs_as_keyword: {
              path_match: 'attrs.*',
              match_mapping_type: 'string',
              mapping: { type: 'keyword' }
            }
          },
          {
            indexhints_as_boolean: {
              path_match: 'indexHints.*',
              mapping: { type: 'boolean' }
            }
          }
        ],
        properties: {
          id: { type: 'keyword' },
          kind: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'pt_an',
            fields: {
              en: { type: 'text', analyzer: 'en_an' },
              es: { type: 'text', analyzer: 'es_an' },
              kw: { type: 'keyword', ignore_above: 256 }
            }
          },
          description: { type: 'text', analyzer: 'pt_an' },
          category_path: {
            type: 'text',
            analyzer: 'cat_path_an', // CORRIGIDO: analyzer direto
            fields: { 
              kw: { type: 'keyword' } // MANTIDO: para aggregations
            }
          },
          category_slugs: { type: 'keyword' },
          attrs: { type: 'object', enabled: true }, // MANTIDO: container para atributos
          indexHints: { type: 'object', enabled: true }, // MANTIDO: container para hints
          price: { type: 'float' }, // MANTIDO: preço original
          priceBzr: { type: 'float' }, // ADICIONADO: campo dedicado para BZR
          media: {
            type: 'object',
            properties: {
              id: { type: 'keyword' },
              url: { type: 'keyword' }
            }
          },
          createdAt: { type: 'date' }
        }
      }
    }
  });
}