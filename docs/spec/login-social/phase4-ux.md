# Fase 4 – UI/UX para Backup E2EE (Login Social) – Sem alterar fluxo tradicional

Objetivo: guiar o usuário social em:
- Criação: gerar seed local, definir PIN/senha, salvar no device e (opcional) subir backup cifrado.
- Restauração em device limpo: login social → baixar backup cifrado → pedir PIN/senha → desbloquear e salvar local.

Princípios:
- Não tocar no fluxo tradicional (telas de seed/PIN já existentes).
- Mensagens claras: “PIN/senha é necessário para abrir em novos dispositivos”.
- Feedback de estado (carregando, sucesso, erro) e caminhos de recuperação (relogin social, tentar outro PIN).

Fluxo Social – Criação (device limpo)
1) Login Google → sucesso de auth.
2) Gerar seed local (silencioso ou com tela de seed, conforme política):
   - Opção A (mais seguro): mostrar seed (como no tradicional) + avisos de backup local.
   - Opção B (backup-only): pular seed e depender do backup E2EE; exigir confirmação de que o usuário entende que o PIN é crítico.
3) Tela “Proteja sua conta”:
   - Campo PIN/senha (com requisitos mínimos) + indicador de força.
   - Texto: “Use este PIN para abrir sua carteira neste e em novos dispositivos. Não compartilhamos nem guardamos seu PIN.”
4) Ao continuar:
   - Cifrar seed com PIN no cliente (AES-GCM/150k).
   - Salvar no IndexedDB (vault).
   - Opcional: “Salvar backup cifrado” (toggle default ON):
     - Explicar que o backup é cifrado com o PIN/senha; o servidor não consegue abrir.
     - Se ON: subir blob para `/auth/social/backup`; mostrar spinner e resultado.
5) Final:
   - Mensagem de sucesso: “Wallet protegida com seu PIN. Guarde o PIN para abrir em outros dispositivos.”

Fluxo Social – Restauração (device limpo)
1) Login Google → detectar que não há vault local.
2) Chamar GET `/auth/social/backup`:
   - Se existir: mostrar “Recuperar carteira” + resumo (e-mail Google) + botão “Continuar”.
   - Se não existir: mensagem “Nenhum backup encontrado. Você precisa recriar a carteira” + CTA refazer fluxo de criação (gera nova seed).
3) Tela PIN/senha:
   - “Digite o PIN usado para proteger sua carteira.”
   - Input seguro; botão “Desbloquear”.
4) Feedback:
   - Loading enquanto decripta.
   - Sucesso: “Carteira restaurada neste dispositivo.” Salvar no IndexedDB e prosseguir para /app.
   - Erro: “PIN incorreto ou backup inválido. Tente novamente.” Limitar tentativas? (opcional).

Fluxo Unlock (auth/unlock) – Social
- Reaproveitar tela atual de PIN, mas:
  - Mostrar hint se for conta social sem authTag/backup: “Se você trocou de dispositivo, refaça login social para restaurar o backup.”
  - Caso decrypt falhe, sugerir “Refazer login social” (link) em vez de apenas “PIN incorreto” infinito.

Estados e erros a cobrir
- “Sem backup”: oferecer recriar carteira social.
- “PIN incorreto”: mensagem clara, manter contador se desejado.
- “Falha ao baixar backup”: opção “Tentar novamente” e “Re-login Google”.
- “Nenhuma conta local”: CTA “Login Social” ou “Criar nova”.

Integração com UI existente
- Aproveitar componentes de PIN/strength e alertas já usados no tradicional.
- Aproveitar telas de seed se forem mostradas (opção A).
- Adicionar modal/step específico para “Salvar backup cifrado” e “Restaurar backup”.
- Navegação: `/auth/create` (social) inclui steps descritos; `/auth/unlock` inclui hint para relogar social se necessário.
