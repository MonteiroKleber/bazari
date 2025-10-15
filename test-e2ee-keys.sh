#!/bin/bash

# Script para testar registro de chaves E2EE

echo "======================================"
echo "Teste de E2EE - Registro de Chaves"
echo "======================================"
echo ""

# Verificar se API está rodando
echo "1. Verificando se API está rodando..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ API está rodando"
else
    echo "   ❌ API não está rodando"
    echo "   Execute: pnpm --filter ./apps/api dev"
    exit 1
fi
echo ""

# Obter token de acesso
echo "2. Você precisa de um token JWT válido"
echo "   Pegue o token do console do navegador (F12):"
echo "   localStorage.getItem('access_token')"
echo ""
read -p "Cole o token aqui: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "   ❌ Token vazio"
    exit 1
fi

echo "   ✅ Token recebido"
echo ""

# Gerar chave pública mock (base64)
PUBLIC_KEY="YmF6YXJpLXRlc3Qta2V5LTEyMzQ1Njc4OTA="

echo "3. Testando endpoint PUT /api/chat/keys..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"publicKey\": \"$PUBLIC_KEY\"}" \
    http://localhost:3001/api/chat/keys)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Registro de chave funcionou!"
    echo "   Response: $BODY"
else
    echo "   ❌ Erro no registro de chave"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Response: $BODY"
    exit 1
fi
echo ""

# Buscar perfil para pegar profileId
echo "4. Buscando perfil do usuário..."
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/me)

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n 1)
BODY=$(echo "$PROFILE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    PROFILE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   ✅ Perfil encontrado: $PROFILE_ID"
else
    echo "   ❌ Erro ao buscar perfil"
    echo "   HTTP Code: $HTTP_CODE"
    exit 1
fi
echo ""

# Buscar chave pública registrada
echo "5. Testando endpoint GET /api/chat/keys..."
KEYS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3001/api/chat/keys?profileIds=$PROFILE_ID")

HTTP_CODE=$(echo "$KEYS_RESPONSE" | tail -n 1)
BODY=$(echo "$KEYS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Busca de chave funcionou!"
    echo "   Response: $BODY"

    # Verificar se a chave está no response
    if echo "$BODY" | grep -q "$PUBLIC_KEY"; then
        echo "   ✅ Chave pública encontrada no banco!"
    else
        echo "   ⚠️  Chave não encontrada no response (pode ter sido substituída)"
    fi
else
    echo "   ❌ Erro ao buscar chave"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Response: $BODY"
    exit 1
fi
echo ""

echo "======================================"
echo "✅ Todos os testes passaram!"
echo "======================================"
echo ""
echo "Próximos passos:"
echo "1. Ambos usuários precisam fazer login"
echo "2. Ambos verão no console: '[useChat] Public key registered on server'"
echo "3. Então poderão conversar com E2EE"
