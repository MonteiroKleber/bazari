# Bazari Work - Visão Geral

## 1. Objetivo

Criar um mercado vivo de talentos e oportunidades, permitindo que empresas e usuários:
- Se encontrem
- Negociem
- Formalizem acordos

**Sem obrigatoriedade de pagamento pela Bazari.**

## 2. Identidade e Perfil

### Perfil Único
O Bazari Work **não cria perfis novos**. Utiliza o perfil único já existente da Bazari.

### Extensão Profissional (opcional)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `professionalArea` | string | Área de atuação principal |
| `skills` | string[] | Habilidades (tags) |
| `experience` | text | Experiência (texto livre) |
| `professionalStatus` | enum | disponivel, nao_disponivel, invisivel |
| `hourlyRate` | decimal? | Valor hora sugerido (opcional) |
| `workPreference` | enum | remoto, presencial, hibrido |

### Status de Disponibilidade
```
disponível        → aparece em buscas, aceita propostas
não disponível    → visível, mas não aceita propostas
invisível         → não aparece em buscas
```

## 3. Lista de Talentos (Currículos)

### Conceito Técnico
Não é uma entidade separada. É uma **consulta filtrada** sobre perfis existentes.

### Filtros de Busca
- Habilidades (skills)
- Área de atuação
- Localização (se disponível)
- Status de disponibilidade
- Faixa de valor/hora
- Preferência de trabalho

### Importante
> A Bazari **não valida currículos**. É um marketplace, não uma certificadora.

## 4. Ofertas de Emprego (Vagas)

### Campos da Vaga
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `title` | string | ✅ |
| `description` | text | ✅ |
| `companyId` | uuid | ✅ |
| `area` | string | ✅ |
| `skills` | string[] | ❌ |
| `paymentValue` | decimal | ❌ (informativo) |
| `paymentPeriod` | enum | ❌ (mensal, semanal, por_projeto) |
| `workType` | enum | ✅ (remoto, presencial, hibrido) |
| `location` | string | ❌ |
| `status` | enum | ✅ (aberta, fechada, pausada) |

### Regra
> Publicar vaga **não gera vínculo**.

## 5. Acordos de Contratação

### Quando é criado
Quando empresa e usuário concordam com os termos, cria-se um **Acordo de Contratação** com aceite digital de ambas as partes.

### Campos do Acordo
| Campo | Tipo | On-chain |
|-------|------|----------|
| `id` | uuid | ✅ |
| `companyWallet` | address | ✅ |
| `userWallet` | address | ✅ |
| `startDate` | date | ✅ |
| `endDate` | date? | ✅ |
| `status` | enum | ✅ |
| `paymentType` | enum | ✅ |
| `createdAt` | timestamp | ✅ |
| `closedAt` | timestamp? | ✅ |
| `title` | string | ❌ |
| `description` | text | ❌ |
| `terms` | text | ❌ |
| `paymentValue` | decimal | ❌ |

### Status do Acordo
```
proposto      → aguardando aceite
ativo         → em vigor
pausado       → temporariamente suspenso
encerrado     → finalizado
cancelado     → cancelado antes de iniciar
```

### Tipo de Pagamento
```
externo       → pago fora da Bazari
bazari_pay    → via Bazari Pay
indefinido    → a definir
```

### Importante
> 📌 **Não é contrato trabalhista**
> 📌 **Não é folha de pagamento**
> 📌 **É um registro de acordo**

## 6. Separação On-chain vs Off-chain

### ON-CHAIN (mínimo e estratégico)
- ID do acordo
- Wallet da empresa
- Wallet do usuário
- Tipo de pagamento
- Status (ativo/encerrado)
- Timestamps

### OFF-CHAIN (a maior parte)
- Perfis e currículo
- Vagas (texto, filtros, buscas)
- Propostas e negociações
- Mensagens (BazChat)
- Feed e timeline

### Resumo
| Item | On-chain | Off-chain |
|------|----------|-----------|
| Perfil | ❌ | ✅ |
| Currículo | ❌ | ✅ |
| Vaga | ❌ | ✅ |
| Proposta | ❌ | ✅ |
| Contratação (registro) | ✅ | ❌ |
| Eventos públicos | ⚠️ (hash) | ✅ |
| Mensagens | ❌ | ✅ |

## 7. Eventos e Integração Social

### Eventos Públicos (Feed/Perfil)
- Perfil profissional ativado
- Vaga publicada
- Contratação iniciada (**sem valores**)
- Avaliação pós-contrato
- Badges de consistência

### Eventos Privados (BazChat)
- Proposta enviada
- Aceite/recusa
- Mensagens de negociação
- Encerramento do vínculo

## 8. Frase Técnica Oficial

> O Bazari Work opera majoritariamente off-chain, usando a blockchain apenas como camada de prova de vínculo.
