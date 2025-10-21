#!/bin/bash
export NODE_ENV=production
export VITE_API_URL=https://bazari.libervia.xyz
export VITE_IPFS_GATEWAY_URL=https://bazari.libervia.xyz/ipfs/
export VITE_CHAT_WS_URL=wss://bazari.libervia.xyz/chat/ws
export VITE_BAZARICHAIN_WS=wss://bazari.libervia.xyz/rpc
export VITE_FF_SELLER_PANEL=true
export VITE_FF_PUBLIC_EXPLORE=true
export VITE_FLAG_STORE_ONCHAIN_V1=true
export VITE_FLAG_STORE_BRANDED_V1=false
export VITE_FLAG_STORE_UX_V2=false

rm -rf dist
pnpm build
