# Bazari Pay - Casos de Uso

## UC-P01: Criar Contrato de Pagamento Recorrente

### Descrição
Empresa ou pagador cria um contrato de pagamento recorrente para um recebedor.

### Atores
- Empresa (pagador)
- Usuário pagador (pessoa física)

### Pré-condições
- Pagador possui wallet com saldo
- Recebedor possui wallet ativa
- Pagador está autenticado

### Fluxo Principal
1. Pagador acessa "Novo Contrato" no Bazari Pay
2. Sistema exibe formulário
3. Pagador preenche:
   - Recebedor (busca por handle ou wallet)
   - Valor do pagamento
   - Moeda (BZR ou BRL)
   - Periodicidade (semanal, quinzenal, mensal)
   - Dia do pagamento
   - Data de início
   - Data de fim (opcional)
   - Descrição (opcional)
4. Sistema valida dados
5. Sistema verifica saldo inicial
6. Pagador confirma criação
7. Sistema cria contrato on-chain
8. Sistema registra contrato off-chain
9. Sistema notifica recebedor via BazChat
10. Sistema exibe confirmação com próximo pagamento

### Fluxo Alternativo 3a: Vínculo com Bazari Work
3a.1. Pagador seleciona "Vincular a acordo de trabalho"
3a.2. Sistema lista acordos ativos
3a.3. Pagador seleciona acordo
3a.4. Sistema pré-preenche valor e recebedor

### Fluxo Alternativo 5a: Saldo insuficiente para primeiro pagamento
5a.1. Sistema exibe aviso
5a.2. Pagador pode prosseguir mesmo assim
5a.3. Primeiro pagamento será tentado na data configurada

### Pós-condições
- Contrato criado e ativo
- Recebedor notificado
- Próximo pagamento agendado

### Regras de Negócio
- RN01: Contrato requer wallets válidas de ambas as partes
- RN02: Valor mínimo: 1 BZR ou R$ 10,00
- RN03: Dia do pagamento: 1-28 (evita problemas com meses curtos)

---

## UC-P02: Executar Pagamento Automático

### Descrição
Sistema executa pagamento recorrente automaticamente no dia programado.

### Atores
- Sistema (scheduler)

### Pré-condições
- Contrato ativo
- Data atual = dia do pagamento
- Contrato não expirado

### Fluxo Principal
1. Scheduler identifica contratos com pagamento hoje
2. Para cada contrato:
   3. Sistema verifica status (deve ser ATIVO)
   4. Sistema busca ajustes do período
   5. Sistema calcula valor final (base + extras - descontos)
   6. Sistema verifica saldo do pagador
   7. Sistema executa transferência on-chain:
      - Débito da wallet do pagador
      - Crédito na wallet do recebedor
   8. Sistema registra execução
   9. Sistema atualiza próximo pagamento
   10. Sistema notifica ambas as partes via BazChat
   11. Sistema gera comprovante

### Fluxo Alternativo 6a: Saldo insuficiente
6a.1. Sistema registra falha
6a.2. Sistema notifica pagador via BazChat
6a.3. Sistema agenda retry para 24h depois
6a.4. Continua para próximo contrato

### Fluxo Alternativo 6b: Retry (2ª ou 3ª tentativa)
6b.1. Sistema verifica número de tentativas
6b.2. Se < 3, executa normalmente
6b.3. Se = 3 e falha, marca período como não pago
6b.4. Sistema notifica ambas as partes

### Fluxo Alternativo 7a: Falha na transação on-chain
7a.1. Sistema registra erro técnico
7a.2. Sistema agenda retry em 1 hora
7a.3. Sistema alerta equipe técnica

### Pós-condições
- Pagamento executado ou falha registrada
- Partes notificadas
- Próximo pagamento atualizado

### Regras de Negócio
- RN04: Máximo 3 tentativas por período
- RN05: Retry após 24h de falha por saldo
- RN06: Retry após 1h de falha técnica

---

## UC-P03: Cadastrar Ajuste (Extra/Desconto)

### Descrição
Pagador cadastra ajuste para ser aplicado no próximo pagamento.

### Atores
- Empresa (pagador)

### Pré-condições
- Contrato ativo
- Pagador autenticado

### Fluxo Principal
1. Pagador acessa contrato
2. Pagador clica "Adicionar Ajuste"
3. Sistema exibe formulário:
4. Pagador preenche:
   - Tipo (extra ou desconto)
   - Valor
   - Mês de referência
   - Motivo
   - Requer aprovação? (sim/não)
5. Pagador confirma
6. Sistema salva ajuste com status "rascunho" ou "pendente_aprovacao"
7. Se requer aprovação:
   - Sistema notifica recebedor via BazChat
   - Aguarda aceite

### Fluxo Alternativo 7a: Recebedor aprova
7a.1. Recebedor recebe notificação
7a.2. Recebedor acessa ajuste
7a.3. Recebedor clica "Aprovar"
7a.4. Sistema muda status para "aprovado"
7a.5. Ajuste será aplicado no próximo pagamento

### Fluxo Alternativo 7b: Recebedor recusa
7b.1. Recebedor clica "Recusar"
7b.2. Sistema muda status para "recusado"
7b.3. Sistema notifica pagador
7b.4. Ajuste não será aplicado

### Pós-condições
- Ajuste cadastrado
- Se aprovado, será aplicado no próximo pagamento

### Regras de Negócio
- RN07: Descontos requerem aprovação por padrão
- RN08: Extras podem ser aplicados diretamente
- RN09: Ajuste só pode ser editado antes de aplicado

---

## UC-P04: Pausar Contrato

### Descrição
Pagador ou recebedor pausa temporariamente os pagamentos.

### Atores
- Empresa (pagador)
- Usuário (recebedor)

### Pré-condições
- Contrato ativo
- Ator é parte do contrato

### Fluxo Principal
1. Ator acessa contrato
2. Ator clica "Pausar Contrato"
3. Sistema solicita motivo (opcional)
4. Ator confirma
5. Sistema atualiza status para PAUSADO on-chain
6. Sistema registra histórico
7. Sistema notifica outra parte via BazChat
8. Próximo pagamento suspenso

### Fluxo Alternativo: Retomar contrato
1. Ator acessa contrato pausado
2. Ator clica "Retomar"
3. Sistema atualiza status para ATIVO on-chain
4. Sistema recalcula próximo pagamento
5. Sistema notifica outra parte

### Pós-condições
- Contrato pausado
- Pagamentos suspensos até retomar

### Regras de Negócio
- RN10: Qualquer parte pode pausar
- RN11: Qualquer parte pode retomar
- RN12: Períodos pausados não geram execuções

---

## UC-P05: Encerrar Contrato

### Descrição
Pagador ou recebedor encerra definitivamente o contrato.

### Atores
- Empresa (pagador)
- Usuário (recebedor)

### Pré-condições
- Contrato ativo ou pausado
- Ator é parte do contrato

### Fluxo Principal
1. Ator acessa contrato
2. Ator clica "Encerrar Contrato"
3. Sistema exibe aviso: "Esta ação é irreversível"
4. Sistema solicita motivo
5. Ator confirma
6. Sistema atualiza status para ENCERRADO on-chain
7. Sistema registra data de encerramento
8. Sistema notifica outra parte via BazChat

### Pós-condições
- Contrato encerrado
- Nenhum pagamento futuro
- Histórico preservado

### Regras de Negócio
- RN13: Encerramento é irreversível
- RN14: Pagamentos pendentes ainda serão tentados
- RN15: Histórico permanece acessível

---

## UC-P06: Visualizar Histórico de Pagamentos

### Descrição
Usuário visualiza histórico de pagamentos recebidos ou efetuados.

### Atores
- Empresa (pagador)
- Usuário (recebedor)

### Pré-condições
- Ator é parte de pelo menos um contrato

### Fluxo Principal
1. Ator acessa "Histórico" no Bazari Pay
2. Sistema lista pagamentos com filtros:
   - Período (data início/fim)
   - Status (sucesso/falha)
   - Contrato específico
   - Tipo (enviados/recebidos)
3. Para cada pagamento, exibe:
   - Data
   - Contraparte
   - Valor base
   - Ajustes
   - Valor final
   - Status
   - TX hash (link para explorador)

### Fluxo Alternativo 3a: Exportar relatório
3a.1. Ator clica "Exportar"
3a.2. Sistema gera CSV/PDF
3a.3. Sistema disponibiliza download

### Pós-condições
- Histórico visualizado
- Opcional: relatório exportado

---

## UC-P07: Upload de Contratos em Lote (CSV)

### Descrição
Empresa cria múltiplos contratos via upload de arquivo CSV.

### Atores
- Empresa (pagador)

### Pré-condições
- Empresa autenticada
- Plano empresarial ativo

### Fluxo Principal
1. Empresa acessa "Importar Contratos"
2. Sistema exibe template CSV para download
3. Empresa faz upload do arquivo preenchido
4. Sistema valida formato e dados:
   - Wallets válidas
   - Valores positivos
   - Datas válidas
5. Sistema exibe preview com erros (se houver)
6. Empresa corrige ou confirma
7. Sistema cria contratos em batch
8. Sistema retorna relatório de sucesso/erros

### Fluxo Alternativo 4a: Erros no arquivo
4a.1. Sistema lista erros por linha
4a.2. Empresa pode:
   - Corrigir e re-upload
   - Ignorar linhas com erro
   - Cancelar

### Template CSV
```csv
receiver_handle,receiver_wallet,value,currency,period,payment_day,start_date,end_date,description
@joao,5GrwvaEF...,8000,BRL,MONTHLY,5,2025-02-01,,Salário
@maria,5FHneW46...,5000,BRL,MONTHLY,5,2025-02-01,,Salário
```

### Pós-condições
- Múltiplos contratos criados
- Recebedores notificados
- Relatório disponível

### Regras de Negócio
- RN16: Limite de 1000 linhas por upload
- RN17: Processamento assíncrono para > 100 linhas
- RN18: Notificação ao concluir processamento

---

## UC-P08: Gerar Comprovante de Pagamento

### Descrição
Sistema gera comprovante automático após cada pagamento.

### Atores
- Sistema (automático)
- Usuário (solicitação manual)

### Pré-condições
- Pagamento executado com sucesso

### Fluxo Principal (Automático)
1. Após execução bem-sucedida:
2. Sistema gera comprovante PDF com:
   - Data e hora
   - Pagador (nome/empresa)
   - Recebedor (nome)
   - Valor base
   - Ajustes aplicados
   - Valor final
   - TX hash
   - QR Code de verificação
3. Sistema envia comprovante via BazChat para ambas as partes

### Fluxo Principal (Manual)
1. Usuário acessa histórico
2. Usuário clica "Gerar Comprovante" em pagamento específico
3. Sistema gera PDF
4. Sistema disponibiliza download

### Pós-condições
- Comprovante disponível
- Enviado automaticamente via BazChat

---

## UC-P09: Consultar Contrato On-Chain

### Descrição
Usuário verifica dados do contrato diretamente na blockchain.

### Atores
- Qualquer usuário (público)

### Pré-condições
- Contrato registrado on-chain

### Fluxo Principal
1. Usuário acessa verificador público
2. Usuário informa ID do contrato ou TX hash
3. Sistema consulta blockchain
4. Sistema exibe:
   - Wallets (pagador/recebedor)
   - Valor base
   - Periodicidade
   - Status atual
   - Histórico de execuções
   - Timestamps

### Pós-condições
- Dados verificados na fonte (blockchain)

### Regras de Negócio
- RN19: Consulta é pública e gratuita
- RN20: Não exibe dados off-chain (descrição, motivos)
