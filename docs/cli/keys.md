# bazari keys

Gerencia API Keys para uso do SDK externo.

## Sintaxe

```bash
bazari keys <command> [options]
```

## Comandos

| Comando | Descrição |
|---------|-----------|
| `list` | Lista todas as API Keys |
| `show [slug]` | Mostra detalhes de uma API Key |
| `rotate [slug]` | Rotaciona API Key ou Secret Key |
| `revoke [slug]` | Revoga API Key permanentemente |

## bazari keys list

Lista todas as API Keys associadas à sua conta.

```bash
bazari keys list
```

**Saída:**

```
Your API Keys:

Meu App (meu-app)
  API Key:  baz_sdk_abc123...
  Status:   APPROVED
  Origins:  https://meusite.com, https://app.meusite.com
  Requests: 1,234
  Created:  01/12/2024

Outro App (outro-app)
  API Key:  baz_sdk_xyz789...
  Status:   PENDING
  Origins:  https://outro.com
  Requests: 0
  Created:  05/12/2024
```

**Status possíveis:**
- `PENDING` - Aguardando aprovação
- `APPROVED` - Aprovado e ativo
- `REJECTED` - Rejeitado
- `SUSPENDED` - Suspenso temporariamente

## bazari keys show

Mostra detalhes de uma API Key específica.

```bash
# Por slug
bazari keys show meu-app

# Ou do projeto atual (usa manifest)
cd meu-app
bazari keys show
```

**Saída:**

```
Meu App (meu-app)

API Key:     baz_sdk_abc123xyz...
Status:      APPROVED
Origins:     https://meusite.com, https://app.meusite.com
Permissions: user:read, wallet:read, wallet:transfer

Statistics:
  Total Requests: 12,345
  Last Request:   10/12/2024, 14:30:00
  Created:        01/12/2024, 10:00:00
```

## bazari keys rotate

Rotaciona credenciais de segurança.

### Rotacionar Secret Key (padrão)

```bash
bazari keys rotate meu-app
# ou
bazari keys rotate --secret meu-app
```

**O que acontece:**
- Gera novo Secret Key
- O antigo Secret Key para de funcionar imediatamente
- API Key permanece a mesma
- Integrações server-side precisam atualizar o secret

**Saída:**

```
✓ Secret key rotated

New Secret Key: sk_secret_newxyz789...

⚠️ Save this securely! It will NOT be shown again.
   Update your server-side integrations with the new secret.
```

### Rotacionar API Key (cuidado!)

```bash
bazari keys rotate --api meu-app
```

**O que acontece:**
- Gera nova API Key E novo Secret Key
- TODAS as integrações param de funcionar
- Precisa atualizar API Key em todos os lugares

**Confirmação:**

```
⚠️ This will invalidate the current API key. All integrations will stop working. Continue? (y/N)
```

**Saída:**

```
✓ API key rotated

New API Key: baz_sdk_newabc123...

⚠️ Update all integrations with the new API key!
```

## bazari keys revoke

Revoga uma API Key permanentemente. Esta ação **NÃO pode ser desfeita**.

```bash
bazari keys revoke meu-app
```

**Confirmações:**

```
⚠️ This will PERMANENTLY revoke the API key for "Meu App". This cannot be undone. Continue? (y/N) y

Type "meu-app" to confirm: meu-app

✓ API key revoked

The API key has been permanently revoked.
```

**O que acontece:**
- API Key é desativada imediatamente
- Todas as requisições com essa key falharão
- Dados de analytics são mantidos
- Para usar SDK externo novamente, execute `bazari publish --target external`

## Boas Práticas de Segurança

### Secret Key

1. **Nunca exponha no frontend** - O Secret Key deve ficar apenas no servidor
2. **Use variáveis de ambiente** - Não commite secrets no código
3. **Rotacione periodicamente** - A cada 90 dias é uma boa prática
4. **Rotacione imediatamente** se suspeitar de vazamento

```bash
# Em caso de vazamento
bazari keys rotate meu-app
```

### API Key

1. **Pode ser exposta no frontend** - É identificação, não autenticação
2. **Use allowedOrigins** - Restrinja a domínios específicos
3. **Monitore uso** - Verifique requests no dashboard

### Armazenamento Seguro

```bash
# Servidor (Node.js)
# .env (NÃO commitar!)
BAZARI_API_KEY=baz_sdk_abc123...
BAZARI_SECRET_KEY=sk_secret_xyz789...

# Código
const apiKey = process.env.BAZARI_API_KEY;
const secretKey = process.env.BAZARI_SECRET_KEY;
```

## Permissões

As permissões da API Key são definidas no manifest:

```json
{
  "permissions": [
    { "id": "user.profile.read" },
    { "id": "wallet.balance.read" },
    { "id": "wallet.transfer.request" }
  ]
}
```

São convertidas automaticamente:

| Manifest | API Key |
|----------|---------|
| `user.profile.read` | `user:read` |
| `wallet.balance.read` | `wallet:read` |
| `wallet.transfer.request` | `wallet:transfer` |
| `storage.app` | `storage:read` |
| `notifications.send` | `ui:toast` |

## Troubleshooting

### API Key não encontrada

```
No API key found for: meu-app
```

**Solução:** Execute `bazari publish --target external` primeiro.

### Not logged in

```
Error: Not logged in
Run "bazari login" first
```

**Solução:** Execute `bazari login`.

### Provide slug or run from project directory

```
Error: Provide slug or run from project directory
```

**Solução:** Informe o slug ou execute de dentro do diretório do projeto:

```bash
bazari keys show meu-app
# ou
cd meu-app && bazari keys show
```

## Próximos Passos

- [Publicar app](./publish.md)
- [SDK Externo](../sdk/external.md)
- [Autenticação OAuth](../guides/oauth.md)
