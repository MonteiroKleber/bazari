# Fase 2 – Frontend (Geração Client-side, CIFRA E2EE, Backup)

Escopo: gerar seed local no fluxo social, cifrar com segredo do usuário (PIN/senha) no cliente, salvar no IndexedDB e opcionalmente enviar backup cifrado. Não tocar no fluxo tradicional.

Passos:
1) Login Social (CreateAccount.tsx):
   - Após Google → sempre gerar mnemonic local (`useKeyring.generateMnemonic`).
   - Derivar address localmente e mostrar fluxo de seed/PIN (ou ocultar seed se a UX optar por backup-only, documentar risco).
   - Usuário cria PIN/senha; derivar chave (PBKDF2 150k SHA-256) e cifrar mnemonic com AES-GCM (já temos utils).
   - Salvar no IndexedDB: `{ cipher, iv, salt, authTag, iterations, address, name? }`.
   - Opcional: POST backup cifrado para `/auth/social/backup` (mesmo blob).
   - Não consumir wallet do backend (mesmo se houver blob antigo, considerar forçar regenerar local para limpar risco).

2) Restore em device limpo:
   - Se não houver vault local após login social, chamar `GET /auth/social/backup`.
   - Se existir backup: solicitar PIN/senha e tentar decrypt usando cipher+authTag+iterations retornados.
   - Em sucesso: salvar no IndexedDB (com authTag) e seguir.
   - Se não houver backup: orientar usuário a recriar ou usar seed (se exibida).

3) Unlock (auth/unlock):
   - Já suporta authTag e fallback PIN→hashPin; manter.
   - Caso falhe decrypt e registro não tenha authTag/iterations compatíveis, orientar a refazer login social para restaurar backup.

4) Armazenamento local:
   - Garantir `saveAccount` persiste authTag/iterations.
   - Não sobrescrever fluxo tradicional.

5) Tokens/sessão:
   - Login social continua armazenando access/refresh para chamadas autenticadas; não depende de wallet do backend.

6) UX/opções:
   - Decidir se a seed será exibida no fluxo social (mais seguro) ou se o backup E2EE é obrigatório.
   - Mensagem clara de que o PIN/senha é essencial para abrir o backup em novos dispositivos.

Testes:
   - Criar conta social nova → salvar no IndexedDB → logout → unlock com PIN.
   - Device limpo: login Google → GET backup → pedir PIN → unlock.
   - PIN errado → falha; PIN correto → sucesso.
   - Fluxo tradicional intacto.
