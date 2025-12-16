/**
 * Contract Templates Index
 */

import { BASIC_CONTRACT_TEMPLATE } from './basic';
import { LOYALTY_CONTRACT_TEMPLATE } from './loyalty';
import { ESCROW_CONTRACT_TEMPLATE } from './escrow';
import type { ContractTemplateDefinition, ContractTemplate } from '../../../types/contract.types';

export const CONTRACT_TEMPLATES: Record<ContractTemplate, ContractTemplateDefinition> = {
  basic: BASIC_CONTRACT_TEMPLATE,
  loyalty: LOYALTY_CONTRACT_TEMPLATE,
  escrow: ESCROW_CONTRACT_TEMPLATE,
  custom: {
    id: 'custom',
    name: 'Custom Contract',
    description: 'Start from scratch with an empty contract',
    icon: 'Code',
    color: 'from-gray-500 to-slate-500',
    files: [
      {
        path: 'lib.rs',
        content: `#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod {{slug}} {
    #[ink(storage)]
    pub struct {{name}} {
        // Add your storage fields here
    }

    impl {{name}} {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {}
        }

        #[ink(message)]
        pub fn get(&self) {
            // Add your message implementation
        }
    }
}
`,
      },
      {
        path: 'Cargo.toml',
        content: `[package]
name = "{{slug}}"
version = "0.1.0"
edition = "2021"
authors = ["{{author}}"]

[dependencies]
ink = { version = "5.0", default-features = false }
scale = { package = "parity-scale-codec", version = "3.6", default-features = false, features = ["derive"] }
scale-info = { version = "2.11", default-features = false, features = ["derive"], optional = true }

[lib]
path = "lib.rs"

[features]
default = ["std"]
std = [
    "ink/std",
    "scale/std",
    "scale-info/std",
]
ink-as-dependency = []
`,
      },
    ],
    defaultConstructorArgs: {},
  },
};

export const CONTRACT_TEMPLATE_LIST = Object.values(CONTRACT_TEMPLATES).filter(
  (t) => t.id !== 'custom'
);

export { BASIC_CONTRACT_TEMPLATE, LOYALTY_CONTRACT_TEMPLATE, ESCROW_CONTRACT_TEMPLATE };

/**
 * Get contract template by ID
 */
export function getContractTemplate(id: ContractTemplate): ContractTemplateDefinition {
  return CONTRACT_TEMPLATES[id] || CONTRACT_TEMPLATES.custom;
}

/**
 * Process template placeholders
 */
export function processContractTemplate(
  template: ContractTemplateDefinition,
  config: {
    name: string;
    slug: string;
    description: string;
    author: string;
  }
): ContractTemplateDefinition {
  const processContent = (content: string): string => {
    return content
      .replace(/\{\{name\}\}/g, config.name)
      .replace(/\{\{slug\}\}/g, config.slug)
      .replace(/\{\{description\}\}/g, config.description)
      .replace(/\{\{author\}\}/g, config.author);
  };

  return {
    ...template,
    files: template.files.map((file) => ({
      ...file,
      content: processContent(file.content),
    })),
  };
}
