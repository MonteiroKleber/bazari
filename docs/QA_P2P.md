# QA Roteiro — Módulo P2P (Fase 1)

Este roteiro descreve testes manuais (smoke/QA) para o fluxo de Câmbio P2P (SELL_BZR + PIX), tanto via UI quanto via API.

Pré‑requisitos
- API rodando em `http://localhost:3000` com Postgres local.
- Web rodando (Vite) e acessível.
- Duas contas (maker e taker) autenticadas via SIWS.

Variáveis (API opcional)
- Exporte dois tokens de acesso se quiser testar via cURL:
  - `export MAKER_TOKEN="Bearer <token-do-maker>"`
  - `export TAKER_TOKEN="Bearer <token-do-taker>"`

1) Perfil de Pagamento (PIX)
- Maker acessa `/app/p2p/offers/new`.
- Se não houver PIX, use o atalho “Adicionar PIX” e salve uma chave (ex.: `maker@example.com`).
- Esperado: toast “PIX salvo”.

2) Criar Oferta SELL_BZR
- Em `/app/p2p/offers/new`:
  - Lado: “Vender BZR”.
  - Preço: `5.00` R$/BZR.
  - Min: `100`, Max: `500`.
  - Publicar.
- Esperado: toast “Oferta publicada” e aparece na listagem `/app/p2p` (aba “Comprar BZR”).

3) Oferta Pública e Validações
- Abrir `/app/p2p/offers/:id` da oferta criada.
- Informar valor fora da faixa (ex.: `50`) e clicar “Comprar”.
- Esperado: toast de erro “Valor fora da faixa desta oferta.” e nenhuma ordem criada.

4) Criar Ordem (Taker)
- Informar `150` BRL e “Comprar”.
- Esperado: toast “Ordem criada” e redirecionamento para `/app/p2p/orders/:id`.

5) Sala — Escrow (Maker)
- Maker abre a mesma sala e clica “Obter instruções” (mostra `escrowAddress` e `amountBZR`).
- Clique “Confirmar escrow” e informe um hash qualquer (ex.: `0xdeadbeef`).
- Esperado: toast de sucesso e mudança do status para “Aguardando pagamento PIX”. A chave PIX aparece para o Taker.

6) Sala — Pagamento (Taker)
- Taker anexa ao menos 1 comprovante (imagem) — aparece uma lista de anexos com opção de remover e “Limpar anexos”.
- Sem anexos, o botão “Marcar como pago” fica desabilitado com dica.
- Com anexo, clicando “Marcar como pago” deve avançar para “Aguardando confirmação”.

7) Sala — Confirmação (Maker)
- Maker clica “Confirmar recebimento”.
- Esperado: status “Liberado” e mensagem de sistema “Escrow liberado”.

8) Chat e Rate Limit
- Trocar mensagens entre maker e taker (polling a cada 5s). Mensagens de sistema aparecem como eventos discretos.
- Enviar rapidamente >10 mensagens em 60s de um mesmo usuário/sala deve retornar limite com toast “Você atingiu o limite...”. Um “badge” com contagem regressiva aparece ao lado do input.

9) Timer de expiração
- Na sala, observe o badge de “Tempo restante mm:ss” na parte superior enquanto a ordem estiver ativa (DRAFT/AWAITING_*).
- (Opcional) Para simular expiração, altere temporariamente `expiresAt` no banco para alguns segundos à frente e observe a contagem regressiva chegar a 00:00.

API (opcional) — script
- Use `script/p2p-smoke.sh` com `MAKER_TOKEN` e `TAKER_TOKEN` exportados para validar o fluxo completo por cURL.

Casos de erro esperados
- Publicar oferta sem PIX → erro orientando a salvar chave.
- Criar ordem fora da faixa → 400 + toast na UI.
- Marcar pago antes do escrow → 400.
- Confirmar escrow/recebimento por usuário incorreto → 403.
- Chat acima do limite → 429 + toast + badge de cooldown.

