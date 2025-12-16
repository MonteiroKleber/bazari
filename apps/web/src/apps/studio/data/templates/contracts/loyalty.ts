/**
 * Loyalty Points Contract Template
 * Merchant loyalty program with points issuance and redemption
 */

import type { ContractTemplateDefinition } from '../../../types/contract.types';

export const LOYALTY_CONTRACT_TEMPLATE: ContractTemplateDefinition = {
  id: 'loyalty',
  name: 'Loyalty Program',
  description: 'Customer loyalty points with issuance and redemption',
  icon: 'Award',
  color: 'from-purple-500 to-pink-500',
  files: [
    {
      path: 'lib.rs',
      content: `#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod loyalty {
    use ink::storage::Mapping;
    use ink::prelude::string::String;

    /// Loyalty Program Contract
    /// Allows merchants to issue and manage customer loyalty points
    #[ink(storage)]
    pub struct LoyaltyProgram {
        /// Program owner (merchant)
        owner: AccountId,
        /// Points balance per account
        balances: Mapping<AccountId, Balance>,
        /// Total points issued
        total_supply: Balance,
        /// Program name
        name: String,
        /// Points per token spent (e.g., 10 = 10 points per 1 token)
        points_per_token: u32,
        /// Whether program is active
        is_active: bool,
    }

    /// Event emitted when points are issued
    #[ink(event)]
    pub struct PointsIssued {
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
        reason: String,
    }

    /// Event emitted when points are redeemed
    #[ink(event)]
    pub struct PointsRedeemed {
        #[ink(topic)]
        from: AccountId,
        amount: Balance,
    }

    /// Event emitted when points are transferred
    #[ink(event)]
    pub struct PointsTransferred {
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
    }

    /// Contract errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Caller is not the owner
        NotOwner,
        /// Insufficient points balance
        InsufficientBalance,
        /// Arithmetic overflow
        Overflow,
        /// Program is not active
        ProgramInactive,
        /// Invalid amount
        InvalidAmount,
    }

    impl LoyaltyProgram {
        /// Create new loyalty program
        #[ink(constructor)]
        pub fn new(name: String, points_per_token: u32) -> Self {
            Self {
                owner: Self::env().caller(),
                balances: Mapping::default(),
                total_supply: 0,
                name,
                points_per_token,
                is_active: true,
            }
        }

        /// Issue points to a customer
        #[ink(message)]
        pub fn issue_points(&mut self, to: AccountId, amount: Balance, reason: String) -> Result<(), Error> {
            self.ensure_owner()?;
            self.ensure_active()?;

            if amount == 0 {
                return Err(Error::InvalidAmount);
            }

            let balance = self.balances.get(&to).unwrap_or(0);
            let new_balance = balance.checked_add(amount).ok_or(Error::Overflow)?;

            self.balances.insert(to, &new_balance);
            self.total_supply = self.total_supply.checked_add(amount).ok_or(Error::Overflow)?;

            self.env().emit_event(PointsIssued { to, amount, reason });
            Ok(())
        }

        /// Issue points based on purchase amount
        #[ink(message)]
        pub fn issue_for_purchase(&mut self, to: AccountId, purchase_amount: Balance) -> Result<(), Error> {
            let points = purchase_amount
                .checked_mul(self.points_per_token as u128)
                .ok_or(Error::Overflow)?;

            self.issue_points(to, points, String::from("Purchase reward"))
        }

        /// Redeem points
        #[ink(message)]
        pub fn redeem_points(&mut self, amount: Balance) -> Result<(), Error> {
            self.ensure_active()?;

            let caller = self.env().caller();
            let balance = self.balances.get(&caller).unwrap_or(0);

            if balance < amount {
                return Err(Error::InsufficientBalance);
            }

            self.balances.insert(caller, &(balance - amount));
            self.total_supply -= amount;

            self.env().emit_event(PointsRedeemed { from: caller, amount });
            Ok(())
        }

        /// Transfer points to another account
        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, amount: Balance) -> Result<(), Error> {
            self.ensure_active()?;

            let caller = self.env().caller();
            let from_balance = self.balances.get(&caller).unwrap_or(0);

            if from_balance < amount {
                return Err(Error::InsufficientBalance);
            }

            let to_balance = self.balances.get(&to).unwrap_or(0);
            let new_to_balance = to_balance.checked_add(amount).ok_or(Error::Overflow)?;

            self.balances.insert(caller, &(from_balance - amount));
            self.balances.insert(to, &new_to_balance);

            self.env().emit_event(PointsTransferred { from: caller, to, amount });
            Ok(())
        }

        /// Get balance of an account
        #[ink(message)]
        pub fn balance_of(&self, account: AccountId) -> Balance {
            self.balances.get(&account).unwrap_or(0)
        }

        /// Get total supply of points
        #[ink(message)]
        pub fn total_supply(&self) -> Balance {
            self.total_supply
        }

        /// Get program name
        #[ink(message)]
        pub fn name(&self) -> String {
            self.name.clone()
        }

        /// Get points per token rate
        #[ink(message)]
        pub fn points_per_token(&self) -> u32 {
            self.points_per_token
        }

        /// Check if program is active
        #[ink(message)]
        pub fn is_active(&self) -> bool {
            self.is_active
        }

        /// Get owner
        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }

        /// Set points per token rate (owner only)
        #[ink(message)]
        pub fn set_points_per_token(&mut self, rate: u32) -> Result<(), Error> {
            self.ensure_owner()?;
            self.points_per_token = rate;
            Ok(())
        }

        /// Pause/unpause program (owner only)
        #[ink(message)]
        pub fn set_active(&mut self, active: bool) -> Result<(), Error> {
            self.ensure_owner()?;
            self.is_active = active;
            Ok(())
        }

        /// Transfer ownership (owner only)
        #[ink(message)]
        pub fn transfer_ownership(&mut self, new_owner: AccountId) -> Result<(), Error> {
            self.ensure_owner()?;
            self.owner = new_owner;
            Ok(())
        }

        // === Internal helpers ===

        fn ensure_owner(&self) -> Result<(), Error> {
            if self.env().caller() != self.owner {
                return Err(Error::NotOwner);
            }
            Ok(())
        }

        fn ensure_active(&self) -> Result<(), Error> {
            if !self.is_active {
                return Err(Error::ProgramInactive);
            }
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let program = LoyaltyProgram::new(String::from("Test Points"), 10);
            assert_eq!(program.name(), "Test Points");
            assert_eq!(program.points_per_token(), 10);
            assert!(program.is_active());
        }

        #[ink::test]
        fn issue_and_redeem_works() {
            let mut program = LoyaltyProgram::new(String::from("Test"), 10);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            // Issue points
            assert!(program.issue_points(accounts.bob, 100, String::from("Welcome bonus")).is_ok());
            assert_eq!(program.balance_of(accounts.bob), 100);
            assert_eq!(program.total_supply(), 100);
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
    name: '"My Loyalty Program"',
    points_per_token: '10',
  },
};

export default LOYALTY_CONTRACT_TEMPLATE;
