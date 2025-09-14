// V-4 (2025-09-14): ensureOsIndex com mapping para media
import { osClient, osEnabled } from './opensearch';

export const indexName = process.env.OS_INDEX || 'bazari-items-v1';

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
        dynamic: true,
        dynamic_templates: [
          // Qualquer string em attrs.* vira keyword para combinar com terms/aggs
          {
            attrs_as_keyword: {
              path_match: 'attrs.*',
              match_mapping_type: 'string',
              mapping: { type: 'keyword' }
            }
          },
          // indexHints.* como boolean
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
            fields: {
              path: { type: 'text', analyzer: 'cat_path_an' },
              kw: { type: 'keyword' }
            }
          },
          category_slugs: { type: 'keyword' },
          attrs: { type: 'object', enabled: true },
          indexHints: { type: 'object', enabled: true },
          price: { type: 'float' },
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