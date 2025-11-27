# Fase 3 – Migração e Testes

Objetivo: transicionar usuários sociais para o novo modelo sem seed no backend e validar regressões.

Migração:
1) Flag legacy:
   - Marcar usuários sociais existentes como `legacy_server_seed = true` (ex.: via migration ou flag na tabela social/managedWallet).
2) Forçar reconfiguração:
   - Ao detectar legacy no login social, orientar a regenerar seed local (ou restaurar via backup se disponível).
   - Opcional: oferecer “regenerar wallet” que gera nova seed client-side e substitui backup.
3) Limpeza local:
   - Se encontrar registros sociais sem `authTag`/iterations corretos, pedir re-login social para restaurar backup conforme novo modelo.

Testes (mínimo):
1) Social novo (device limpo):
   - Login Google → seed local → cifra AES-GCM (authTag/iterations) → saveAccount → unlock OK → backup opcional salvo.
2) Logout + unlock (mesmo device):
   - PIN correto → sucesso; PIN incorreto → falha.
3) Device limpo com backup:
   - Login Google → GET backup → PIN → decrypt → saveAccount → unlock OK.
4) Fluxo tradicional:
   - Criar/importar → unlock → SIWS → sem regressão.
5) Segurança:
   - Nenhum endpoint retorna mnemonic; backup armazenado opaco; PIN nunca vai em plaintext.

Comunicação:
   - Explicar que, para dispositivos novos, é preciso PIN/senha para abrir o backup.
   - Se optarem por exibir seed, lembrar o usuário de guardar a frase.
