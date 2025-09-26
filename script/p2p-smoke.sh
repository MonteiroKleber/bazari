#!/usr/bin/env bash
set -euo pipefail

# Simple smoke script for P2P API (Phase 1)
# Requirements:
# - API running at $API (default: http://localhost:3000)
# - Two JWTs (maker and taker) to exercise role-specific actions
#   export MAKER_TOKEN="Bearer ..."   # will publish offer and confirm escrow/received
#   export TAKER_TOKEN="Bearer ..."   # will create order and mark-paid

API=${API:-http://localhost:3000}

if [[ -z "${MAKER_TOKEN:-}" || -z "${TAKER_TOKEN:-}" ]]; then
  echo "Please export MAKER_TOKEN and TAKER_TOKEN (Authorization headers)." >&2
  exit 1
fi

echo "== Upsert maker PIX profile =="
curl -sS -X POST "$API/p2p/payment-profile" \
  -H "Authorization: $MAKER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"pixKey":"maker-pix@example.com","bankName":"Banco Demo","accountName":"Maker"}' | jq . >/dev/null

echo "== Create SELL_BZR offer (maker) =="
OFFER=$(curl -sS -X POST "$API/p2p/offers" \
  -H "Authorization: $MAKER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"side":"SELL_BZR","priceBRLPerBZR":5.00,"minBRL":100,"maxBRL":500,"method":"PIX","autoReply":"Confirmo rápido :)"}')
echo "$OFFER" | jq .
OFFER_ID=$(echo "$OFFER" | jq -r .id)

echo "== Taker creates order from offer =="
ORDER=$(curl -sS -X POST "$API/p2p/offers/$OFFER_ID/orders" \
  -H "Authorization: $TAKER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"amountBRL":150}')
echo "$ORDER" | jq .
ORDER_ID=$(echo "$ORDER" | jq -r .id)

echo "== Get escrow intent (either side) =="
curl -sS -X POST "$API/p2p/orders/$ORDER_ID/escrow-intent" -H "Authorization: $MAKER_TOKEN" | jq .

echo "== Confirm escrow (maker) =="
curl -sS -X POST "$API/p2p/orders/$ORDER_ID/escrow-confirm" \
  -H "Authorization: $MAKER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"txHash":"0xdeadbeef"}' | jq .status

echo "== Mark paid (taker) =="
curl -sS -X POST "$API/p2p/orders/$ORDER_ID/mark-paid" \
  -H "Authorization: $TAKER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"proofUrls":["https://example.com/comprovante.png"]}' | jq .status

echo "== Confirm received (maker) =="
curl -sS -X POST "$API/p2p/orders/$ORDER_ID/confirm-received" \
  -H "Authorization: $MAKER_TOKEN" | jq .status

echo "== Done =="

