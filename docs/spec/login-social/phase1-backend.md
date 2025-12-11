# Fase 1 – Backend (Contratos e Backup E2EE)

Escopo: remover dependência de wallet no fluxo social; backend só autentica e, opcionalmente, armazena backup cifrado (blob opaco). Manter fluxos tradicionais intactos.

Passos:
1) `/auth/google/verify`
   - Remover retorno de wallet/mnemonic.
   - Manter: `user`, `isNewUser`, `accessToken`, `refresh` (cookies).
   - `isNewUser` baseado em existência de backup (ver GET backup).

2) Novo endpoint de backup E2EE (autenticado):
   - `POST /auth/social/backup`
     - Body: `{ cipher, iv, salt, authTag, iterations, address }` (tudo base64).
     - Armazenar blob opaco vinculado a `userId`.
     - Não derivar chave, não descriptografar.
   - `GET /auth/social/backup`
     - Retorna blob se existir para `userId`.
     - Usado para restore em device limpo.
   - Validar ownership via `authUser.sub` (JWT).

3) Descontinuar recriptografia server-side:
   - Deprecar `/auth/social/setup-pin` (ou manter como no-op com 410/NotSupported).
   - Remover geração server-side de mnemonic no serviço social.

4) Modelos/DB:
   - Opcional: tabela/coluna para backup cifrado (blob + address + iterations + timestamps).
   - Flag para detectar se backup existe (`hasBackup`).

5) Segurança:
   - Não logar payload de backup.
   - Rate limit básico nos endpoints de backup.
   - Authorization obrigatória (Bearer/cookie refresh).

6) Compatibilidade:
   - Não alterar rotas tradicionais.
   - Se existir código que espera `wallet` no login social, retornar `wallet: null` explicitamente para evitar break.

Testes:
- Login social retorna tokens e não retorna wallet.
- POST backup armazena blob; GET retorna o mesmo blob (byte-for-byte).
- Autorização obrigatória; 401/403 corretos para tokens inválidos/ausentes.
