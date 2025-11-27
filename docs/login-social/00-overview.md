# Migração Login Social para Geração Client-side/E2EE (Mantendo Tradicional Intacto)

Objetivo: remover geração/armazenamento de seed no backend para login social (Google) e mover toda a criação/cifra para o cliente, com backup opcional E2EE. Fluxo tradicional (seed client-side) permanece intocado.

Fases sugeridas:
1) Backend: remover wallet do fluxo social, expor só auth + backup cifrado opcional.
2) Frontend: gerar seed local, cifrar com segredo do usuário (PIN/senha), salvar em IndexedDB, opcionalmente enviar backup cifrado.
3) Restore/Unlock: usar PIN para decrypt local; se não houver vault local, baixar backup cifrado e abrir com o mesmo segredo.
4) Migração/limpeza: marcar contas sociais existentes para recriação local; comunicação/UX.

Notas:
- Não tocar no fluxo tradicional.
- PBKDF2/Argon2 + AES-GCM, iterations 150k (compatibilidade com utils atuais).
- Nunca enviar PIN em texto para o backend; backup sempre cifrado.
