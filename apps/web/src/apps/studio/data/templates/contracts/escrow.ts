/**
 * Escrow Contract Template
 * Secure payment escrow with buyer, seller, and arbiter
 */

import type { ContractTemplateDefinition } from '../../../types/contract.types';

export const ESCROW_CONTRACT_TEMPLATE: ContractTemplateDefinition = {
  id: 'escrow',
  name: 'Escrow',
  description: 'Secure payment escrow with dispute resolution',
  icon: 'Shield',
  color: 'from-green-500 to-emerald-500',
  files: [
    {
      path: 'lib.rs',
      content: `#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod escrow {
    /// Escrow Contract
    /// Secure payment holding with buyer confirmation and arbiter dispute resolution
    #[ink(storage)]
    pub struct Escrow {
        /// Buyer (who pays)
        buyer: AccountId,
        /// Seller (who receives on release)
        seller: AccountId,
        /// Arbiter (for disputes)
        arbiter: AccountId,
        /// Amount held in escrow
        amount: Balance,
        /// Current status
        status: EscrowStatus,
        /// Description of the transaction
        description: Option<[u8; 32]>,
    }

    /// Escrow status
    #[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum EscrowStatus {
        /// Created but not funded
        Created,
        /// Funded by buyer
        Funded,
        /// Released to seller
        Released,
        /// Refunded to buyer
        Refunded,
        /// Under dispute
        Disputed,
    }

    /// Event emitted when escrow is funded
    #[ink(event)]
    pub struct EscrowFunded {
        #[ink(topic)]
        buyer: AccountId,
        amount: Balance,
    }

    /// Event emitted when funds are released
    #[ink(event)]
    pub struct EscrowReleased {
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
        released_by: AccountId,
    }

    /// Event emitted when dispute is opened
    #[ink(event)]
    pub struct DisputeOpened {
        #[ink(topic)]
        opened_by: AccountId,
    }

    /// Event emitted when dispute is resolved
    #[ink(event)]
    pub struct DisputeResolved {
        #[ink(topic)]
        resolved_by: AccountId,
        #[ink(topic)]
        winner: AccountId,
        amount: Balance,
    }

    /// Contract errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Caller is not the buyer
        NotBuyer,
        /// Caller is not the seller
        NotSeller,
        /// Caller is not the arbiter
        NotArbiter,
        /// Caller is not buyer or arbiter
        NotBuyerOrArbiter,
        /// Caller is not seller or arbiter
        NotSellerOrArbiter,
        /// Invalid escrow status for this operation
        InvalidStatus,
        /// Transfer of funds failed
        TransferFailed,
        /// No funds sent with call
        NoFundsSent,
        /// Escrow already funded
        AlreadyFunded,
    }

    impl Escrow {
        /// Create new escrow
        /// Caller becomes the buyer
        #[ink(constructor)]
        pub fn new(seller: AccountId, arbiter: AccountId) -> Self {
            Self {
                buyer: Self::env().caller(),
                seller,
                arbiter,
                amount: 0,
                status: EscrowStatus::Created,
                description: None,
            }
        }

        /// Create escrow with description
        #[ink(constructor)]
        pub fn new_with_description(
            seller: AccountId,
            arbiter: AccountId,
            description: [u8; 32],
        ) -> Self {
            Self {
                buyer: Self::env().caller(),
                seller,
                arbiter,
                amount: 0,
                status: EscrowStatus::Created,
                description: Some(description),
            }
        }

        /// Fund the escrow (buyer only)
        #[ink(message, payable)]
        pub fn fund(&mut self) -> Result<(), Error> {
            if self.env().caller() != self.buyer {
                return Err(Error::NotBuyer);
            }
            if self.status != EscrowStatus::Created {
                return Err(Error::AlreadyFunded);
            }

            let value = self.env().transferred_value();
            if value == 0 {
                return Err(Error::NoFundsSent);
            }

            self.amount = value;
            self.status = EscrowStatus::Funded;

            self.env().emit_event(EscrowFunded {
                buyer: self.buyer,
                amount: value,
            });

            Ok(())
        }

        /// Release funds to seller (buyer or arbiter)
        #[ink(message)]
        pub fn release(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.buyer && caller != self.arbiter {
                return Err(Error::NotBuyerOrArbiter);
            }
            if self.status != EscrowStatus::Funded && self.status != EscrowStatus::Disputed {
                return Err(Error::InvalidStatus);
            }

            let amount = self.amount;
            self.amount = 0;
            self.status = EscrowStatus::Released;

            self.env()
                .transfer(self.seller, amount)
                .map_err(|_| Error::TransferFailed)?;

            self.env().emit_event(EscrowReleased {
                to: self.seller,
                amount,
                released_by: caller,
            });

            Ok(())
        }

        /// Refund to buyer (seller or arbiter)
        #[ink(message)]
        pub fn refund(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.seller && caller != self.arbiter {
                return Err(Error::NotSellerOrArbiter);
            }
            if self.status != EscrowStatus::Funded && self.status != EscrowStatus::Disputed {
                return Err(Error::InvalidStatus);
            }

            let amount = self.amount;
            self.amount = 0;
            self.status = EscrowStatus::Refunded;

            self.env()
                .transfer(self.buyer, amount)
                .map_err(|_| Error::TransferFailed)?;

            self.env().emit_event(EscrowReleased {
                to: self.buyer,
                amount,
                released_by: caller,
            });

            Ok(())
        }

        /// Open dispute (buyer or seller)
        #[ink(message)]
        pub fn open_dispute(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.buyer && caller != self.seller {
                return Err(Error::NotBuyer);
            }
            if self.status != EscrowStatus::Funded {
                return Err(Error::InvalidStatus);
            }

            self.status = EscrowStatus::Disputed;

            self.env().emit_event(DisputeOpened { opened_by: caller });

            Ok(())
        }

        /// Resolve dispute (arbiter only)
        /// If release_to_seller is true, funds go to seller; otherwise refund to buyer
        #[ink(message)]
        pub fn resolve_dispute(&mut self, release_to_seller: bool) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.arbiter {
                return Err(Error::NotArbiter);
            }
            if self.status != EscrowStatus::Disputed {
                return Err(Error::InvalidStatus);
            }

            let amount = self.amount;
            let winner = if release_to_seller {
                self.seller
            } else {
                self.buyer
            };

            self.amount = 0;
            self.status = if release_to_seller {
                EscrowStatus::Released
            } else {
                EscrowStatus::Refunded
            };

            self.env()
                .transfer(winner, amount)
                .map_err(|_| Error::TransferFailed)?;

            self.env().emit_event(DisputeResolved {
                resolved_by: caller,
                winner,
                amount,
            });

            Ok(())
        }

        // === View functions ===

        /// Get escrow status
        #[ink(message)]
        pub fn status(&self) -> EscrowStatus {
            self.status
        }

        /// Get amount held
        #[ink(message)]
        pub fn amount(&self) -> Balance {
            self.amount
        }

        /// Get buyer address
        #[ink(message)]
        pub fn buyer(&self) -> AccountId {
            self.buyer
        }

        /// Get seller address
        #[ink(message)]
        pub fn seller(&self) -> AccountId {
            self.seller
        }

        /// Get arbiter address
        #[ink(message)]
        pub fn arbiter(&self) -> AccountId {
            self.arbiter
        }

        /// Get all escrow info
        #[ink(message)]
        pub fn get_info(&self) -> (AccountId, AccountId, AccountId, Balance, EscrowStatus) {
            (self.buyer, self.seller, self.arbiter, self.amount, self.status)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let escrow = Escrow::new(accounts.bob, accounts.charlie);

            assert_eq!(escrow.buyer(), accounts.alice);
            assert_eq!(escrow.seller(), accounts.bob);
            assert_eq!(escrow.arbiter(), accounts.charlie);
            assert_eq!(escrow.status(), EscrowStatus::Created);
            assert_eq!(escrow.amount(), 0);
        }

        #[ink::test]
        fn fund_works() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut escrow = Escrow::new(accounts.bob, accounts.charlie);

            // Set up transferred value
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1000);

            assert!(escrow.fund().is_ok());
            assert_eq!(escrow.status(), EscrowStatus::Funded);
            assert_eq!(escrow.amount(), 1000);
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
    seller: '',
    arbiter: '',
  },
};

export default ESCROW_CONTRACT_TEMPLATE;
