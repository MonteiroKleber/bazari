/**
 * Template exports
 */

export { REACT_TS_TEMPLATE } from './react-ts';
export { ecommerceTemplate } from './ecommerce';
export { socialTemplate } from './social';
export { defiTemplate } from './defi';
export { loyaltyTemplate } from './loyalty';
export {
  basicContractTemplate,
  loyaltyContractTemplate,
  escrowContractTemplate,
  contractTemplates,
} from './contract-templates';

import { REACT_TS_TEMPLATE } from './react-ts';
import { ecommerceTemplate } from './ecommerce';
import { socialTemplate } from './social';
import { defiTemplate } from './defi';
import { loyaltyTemplate } from './loyalty';
import { contractTemplates } from './contract-templates';
import type { Template } from '../../types/studio.types';

export const allTemplates: Template[] = [
  REACT_TS_TEMPLATE,
  ecommerceTemplate,
  socialTemplate,
  defiTemplate,
  loyaltyTemplate,
  ...contractTemplates,
];

export const getTemplateById = (id: string): Template | undefined => {
  return allTemplates.find((t) => t.id === id);
};

export const getTemplatesByCategory = (category: string): Template[] => {
  return allTemplates.filter((t) => t.category === category);
};

/**
 * Check if a template is a contract template
 */
export const isContractTemplate = (template: Template): boolean => {
  return template.category === 'contract';
};
