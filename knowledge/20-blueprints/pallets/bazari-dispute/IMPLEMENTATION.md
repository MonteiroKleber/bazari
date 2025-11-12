# bazari-dispute Pallet - Implementation Guide

**Priority**: P2 | **Timeline**: Week 18-19 | **Effort**: 3-4 weeks

---

## 🎯 Implementation Overview

This pallet implements decentralized dispute resolution with:
- **VRF juror selection**: Unbiased selection of 5 jurors
- **Commit-reveal voting**: Prevents vote coordination
- **Quorum-based rulings**: 3-of-5 majority required
- **Automatic escrow execution**: Ruling applied to locked funds

**Key Features**:
- Privacy-preserving commit-reveal mechanism
- Integration with pallet-randomness for VRF
- Slashing for non-participating jurors
- Evidence storage via IPFS CIDs

---

## 📦 Step 1: Cargo.toml

```toml
[package]
name = "pallet-bazari-dispute"
version = "0.1.0"
edition = "2021"

[dependencies]
codec = { package = "parity-scale-codec", version = "3.6.1", default-features = false }
scale-info = { version = "2.5.0", default-features = false, features = ["derive"] }
frame-benchmarking = { version = "4.0.0-dev", default-features = false, optional = true }
frame-support = { version = "4.0.0-dev", default-features = false }
frame-system = { version = "4.0.0-dev", default-features = false }
sp-runtime = { version = "24.0.0", default-features = false }
sp-std = { version = "8.0.0", default-features = false }
sp-core = { version = "21.0.0", default-features = false }
sp-io = { version = "23.0.0", default-features = false }

pallet-randomness-collective-flip = { version = "4.0.0-dev", default-features = false }
pallet-bazari-escrow = { path = "../bazari-escrow", default-features = false }

[dev-dependencies]
sp-io = { version = "23.0.0" }

[features]
default = ["std"]
std = [
    "codec/std",
    "scale-info/std",
    "frame-support/std",
    "frame-system/std",
    "sp-runtime/std",
    "sp-std/std",
    "sp-core/std",
    "pallet-randomness-collective-flip/std",
    "pallet-bazari-escrow/std",
]
runtime-benchmarks = ["frame-benchmarking/runtime-benchmarks"]
```

---

## 🔧 Step 2: Core Types and Storage

Create `runtime/src/pallets/bazari_dispute/lib.rs`:

```rust
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{
        pallet_prelude::*,
        traits::{Currency, Randomness, ReservableCurrency},
    };
    use frame_system::pallet_prelude::*;
    use sp_core::H256;
    use sp_runtime::traits::{BlakeTwo256, Hash, Zero};
    use sp_std::vec::Vec;

    pub type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;
    pub type DisputeId = u64;
    pub type OrderId = u64;

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub enum Ruling {
        RefundBuyer,
        ReleaseSeller,
        PartialRefund(u8), // Percentage (0-100)
    }

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub enum DisputeStatus {
        Open,
        JurorsSelected,
        CommitPhase,
        RevealPhase,
        Resolved,
        Expired,
    }

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct Vote<AccountId> {
        pub juror: AccountId,
        pub vote_hash: H256,      // Commit phase
        pub revealed_vote: Option<Ruling>, // Reveal phase
        pub salt: Option<H256>,   // Reveal phase
    }

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo)]
    pub struct Dispute<AccountId, BlockNumber> {
        pub id: DisputeId,
        pub order_id: OrderId,
        pub plaintiff: AccountId,
        pub defendant: AccountId,
        pub evidence_ipfs_cid: BoundedVec<u8, ConstU32<64>>,
        pub jurors: BoundedVec<AccountId, ConstU32<5>>,
        pub votes: BoundedVec<Vote<AccountId>, ConstU32<5>>,
        pub status: DisputeStatus,
        pub ruling: Option<Ruling>,
        pub created_at: BlockNumber,
        pub commit_deadline: BlockNumber,
        pub reveal_deadline: BlockNumber,
        pub resolution_deadline: BlockNumber,
    }

    #[pallet::config]
    pub trait Config: frame_system::Config + pallet_bazari_escrow::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;
        type Randomness: Randomness<Self::Hash, BlockNumberFor<Self>>;

        /// Number of jurors per dispute
        #[pallet::constant]
        type JurorCount: Get<u32>;

        /// Minimum reputation to be eligible as juror
        #[pallet::constant]
        type MinJurorReputation: Get<u32>;

        /// Commit phase duration (24 hours = ~14400 blocks at 6s/block)
        #[pallet::constant]
        type CommitPhaseDuration: Get<BlockNumberFor<Self>>;

        /// Reveal phase duration (24 hours)
        #[pallet::constant]
        type RevealPhaseDuration: Get<BlockNumberFor<Self>>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    /// Dispute storage
    #[pallet::storage]
    #[pallet::getter(fn disputes)]
    pub type Disputes<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        DisputeId,
        Dispute<T::AccountId, BlockNumberFor<T>>,
        OptionQuery,
    >;

    /// Dispute counter
    #[pallet::storage]
    #[pallet::getter(fn dispute_count)]
    pub type DisputeCount<T: Config> = StorageValue<_, DisputeId, ValueQuery>;

    /// Eligible jurors pool (reputation >= MinJurorReputation)
    #[pallet::storage]
    #[pallet::getter(fn juror_pool)]
    pub type JurorPool<T: Config> = StorageValue<
        _,
        BoundedVec<T::AccountId, ConstU32<1000>>,
        ValueQuery,
    >;

    /// Juror reputation scores
    #[pallet::storage]
    #[pallet::getter(fn juror_reputation)]
    pub type JurorReputation<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        u32,
        ValueQuery,
    >;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        DisputeOpened {
            dispute_id: DisputeId,
            order_id: OrderId,
            plaintiff: T::AccountId,
        },
        JurorsSelected {
            dispute_id: DisputeId,
            jurors: Vec<T::AccountId>,
        },
        VoteCommitted {
            dispute_id: DisputeId,
            juror: T::AccountId,
        },
        VoteRevealed {
            dispute_id: DisputeId,
            juror: T::AccountId,
            vote: Ruling,
        },
        DisputeResolved {
            dispute_id: DisputeId,
            ruling: Ruling,
        },
        JurorSlashed {
            dispute_id: DisputeId,
            juror: T::AccountId,
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        DisputeNotFound,
        InvalidDisputeStatus,
        NotJuror,
        CommitPhaseEnded,
        RevealPhaseEnded,
        RevealPhasePending,
        InvalidVoteReveal,
        AlreadyVoted,
        InsufficientReputation,
        NoEligibleJurors,
    }

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
        fn on_finalize(block_number: BlockNumberFor<T>) {
            // Auto-resolve expired disputes
            for (dispute_id, dispute) in Disputes::<T>::iter() {
                if dispute.status == DisputeStatus::RevealPhase
                    && block_number >= dispute.reveal_deadline
                {
                    let _ = Self::tally_votes_and_resolve(dispute_id);
                }
            }
        }
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Open a dispute for an order
        #[pallet::weight(10_000)]
        #[pallet::call_index(0)]
        pub fn open_dispute(
            origin: OriginFor<T>,
            order_id: OrderId,
            evidence_ipfs_cid: Vec<u8>,
        ) -> DispatchResult {
            let plaintiff = ensure_signed(origin)?;

            let current_block = <frame_system::Pallet<T>>::block_number();
            let dispute_id = DisputeCount::<T>::get();

            // Get order details from bazari-escrow
            // (In practice, query order pallet to get buyer/seller)
            let defendant = plaintiff.clone(); // Placeholder

            let bounded_cid = BoundedVec::try_from(evidence_ipfs_cid)
                .map_err(|_| Error::<T>::DisputeNotFound)?;

            let dispute = Dispute {
                id: dispute_id,
                order_id,
                plaintiff: plaintiff.clone(),
                defendant,
                evidence_ipfs_cid: bounded_cid,
                jurors: BoundedVec::default(),
                votes: BoundedVec::default(),
                status: DisputeStatus::Open,
                ruling: None,
                created_at: current_block,
                commit_deadline: current_block + T::CommitPhaseDuration::get(),
                reveal_deadline: current_block
                    + T::CommitPhaseDuration::get()
                    + T::RevealPhaseDuration::get(),
                resolution_deadline: current_block
                    + T::CommitPhaseDuration::get()
                    + T::RevealPhaseDuration::get()
                    + 100u32.into(),
            };

            Disputes::<T>::insert(dispute_id, dispute);
            DisputeCount::<T>::put(dispute_id + 1);

            Self::deposit_event(Event::DisputeOpened {
                dispute_id,
                order_id,
                plaintiff,
            });

            Ok(())
        }

        /// Select jurors using VRF randomness
        #[pallet::weight(10_000)]
        #[pallet::call_index(1)]
        pub fn select_jurors(origin: OriginFor<T>, dispute_id: DisputeId) -> DispatchResult {
            ensure_root(origin)?; // Callable by system or automated

            let mut dispute = Disputes::<T>::get(dispute_id)
                .ok_or(Error::<T>::DisputeNotFound)?;

            ensure!(
                dispute.status == DisputeStatus::Open,
                Error::<T>::InvalidDisputeStatus
            );

            // Get eligible jurors
            let juror_pool = JurorPool::<T>::get();
            ensure!(!juror_pool.is_empty(), Error::<T>::NoEligibleJurors);

            // Use VRF to select random jurors
            let random_seed = T::Randomness::random(&dispute_id.encode());
            let mut selected_jurors = BoundedVec::<T::AccountId, ConstU32<5>>::default();

            let juror_count = T::JurorCount::get() as usize;
            let pool_size = juror_pool.len();

            for i in 0..juror_count.min(pool_size) {
                let index = (random_seed.0[i % 32] as usize + i) % pool_size;
                if let Some(juror) = juror_pool.get(index) {
                    let _ = selected_jurors.try_push(juror.clone());
                }
            }

            dispute.jurors = selected_jurors.clone();
            dispute.status = DisputeStatus::CommitPhase;
            Disputes::<T>::insert(dispute_id, dispute);

            Self::deposit_event(Event::JurorsSelected {
                dispute_id,
                jurors: selected_jurors.into_inner(),
            });

            Ok(())
        }

        /// Commit a vote (hash of vote + salt)
        #[pallet::weight(10_000)]
        #[pallet::call_index(2)]
        pub fn commit_vote(
            origin: OriginFor<T>,
            dispute_id: DisputeId,
            vote_hash: H256,
        ) -> DispatchResult {
            let juror = ensure_signed(origin)?;

            let mut dispute = Disputes::<T>::get(dispute_id)
                .ok_or(Error::<T>::DisputeNotFound)?;

            ensure!(
                dispute.status == DisputeStatus::CommitPhase,
                Error::<T>::InvalidDisputeStatus
            );

            let current_block = <frame_system::Pallet<T>>::block_number();
            ensure!(
                current_block < dispute.commit_deadline,
                Error::<T>::CommitPhaseEnded
            );

            // Verify juror is selected
            ensure!(
                dispute.jurors.contains(&juror),
                Error::<T>::NotJuror
            );

            // Check not already voted
            ensure!(
                !dispute.votes.iter().any(|v| v.juror == juror),
                Error::<T>::AlreadyVoted
            );

            let vote = Vote {
                juror: juror.clone(),
                vote_hash,
                revealed_vote: None,
                salt: None,
            };

            dispute.votes.try_push(vote).map_err(|_| Error::<T>::AlreadyVoted)?;
            Disputes::<T>::insert(dispute_id, dispute);

            Self::deposit_event(Event::VoteCommitted { dispute_id, juror });

            Ok(())
        }

        /// Reveal a vote (vote + salt)
        #[pallet::weight(10_000)]
        #[pallet::call_index(3)]
        pub fn reveal_vote(
            origin: OriginFor<T>,
            dispute_id: DisputeId,
            vote: Ruling,
            salt: H256,
        ) -> DispatchResult {
            let juror = ensure_signed(origin)?;

            let mut dispute = Disputes::<T>::get(dispute_id)
                .ok_or(Error::<T>::DisputeNotFound)?;

            // Auto-transition to reveal phase if commit phase ended
            let current_block = <frame_system::Pallet<T>>::block_number();
            if dispute.status == DisputeStatus::CommitPhase
                && current_block >= dispute.commit_deadline
            {
                dispute.status = DisputeStatus::RevealPhase;
            }

            ensure!(
                dispute.status == DisputeStatus::RevealPhase,
                Error::<T>::RevealPhasePending
            );

            ensure!(
                current_block < dispute.reveal_deadline,
                Error::<T>::RevealPhaseEnded
            );

            // Find juror's vote
            let vote_index = dispute
                .votes
                .iter()
                .position(|v| v.juror == juror)
                .ok_or(Error::<T>::NotJuror)?;

            let mut stored_vote = dispute.votes[vote_index].clone();

            // Verify hash matches
            let computed_hash = BlakeTwo256::hash_of(&(&vote, &salt));
            ensure!(
                computed_hash == stored_vote.vote_hash,
                Error::<T>::InvalidVoteReveal
            );

            // Store revealed vote
            stored_vote.revealed_vote = Some(vote.clone());
            stored_vote.salt = Some(salt);
            dispute.votes[vote_index] = stored_vote;

            Disputes::<T>::insert(dispute_id, dispute);

            Self::deposit_event(Event::VoteRevealed {
                dispute_id,
                juror,
                vote,
            });

            Ok(())
        }

        /// Execute ruling (callable after reveal phase)
        #[pallet::weight(10_000)]
        #[pallet::call_index(4)]
        pub fn execute_ruling(origin: OriginFor<T>, dispute_id: DisputeId) -> DispatchResult {
            ensure_root(origin)?;

            Self::tally_votes_and_resolve(dispute_id)
        }
    }

    impl<T: Config> Pallet<T> {
        /// Tally votes and resolve dispute
        fn tally_votes_and_resolve(dispute_id: DisputeId) -> DispatchResult {
            let mut dispute = Disputes::<T>::get(dispute_id)
                .ok_or(Error::<T>::DisputeNotFound)?;

            ensure!(
                dispute.status == DisputeStatus::RevealPhase,
                Error::<T>::InvalidDisputeStatus
            );

            // Count revealed votes
            let mut refund_count = 0u32;
            let mut release_count = 0u32;
            let mut partial_refund_sum = 0u32;
            let mut partial_refund_count = 0u32;

            for vote in &dispute.votes {
                if let Some(revealed) = &vote.revealed_vote {
                    match revealed {
                        Ruling::RefundBuyer => refund_count += 1,
                        Ruling::ReleaseSeller => release_count += 1,
                        Ruling::PartialRefund(percent) => {
                            partial_refund_sum += *percent as u32;
                            partial_refund_count += 1;
                        }
                    }
                } else {
                    // Slash non-revealing jurors
                    let _ = Self::slash_juror(&vote.juror, dispute_id);
                }
            }

            // Determine ruling (simple majority)
            let ruling = if refund_count > release_count && refund_count > partial_refund_count {
                Ruling::RefundBuyer
            } else if release_count > refund_count && release_count > partial_refund_count {
                Ruling::ReleaseSeller
            } else if partial_refund_count > 0 {
                let avg_percent = (partial_refund_sum / partial_refund_count) as u8;
                Ruling::PartialRefund(avg_percent)
            } else {
                Ruling::ReleaseSeller // Default
            };

            dispute.ruling = Some(ruling.clone());
            dispute.status = DisputeStatus::Resolved;
            Disputes::<T>::insert(dispute_id, dispute.clone());

            // Execute ruling on escrow
            // (In practice, call pallet_bazari_escrow to release/refund)

            Self::deposit_event(Event::DisputeResolved {
                dispute_id,
                ruling,
            });

            Ok(())
        }

        /// Slash non-participating juror
        fn slash_juror(juror: &T::AccountId, dispute_id: DisputeId) -> DispatchResult {
            JurorReputation::<T>::mutate(juror, |rep| {
                *rep = rep.saturating_sub(100);
            });

            Self::deposit_event(Event::JurorSlashed {
                dispute_id,
                juror: juror.clone(),
            });

            Ok(())
        }
    }
}
```

---

## 🏗️ Step 3: Runtime Integration

```rust
impl pallet_bazari_dispute::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type Randomness = RandomnessCollectiveFlip;
    type JurorCount = ConstU32<5>;
    type MinJurorReputation = ConstU32<500>;
    type CommitPhaseDuration = ConstU32<14400>; // ~24 hours at 6s/block
    type RevealPhaseDuration = ConstU32<14400>; // ~24 hours
}

construct_runtime!(
    pub enum Runtime {
        // ... other pallets
        BazariDispute: pallet_bazari_dispute,
    }
);
```

---

## ✅ Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_dispute_works() {
        new_test_ext().execute_with(|| {
            let plaintiff = account(1);
            let evidence = b"QmEvidence123".to_vec();

            assert_ok!(BazariDispute::open_dispute(
                RuntimeOrigin::signed(plaintiff.clone()),
                1,
                evidence
            ));

            let dispute = BazariDispute::disputes(0).unwrap();
            assert_eq!(dispute.order_id, 1);
            assert_eq!(dispute.status, DisputeStatus::Open);
        });
    }

    #[test]
    fn commit_reveal_works() {
        new_test_ext().execute_with(|| {
            // Setup dispute with jurors
            setup_dispute_with_jurors();

            let juror = account(2);
            let vote = Ruling::RefundBuyer;
            let salt = H256::random();
            let vote_hash = BlakeTwo256::hash_of(&(&vote, &salt));

            // Commit
            assert_ok!(BazariDispute::commit_vote(
                RuntimeOrigin::signed(juror.clone()),
                0,
                vote_hash
            ));

            // Advance to reveal phase
            run_to_block(14401);

            // Reveal
            assert_ok!(BazariDispute::reveal_vote(
                RuntimeOrigin::signed(juror),
                0,
                vote,
                salt
            ));
        });
    }
}
```

---

## 📊 Implementation Checklist

- [ ] Week 1-2: Core types, storage, open_dispute, select_jurors
- [ ] Week 2: VRF integration with pallet-randomness
- [ ] Week 2-3: Commit-reveal mechanism (commit_vote, reveal_vote)
- [ ] Week 3: Vote tallying and ruling execution
- [ ] Week 3-4: Juror slashing and reputation
- [ ] Week 4: Integration with bazari-escrow for auto-execution
- [ ] Week 4: End-to-end testing

---

## 📚 Next: [INTEGRATION.md](INTEGRATION.md)
