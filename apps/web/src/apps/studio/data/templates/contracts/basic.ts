/**
 * Basic Contract Template
 * Simple storage contract with owner and events
 */

import type { ContractTemplateDefinition } from '../../../types/contract.types';

export const BASIC_CONTRACT_TEMPLATE: ContractTemplateDefinition = {
  id: 'basic',
  name: 'Basic Contract',
  description: 'Simple contract with storage, owner, and events',
  icon: 'FileCode',
  color: 'from-blue-500 to-cyan-500',
  files: [
    {
      path: 'lib.rs',
      content: `#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod {{slug}} {
    use ink::storage::Mapping;

    /// {{description}}
    #[ink(storage)]
    pub struct {{name}} {
        /// Owner of the contract
        owner: AccountId,
        /// Contract value
        value: u32,
    }

    /// Event emitted when value changes
    #[ink(event)]
    pub struct ValueChanged {
        #[ink(topic)]
        from: AccountId,
        old_value: u32,
        new_value: u32,
    }

    /// Contract errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Caller is not the owner
        NotOwner,
        /// Invalid value provided
        InvalidValue,
    }

    impl {{name}} {
        /// Constructor - creates new contract with initial value
        #[ink(constructor)]
        pub fn new(init_value: u32) -> Self {
            Self {
                owner: Self::env().caller(),
                value: init_value,
            }
        }

        /// Constructor with default value
        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new(0)
        }

        /// Get current value
        #[ink(message)]
        pub fn get(&self) -> u32 {
            self.value
        }

        /// Set new value (only owner can call)
        #[ink(message)]
        pub fn set(&mut self, new_value: u32) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::NotOwner);
            }

            let old_value = self.value;
            self.value = new_value;

            self.env().emit_event(ValueChanged {
                from: caller,
                old_value,
                new_value,
            });

            Ok(())
        }

        /// Get contract owner
        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        /// Transfer ownership to new account
        #[ink(message)]
        pub fn transfer_ownership(&mut self, new_owner: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::NotOwner);
            }
            self.owner = new_owner;
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let contract = {{name}}::new(42);
            assert_eq!(contract.get(), 42);
        }

        #[ink::test]
        fn default_works() {
            let contract = {{name}}::default();
            assert_eq!(contract.get(), 0);
        }

        #[ink::test]
        fn set_works() {
            let mut contract = {{name}}::new(0);
            assert!(contract.set(100).is_ok());
            assert_eq!(contract.get(), 100);
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

[dev-dependencies]
ink_e2e = { version = "5.0" }

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
e2e-tests = []
`,
    },
    {
      path: '.gitignore',
      content: `# Build artifacts
/target/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`,
    },
  ],
  defaultConstructorArgs: {
    init_value: '0',
  },
};

export default BASIC_CONTRACT_TEMPLATE;
