# Dew Finance

A multi-chain DeFi application built on NEAR Protocol. Users deposit into on-chain vaults and interact with assets across multiple chains.

## What it does

- **Vaults** — NEAR smart contract vaults that hold and manage cross-chain assets (USDT, USDC, and more)
- **Abstract accounts** — using account on EVM chains, Solana, and Zcash to interact with NEAR
- **Cross-chain deposits & redemptions** — 1-click flows that bridge funds from any supported chain into a vault and back out
- **Portfolio** — Unified view of balances and positions across all connected wallets and chains
- **Policy engine** — Per-vault restriction policies (e.g. allowlists, spend limits) enforced on-chain

## Supported chains

NEAR · Ethereum · Arbitrum · BNB Smart Chain · Polygon · Monad · Plasma · Bera · Base · Solana · Zcash

## Getting started

```bash
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project structure

```
src/
  pages/          # Homepage, Portfolio, Vaults, Policy
  components/     # Layout, modals, shared UI
  stores/         # Zustand wallet store
  queries/        # TanStack Query data fetchers
  mutations/      # Write operations (deposit, redeem, …)
  utils/          # 1-click cross-chain helpers, vault utils
  walletSelector/ # NEAR / EVM / Solana wallet connectors
  evmConfig.ts    # Wagmi chain and transport config
```
