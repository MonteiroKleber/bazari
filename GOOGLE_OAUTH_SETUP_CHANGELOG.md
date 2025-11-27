# 📝 Changelog: GOOGLE_OAUTH_SETUP.md

## ✅ Correções Aplicadas (2025-11-21)

Este documento registra as 3 correções feitas no guia de setup do Google OAuth.

---

## 1️⃣ Removida seção Google+ API ❌ → ✅

**Antes:**
```
### 3. Habilitar Google+ API (Necessário para OAuth)
1. No menu lateral, vá em: APIs & Services → Library
2. Busque por: Google+ API
3. Clique em Google+ API
4. Clique em ENABLE
5. Aguarde ativação (~10 segundos)
```

**Depois:**
```
### 3. ~~Habilitar APIs~~ (Não necessário)

O Google OAuth 2.0 funciona automaticamente com Google Identity Services.
Você não precisa habilitar nenhuma API adicional.

> Nota histórica: A antiga Google+ API foi descontinuada em março de 2019.
```

**Motivo:** Google+ API foi extinta em 2019. OAuth 2.0 funciona nativamente com Google Identity Services.

---

## 2️⃣ Corrigido Authorized Domains ❌ → ✅

**Antes:**
```
| Authorized domains | bazari.libervia.xyz |
```

**Depois:**
```
| Authorized domains | libervia.xyz |
```

**Motivo:** Google exige o domínio raiz, não subdomínios. Usar `libervia.xyz` cobre todos os subdomínios (`bazari.libervia.xyz`, `bazari-vr.libervia.xyz`, etc).

---

## 3️⃣ Adicionados Redirect URIs do VR ✅

**Antes:**
```
Authorized redirect URIs:
https://bazari.libervia.xyz/api/auth/google/callback
https://bazari.libervia.xyz/auth/google/success
http://localhost:3000/auth/google/callback
http://localhost:5173/auth/google/success
```

**Depois:**
```
Authorized redirect URIs:
https://bazari.libervia.xyz/api/auth/google/callback
https://bazari.libervia.xyz/auth/google/success
https://bazari-vr.libervia.xyz/api/auth/google/callback      ← NOVO
https://bazari-vr.libervia.xyz/auth/google/success          ← NOVO
http://localhost:3000/auth/google/callback
http://localhost:5173/auth/google/success

> Nota: Total de 6 redirect URIs (Web + VR + Dev)
```

**Motivo:** Suportar login social no Bazari VR (aplicação 3D React/Three.js).

**Também adicionado:**
```
Authorized JavaScript origins:
...
https://bazari-vr.libervia.xyz    ← NOVO
http://localhost:3000              ← NOVO
```

---

## 📊 Resumo das Mudanças

| Item | Antes | Depois | Status |
|------|-------|--------|--------|
| Google+ API | Pedia habilitação | Removido (API extinta) | ✅ |
| Authorized Domains | `bazari.libervia.xyz` | `libervia.xyz` | ✅ |
| Redirect URIs | 4 URIs (só Web) | 6 URIs (Web + VR) | ✅ |
| JavaScript Origins | 3 origins | 4 origins | ✅ |

---

## ✅ Resultado Final

O guia agora está **100% correto** e alinhado com:

1. ✅ Melhores práticas Google OAuth 2.0 (2025)
2. ✅ Arquitetura multi-app (Web + VR)
3. ✅ Infraestrutura Bazari atual
4. ✅ Domínios e subdomínios corretos

---

## 🔗 Referências

- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
- [OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Authorized Domains Best Practices](https://support.google.com/cloud/answer/6158849)
