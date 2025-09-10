#!/usr/bin/env bash
set -euo pipefail

API="${API:-http://localhost:3000}"
DAO="${DAO:-dao-demo}"

command -v curl >/dev/null || { echo "❌ curl não encontrado"; exit 1; }
command -v jq   >/dev/null || { echo "❌ jq não encontrado (sudo apt-get install -y jq)"; exit 1; }

echo "🔎 Health check: $API/healthz"
curl -sS "$API/healthz" | jq . || true

post() {
  local payload="$1" name="$2"
  echo
  echo "→ POST /products ($name)"
  echo "— payload —"
  echo "$payload" | jq -C .
  echo "— resposta —"
  curl -sS -i -X POST "$API/products" \
    -H 'Content-Type: application/json' \
    -d "$payload"
  echo
}

# helper: pega a 1ª opção de enum
first_enum() { jq -r ".jsonSchema.properties.$1.enum[0] // empty" <<<"$2"; }

create_quadros() {
  local spec tecnica suporte estado payload
  spec="$(curl -sS "$API/categories/effective-spec?id=products-casa-decoracao-decoracao-quadros")"
  tecnica="$(first_enum tecnica "$spec")";  [ -n "$tecnica" ] || tecnica="Óleo"
  suporte="$(first_enum suporte "$spec")";  [ -n "$suporte" ] || suporte="Tela"
  estado="$(first_enum estado_conservacao "$spec")"; [ -n "$estado" ] || estado="Novo"

  payload="$(cat <<JSON
{
  "daoId": "$DAO",
  "title": "Quadro abstrato moderno",
  "description": "Peça original em $tecnica sobre $suporte.",
  "priceBzr": "150.00",
  "categoryPath": ["casa-decoracao","decoracao","quadros"],
  "attributes": {
    "tecnica": "$tecnica",
    "suporte": "$suporte",
    "largura_cm": 80,
    "altura_cm": 60,
    "estado_conservacao": "$estado",
    "moldura": true,
    "autenticidade": "Com certificado",
    "cores_predominantes": ["Azul","Branco"]
  }
}
JSON
)"
  post "$payload" "quadros"
}

create_camisas() {
  local spec modelo tamanho material condicao payload
  spec="$(curl -sS "$API/categories/effective-spec?id=products-moda-acessorios-roupas-masculinas-camisas-masculinas")"
  modelo="$(first_enum modelo "$spec")";     [ -n "$modelo" ]   || modelo="Casual"
  tamanho="$(first_enum tamanho "$spec")";   [ -n "$tamanho" ]  || tamanho="M"
  material="$(first_enum material "$spec")"; [ -n "$material" ] || material="Algodão"
  condicao="$(first_enum condicao "$spec")"; [ -n "$condicao" ] || condicao="Novo"

  payload="$(cat <<JSON
{
  "daoId": "$DAO",
  "title": "Camisa masculina básica",
  "description": "Camisa $modelo tamanho $tamanho em $material.",
  "priceBzr": "49.90",
  "categoryPath": ["moda-acessorios","roupas","masculinas","camisas-masculinas"],
  "attributes": {
    "cor": "Azul",
    "marca": "Bazari",
    "modelo": "$modelo",
    "tamanho": "$tamanho",
    "condicao": "$condicao",
    "material": "$material"
  }
}
JSON
)"
  post "$payload" "camisas-masculinas"
}

create_android() {
  local spec marca arm condicao payload
  spec="$(curl -sS "$API/categories/effective-spec?id=products-tecnologia-eletronicos-celulares-smartphones-android")"
  marca="$(first_enum marca "$spec")";                 [ -n "$marca" ] || marca="Samsung"
  arm="$(first_enum armazenamento "$spec")";           [ -n "$arm" ]   || arm="128GB"
  condicao="$(first_enum condicao "$spec")";           [ -n "$condicao" ] || condicao="Novo"

  payload="$(cat <<JSON
{
  "daoId": "$DAO",
  "title": "Smartphone Android $marca $arm",
  "description": "Aparelho Android com $arm de armazenamento.",
  "priceBzr": "899.00",
  "categoryPath": ["tecnologia","eletronicos","celulares","smartphones-android"],
  "attributes": {
    "marca": "$marca",
    "armazenamento": "$arm",
    "cor": "Preto",
    "condicao": "$condicao"
  }
}
JSON
)"
  post "$payload" "smartphones-android"
}

create_quadros
create_camisas
create_android
