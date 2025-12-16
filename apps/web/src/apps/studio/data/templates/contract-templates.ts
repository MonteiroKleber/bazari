/**
 * Contract Templates adapted for Studio's Template system
 * These are ink! smart contract templates that work with the NewProjectWizard
 */

import type { Template } from '../../types/studio.types';
import {
  BASIC_CONTRACT_TEMPLATE,
  LOYALTY_CONTRACT_TEMPLATE,
  ESCROW_CONTRACT_TEMPLATE,
} from './contracts';

/**
 * Convert contract template files to Studio TemplateFile format
 */
function toTemplateFiles(files: Array<{ path: string; content: string }>) {
  return files.map((f) => ({
    path: f.path,
    content: f.content,
    isTemplate: f.content.includes('{{'),
  }));
}

/**
 * Basic Smart Contract Template
 */
export const basicContractTemplate: Template = {
  id: 'contract-basic',
  name: 'Basic Contract',
  description: 'Simple ink! smart contract with storage, owner, and events',
  category: 'contract',
  icon: 'FileCode',
  color: '#F97316', // Orange for Rust
  tags: ['contract', 'ink!', 'rust', 'basic', 'substrate'],
  files: toTemplateFiles(BASIC_CONTRACT_TEMPLATE.files),
  defaultPermissions: [],
  sdkFeatures: ['ink!', 'storage', 'events'],
};

/**
 * Loyalty Program Contract Template
 */
export const loyaltyContractTemplate: Template = {
  id: 'contract-loyalty',
  name: 'Loyalty Program',
  description: 'Customer loyalty points system with issuance and redemption',
  category: 'contract',
  icon: 'Award',
  color: '#A855F7', // Purple
  tags: ['contract', 'ink!', 'rust', 'loyalty', 'points', 'rewards'],
  files: toTemplateFiles(LOYALTY_CONTRACT_TEMPLATE.files),
  defaultPermissions: [],
  sdkFeatures: ['ink!', 'mapping', 'balance', 'events'],
};

/**
 * Escrow Contract Template
 */
export const escrowContractTemplate: Template = {
  id: 'contract-escrow',
  name: 'Escrow',
  description: 'Secure payment escrow with dispute resolution and arbiter',
  category: 'contract',
  icon: 'Shield',
  color: '#22C55E', // Green
  tags: ['contract', 'ink!', 'rust', 'escrow', 'payment', 'security'],
  files: toTemplateFiles(ESCROW_CONTRACT_TEMPLATE.files),
  defaultPermissions: [],
  sdkFeatures: ['ink!', 'payable', 'transfer', 'events'],
};

/**
 * All contract templates
 */
export const contractTemplates: Template[] = [
  basicContractTemplate,
  loyaltyContractTemplate,
  escrowContractTemplate,
];

export default contractTemplates;
