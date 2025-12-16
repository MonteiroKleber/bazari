# bazari publish

Publica seu app para a App Store Bazari e/ou gera credenciais para SDK externo.

## Sintaxe

```bash
bazari publish [options]
```

## Opções

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `-d, --dir <dir>` | Diretório do build | `dist` |
| `-t, --target <target>` | Target de publicação | auto (via manifest) |
| `-o, --origin <urls...>` | Origens permitidas (SDK externo) | - |
| `--changelog <text>` | Changelog da versão | - |
| `--no-submit` | Upload sem submeter para review | false |

## Targets de Publicação

### appstore (padrão)

Publica na App Store Bazari. O app será carregado em iframe dentro da plataforma.

```bash
bazari publish --target appstore
```

**Fluxo:**
1. Cria tarball do diretório `dist/`
2. Upload para IPFS
3. Submete para review
4. Após aprovação, app fica disponível na App Store

**Requisitos:**
- Executar `bazari build` antes
- Estar logado (`bazari login`)
- Manifest válido (`bazari validate`)

### external

Gera API Key para usar o SDK em sites externos.

```bash
bazari publish --target external --origin https://meusite.com
```

**Fluxo:**
1. Cria registro de SDK App
2. Gera API Key e Secret Key
3. Retorna credenciais

**Requisitos:**
- Estar logado (`bazari login`)
- Informar pelo menos uma origem (`--origin`)

### both

Publica na App Store E gera API Key para SDK externo.

```bash
bazari publish --target both --origin https://meusite.com
```

## Exemplos

### Publicar na App Store

```bash
# Build primeiro
bazari build

# Publicar
bazari publish

# Saída:
# ✓ Bundle criado (156.24 KB)
# ✓ Upload para IPFS: QmXyz...
# ✓ Submetido para review
#
# Status: Pending Review
# CID: QmXyz123...
```

### Publicar para SDK Externo

```bash
bazari publish --target external --origin https://meusite.com https://app.meusite.com

# Saída:
# ✓ API Key gerada
#
# API Key: baz_sdk_abc123xyz...
# Secret Key: sk_secret_987xyz...
#
# ⚠️ Salve o Secret Key! Não será mostrado novamente.
```

### Upload sem submeter para review

```bash
bazari publish --no-submit

# Saída:
# ✓ Bundle uploaded
# CID: QmXyz123...
#
# Run without --no-submit to submit for review
```

### Com changelog

```bash
bazari publish --changelog "Corrigido bug de login e melhorado performance"
```

## Configuração via Manifest

O target também pode ser definido no `bazari.manifest.json`:

```json
{
  "name": "Meu App",
  "version": "1.0.0",
  "distribution": {
    "appStore": true,
    "external": true,
    "allowedOrigins": ["https://meusite.com"]
  }
}
```

Com essa configuração, `bazari publish` detecta automaticamente o target:

| appStore | external | Target automático |
|----------|----------|-------------------|
| true | false | `appstore` |
| false | true | `external` |
| true | true | `both` |

## Diferenças entre Targets

| Característica | App Store | External |
|----------------|-----------|----------|
| Onde roda | Iframe no Bazari | Seu próprio site |
| Autenticação | Automática (usuário logado) | Via API Key + OAuth |
| Bundle | Upload para IPFS | Não necessário |
| Review | Sim | Sim (para aprovar API Key) |
| Rate Limiting | Por app | Por API Key |
| Analytics | Dashboard Bazari | Dashboard + Logs próprios |

## Erros Comuns

### Build directory not found

```
Error: Build directory "dist" not found
Run "bazari build" first
```

**Solução:** Execute `bazari build` antes de publicar.

### Origin required

```
Error: --origin required for external target
```

**Solução:** Informe as origens permitidas:
```bash
bazari publish --target external --origin https://meusite.com
```

### Not logged in

```
Error: Not logged in
Run "bazari login" first
```

**Solução:** Execute `bazari login`.

## Próximos Passos

- [Gerenciar API Keys](./keys.md)
- [Validar manifest](./validate.md)
- [Build do app](./build.md)
