# Bazari Work - Casos de Uso

## UC-W01: Ativar Perfil Profissional

### Descrição
Usuário ativa a extensão profissional do seu perfil Bazari existente.

### Atores
- Usuário (pessoa física)

### Pré-condições
- Usuário possui perfil Bazari ativo
- Usuário está autenticado

### Fluxo Principal
1. Usuário acessa a seção "Trabalho" ou "Carreira" no seu perfil
2. Sistema exibe formulário de extensão profissional
3. Usuário preenche:
   - Área de atuação
   - Habilidades (tags autocomplete)
   - Experiência (texto livre)
   - Valor/hora sugerido (opcional)
   - Preferência de trabalho (remoto/presencial/híbrido)
4. Usuário define status de disponibilidade
5. Usuário confirma ativação
6. Sistema salva extensão profissional (off-chain)
7. Sistema publica evento no Feed: "Perfil profissional ativado"
8. Sistema exibe confirmação

### Fluxo Alternativo 4a: Usuário escolhe "invisível"
4a.1. Sistema não publica evento no Feed
4a.2. Perfil não aparece em buscas

### Fluxo Alternativo 7a: Usuário opta por não publicar
7a.1. Sistema não publica evento no Feed
7a.2. Continua para passo 8

### Pós-condições
- Perfil possui extensão profissional
- Usuário aparece (ou não) na lista de talentos conforme status

### Regras de Negócio
- RN01: Habilidades são tags normalizadas (lowercase, sem acentos)
- RN02: Máximo de 20 habilidades por perfil
- RN03: Área de atuação é selecionada de lista predefinida

---

## UC-W02: Buscar Talentos

### Descrição
Empresa ou usuário busca profissionais disponíveis no marketplace.

### Atores
- Empresa (contratante)
- Usuário (recrutador)

### Pré-condições
- Ator está autenticado

### Fluxo Principal
1. Ator acessa "Buscar Talentos" no Bazari Work
2. Sistema exibe barra de busca e filtros
3. Ator aplica filtros:
   - Habilidades
   - Área de atuação
   - Localização
   - Faixa de valor/hora
   - Preferência de trabalho
4. Sistema consulta perfis com extensão profissional ativa
5. Sistema filtra por status "disponível" ou "não disponível"
6. Sistema ordena por relevância (match de habilidades)
7. Sistema exibe lista de talentos com:
   - Avatar
   - Nome
   - Área
   - Habilidades (primeiras 5)
   - Status
   - Valor/hora (se público)
8. Ator clica em um talento
9. Sistema exibe perfil profissional completo

### Fluxo Alternativo 5a: Nenhum resultado
5a.1. Sistema exibe mensagem "Nenhum profissional encontrado"
5a.2. Sistema sugere remover filtros ou ampliar busca

### Fluxo Alternativo 8a: Ator inicia proposta
8a.1. Ator clica em "Enviar Proposta"
8a.2. Sistema inicia UC-W04

### Pós-condições
- Ator visualizou lista de talentos
- Opcional: Ator iniciou proposta

### Regras de Negócio
- RN04: Perfis "invisíveis" nunca aparecem
- RN05: Ordenação padrão: relevância > disponibilidade > data de ativação

---

## UC-W03: Publicar Vaga

### Descrição
Empresa publica uma oferta de emprego/trabalho.

### Atores
- Empresa (contratante)

### Pré-condições
- Empresa possui perfil Bazari ativo
- Empresa está autenticada

### Fluxo Principal
1. Empresa acessa "Publicar Vaga" no Bazari Work
2. Sistema exibe formulário de vaga
3. Empresa preenche:
   - Título da vaga
   - Descrição detalhada
   - Área de atuação
   - Habilidades desejadas (tags)
   - Tipo de trabalho (remoto/presencial/híbrido)
   - Localização (se presencial)
   - Valor de pagamento (informativo, opcional)
   - Periodicidade (mensal/semanal/projeto)
4. Empresa confirma publicação
5. Sistema salva vaga (off-chain)
6. Sistema publica evento no Feed: "Nova vaga: [Título]"
7. Sistema exibe confirmação com link da vaga

### Fluxo Alternativo 3a: Empresa salva como rascunho
3a.1. Empresa clica "Salvar Rascunho"
3a.2. Sistema salva vaga com status "rascunho"
3a.3. Sistema não publica evento no Feed

### Fluxo Alternativo 6a: Empresa opta por não publicar no Feed
6a.1. Sistema não publica evento
6a.2. Vaga fica visível apenas por busca direta

### Pós-condições
- Vaga publicada e visível
- Profissionais podem ver e candidatar-se

### Regras de Negócio
- RN06: Publicar vaga não gera vínculo
- RN07: Valores são informativos, não vinculantes
- RN08: Empresa pode ter múltiplas vagas ativas

---

## UC-W04: Enviar Proposta de Trabalho

### Descrição
Empresa envia proposta de trabalho para um profissional.

### Atores
- Empresa (contratante)

### Pré-condições
- Empresa possui perfil ativo
- Profissional possui perfil profissional ativo
- Profissional não está "invisível"

### Fluxo Principal
1. Empresa acessa perfil do profissional
2. Empresa clica em "Enviar Proposta"
3. Sistema exibe formulário de proposta
4. Empresa preenche:
   - Título/cargo
   - Descrição do trabalho
   - Valor proposto
   - Periodicidade
   - Data de início sugerida
   - Duração (definida ou indefinida)
   - Tipo de pagamento (externo/bazari_pay/indefinido)
5. Empresa envia proposta
6. Sistema cria proposta (off-chain)
7. Sistema notifica profissional via BazChat
8. Sistema exibe confirmação

### Fluxo Alternativo 4a: Proposta vinculada a vaga
4a.1. Empresa seleciona vaga existente
4a.2. Sistema preenche campos automaticamente
4a.3. Empresa pode ajustar valores

### Fluxo Alternativo 7a: Profissional está "não disponível"
7a.1. Sistema exibe aviso: "Profissional indisponível no momento"
7a.2. Empresa pode enviar mesmo assim
7a.3. Sistema adiciona tag "enviado para indisponível"

### Pós-condições
- Proposta criada e aguardando resposta
- Profissional notificado

### Regras de Negócio
- RN09: Proposta expira em 15 dias se não respondida
- RN10: Empresa pode cancelar proposta antes do aceite

---

## UC-W05: Responder Proposta

### Descrição
Profissional aceita, recusa ou negocia proposta recebida.

### Atores
- Profissional (candidato)

### Pré-condições
- Proposta existe e está pendente
- Profissional está autenticado

### Fluxo Principal
1. Profissional recebe notificação via BazChat
2. Profissional acessa detalhes da proposta
3. Sistema exibe:
   - Empresa proponente
   - Detalhes da proposta
   - Valores
   - Termos
4. Profissional escolhe "Aceitar"
5. Sistema solicita confirmação
6. Profissional confirma
7. Sistema cria Acordo de Contratação
8. Sistema registra hash do acordo on-chain
9. Sistema notifica empresa via BazChat
10. Sistema publica evento no Feed (sem valores): "Novo acordo de trabalho"

### Fluxo Alternativo 4a: Profissional recusa
4a.1. Profissional clica "Recusar"
4a.2. Profissional pode informar motivo (opcional)
4a.3. Sistema encerra proposta
4a.4. Sistema notifica empresa via BazChat

### Fluxo Alternativo 4b: Profissional negocia
4b.1. Profissional clica "Negociar"
4b.2. Profissional envia contra-proposta via BazChat
4b.3. Sistema mantém proposta como "em negociação"
4b.4. Empresa pode aceitar, recusar ou contra-propor

### Pós-condições
- Proposta aceita: Acordo criado
- Proposta recusada: Proposta encerrada
- Proposta em negociação: Aguardando resolução

### Regras de Negócio
- RN11: Aceite cria acordo automaticamente
- RN12: Hash do acordo vai para blockchain
- RN13: Valores nunca aparecem no Feed

---

## UC-W06: Gerenciar Acordo de Trabalho

### Descrição
Empresa ou profissional gerencia acordo ativo.

### Atores
- Empresa
- Profissional

### Pré-condições
- Acordo existe e está ativo

### Fluxo Principal
1. Ator acessa "Meus Acordos" no Bazari Work
2. Sistema lista acordos do ator
3. Ator seleciona acordo
4. Sistema exibe detalhes:
   - Partes envolvidas
   - Termos
   - Status
   - Histórico
5. Ator pode:
   - Ver detalhes
   - Pausar acordo
   - Encerrar acordo
   - Enviar mensagem (BazChat)

### Fluxo Alternativo 5a: Pausar acordo
5a.1. Ator clica "Pausar"
5a.2. Sistema solicita motivo
5a.3. Sistema atualiza status para "pausado"
5a.4. Sistema notifica outra parte via BazChat
5a.5. Sistema atualiza status on-chain

### Fluxo Alternativo 5b: Encerrar acordo
5b.1. Ator clica "Encerrar"
5b.2. Sistema solicita confirmação e motivo
5b.3. Sistema atualiza status para "encerrado"
5b.4. Sistema notifica outra parte via BazChat
5b.5. Sistema atualiza status on-chain
5b.6. Sistema publica evento no Feed (sem valores)
5b.7. Sistema habilita avaliação mútua

### Pós-condições
- Acordo atualizado conforme ação
- Partes notificadas
- Blockchain atualizada (se mudança de status)

### Regras de Negócio
- RN14: Apenas partes envolvidas podem gerenciar
- RN15: Encerramento é irreversível
- RN16: Pausa pode ser revertida por qualquer parte

---

## UC-W07: Avaliar Pós-Contrato

### Descrição
Após encerramento, partes avaliam mutuamente.

### Atores
- Empresa
- Profissional

### Pré-condições
- Acordo foi encerrado
- Avaliação ainda não realizada

### Fluxo Principal
1. Sistema notifica partes sobre possibilidade de avaliação
2. Ator acessa avaliação
3. Sistema exibe formulário:
   - Nota geral (1-5 estrelas)
   - Comunicação (1-5)
   - Pontualidade (1-5)
   - Qualidade (1-5)
   - Comentário (texto, opcional)
4. Ator envia avaliação
5. Sistema salva avaliação (off-chain)
6. Sistema atualiza reputação do avaliado
7. Sistema pode gerar badge de consistência

### Fluxo Alternativo 3a: Ator opta por não avaliar
3a.1. Ator clica "Não avaliar agora"
3a.2. Sistema mantém opção disponível por 30 dias

### Pós-condições
- Avaliação registrada
- Reputação atualizada
- Possível badge gerado

### Regras de Negócio
- RN17: Avaliação é mútua e independente
- RN18: Avaliações só são públicas após ambas serem enviadas
- RN19: Período de avaliação: 30 dias após encerramento
- RN20: Comentários passam por moderação automática

---

## UC-W08: Vincular Acordo ao Bazari Pay

### Descrição
Empresa vincula acordo existente ao Bazari Pay para pagamentos automáticos.

### Atores
- Empresa

### Pré-condições
- Acordo existe e está ativo
- Tipo de pagamento é "bazari_pay" ou "indefinido"
- Profissional possui wallet ativa

### Fluxo Principal
1. Empresa acessa acordo
2. Empresa clica "Configurar Pagamento via Bazari Pay"
3. Sistema exibe formulário de contrato recorrente:
   - Valor (pré-preenchido do acordo)
   - Periodicidade (pré-preenchida)
   - Dia de pagamento
   - Data de início
4. Empresa confirma
5. Sistema cria contrato no Bazari Pay (UC-P01)
6. Sistema vincula contrato ao acordo
7. Sistema notifica profissional via BazChat
8. Sistema atualiza tipo de pagamento para "bazari_pay"

### Fluxo Alternativo 4a: Profissional precisa aceitar
4a.1. Sistema envia solicitação ao profissional
4a.2. Profissional aceita termos de pagamento
4a.3. Sistema continua do passo 5

### Pós-condições
- Contrato de pagamento criado no Bazari Pay
- Acordo vinculado ao contrato
- Pagamentos serão automáticos

### Regras de Negócio
- RN21: Integração é opcional
- RN22: Valores podem diferir do acordo original
- RN23: Encerrar acordo não encerra contrato Pay automaticamente
