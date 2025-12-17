# 🔐 Google OAuth Setup - Bazari Social Login

Este guia mostra como criar as credenciais OAuth 2.0 no Google Cloud Console para habilitar o login social na Bazari.

---

## 📋 Pré-requisitos

- Conta Google (gmail)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com/)

---

## 🚀 Passo a Passo

### 1. Acessar Google Cloud Console

1. Abra: https://console.cloud.google.com/
2. Faça login com sua conta Google

### 2. Criar ou Selecionar Projeto

**Opção A: Criar novo projeto**
1. Clique no dropdown de projetos (topo esquerdo)
2. Clique em "NEW PROJECT"
3. Nome: `Bazari Auth` (ou nome de sua preferência)
4. Clique em "CREATE"
5. Aguarde ~30 segundos para o projeto ser criado
6. Selecione o projeto criado

**Opção B: Usar projeto existente**
1. Selecione um projeto existente no dropdown

### 3. ~~Habilitar APIs~~ (Não necessário)

O Google OAuth 2.0 funciona automaticamente com **Google Identity Services**.
Você não precisa habilitar nenhuma API adicional.

> **Nota histórica:** A antiga Google+ API foi descontinuada em março de 2019.

### 4. Configurar OAuth Consent Screen

1. No menu lateral, vá em: **APIs & Services** → **OAuth consent screen**
2. Escolha: **External** (para permitir qualquer usuário Google)
3. Clique em **CREATE**

**Preencher informações:**

| Campo | Valor |
|-------|-------|
| **App name** | `Bazari` |
| **User support email** | Seu email |
| **App logo** | (Opcional) Upload logo 120x120px |
| **Application home page** | `https://bazari.libervia.xyz` |
| **Authorized domains** | `libervia.xyz` |
| **Developer contact** | Seu email |

4. Clique em **SAVE AND CONTINUE**
5. Em "Scopes", clique em **ADD OR REMOVE SCOPES**
6. Selecione os seguintes scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Clique em **UPDATE** → **SAVE AND CONTINUE**
8. Em "Test users" (opcional para desenvolvimento):
   - Adicione emails de teste se quiser testar antes de publicar
   - Clique em **SAVE AND CONTINUE**
9. Clique em **BACK TO DASHBOARD**

### 5. Criar Credenciais OAuth 2.0

1. No menu lateral, vá em: **APIs & Services** → **Credentials**
2. Clique em **+ CREATE CREDENTIALS** (topo)
3. Selecione: **OAuth 2.0 Client ID**

**Configurar Client ID:**

| Campo | Valor |
|-------|-------|
| **Application type** | `Web application` |
| **Name** | `Bazari Production` |

**Authorized JavaScript origins:**
```
https://bazari.libervia.xyz
https://bazari-vr.libervia.xyz
http://localhost:5173
http://localhost:3000
```

**Authorized redirect URIs:**
```
https://bazari.libervia.xyz/api/auth/google/callback
https://bazari.libervia.xyz/auth/google/success
https://bazari-vr.libervia.xyz/api/auth/google/callback
https://bazari-vr.libervia.xyz/auth/google/success
http://localhost:3000/auth/google/callback
http://localhost:5173/auth/google/success
```

> **Nota:** Total de **6 redirect URIs** (Web + VR + Dev)

4. Clique em **CREATE**

### 6. Copiar Credenciais

Após criar, você verá um modal com:

```
✅ Client ID: xxxxx-xxxxxxx.apps.googleusercontent.com
✅ Client Secret: GOCSPX-xxxxxxxxxxxxxxxxx
```

**IMPORTANTE:** Copie ambos os valores agora!

### 7. Configurar Variáveis de Ambiente

#### Backend (`/root/bazari/apps/api/.env`):

Substitua os placeholders:

```bash
GOOGLE_CLIENT_ID=xxxxx-xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxx
```

#### Frontend (`/root/bazari/apps/web/.env.production`):

```bash
VITE_GOOGLE_CLIENT_ID=xxxxx-xxxxxxx.apps.googleusercontent.com
```

### 8. Diferenças Web vs VR

As credenciais OAuth criadas funcionam para **ambas** as aplicações:

| Aplicação | Domínio | Usa mesmas credenciais? |
|-----------|---------|-------------------------|
| **Bazari Web (2D)** | `bazari.libervia.xyz` | ✅ Sim |
| **Bazari VR (3D)** | `bazari-vr.libervia.xyz` | ✅ Sim |

O mesmo `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` são reutilizados.

**Por que funciona?**
- O Google permite múltiplos redirect URIs no mesmo Client ID
- Cada aplicação usa seu próprio callback URL
- A autenticação é compartilhada: **mesmo usuário, mesma wallet**

### 9. Verificar Configuração

Execute no terminal:

```bash
# Backend
cd /root/bazari/apps/api
grep GOOGLE_CLIENT_ID .env

# Frontend
cd /root/bazari/apps/web
grep VITE_GOOGLE_CLIENT_ID .env.production
```

Ambos devem exibir o Client ID (não deve ser `YOUR_GOOGLE_CLIENT_ID_HERE`).

---

## ✅ Setup Completo!

Você completou a configuração do Google OAuth! 🎉

**O que foi configurado:**
- ✅ OAuth Client ID criado
- ✅ 6 redirect URIs cadastrados (Web + VR + Dev)
- ✅ Domínio autorizado: `libervia.xyz`
- ✅ Variáveis de ambiente configuradas
- ✅ Suporte para Web 2D e VR 3D

Agora você pode prosseguir para a **Fase 1** da implementação (código OAuth).

---

## 🔒 Segurança

**⚠️ NUNCA COMPARTILHE:**
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`

**✅ Pode ser público:**
- `GOOGLE_CLIENT_ID` (vai no frontend)

---

## 🐛 Troubleshooting

### Erro: "redirect_uri_mismatch"

**Causa:** URI de redirecionamento não está cadastrado.

**Solução:**
1. Volte em **APIs & Services** → **Credentials**
2. Clique no seu OAuth Client ID
3. Adicione o URI exato que está aparecendo no erro
4. Aguarde ~5 minutos para propagar

### Erro: "invalid_client"

**Causa:** Client ID ou Secret incorretos.

**Solução:**
1. Verifique se copiou corretamente (sem espaços extras)
2. Verifique se não há quebras de linha no `.env`
3. Reinicie o servidor backend

### Erro: "access_denied" ou "This app isn't verified"

**Causa:** App em modo de teste.

**Solução (Desenvolvimento):**
- Adicione seu email em "Test users" no OAuth consent screen

**Solução (Produção):**
1. Vá em **OAuth consent screen**
2. Clique em **PUBLISH APP**
3. Submeta para verificação do Google (pode levar dias)
4. Ou mantenha em teste e adicione usuários manualmente

---

## 📚 Referências

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen](https://support.google.com/cloud/answer/10311615)
