# Prompt 07: Avaliações e Reputação

## Objetivo

Implementar sistema de avaliações pós-contrato e integração com reputação.

## Pré-requisitos

- Fase 5 (Acordos) - avaliações são habilitadas após encerramento
- Sistema de reputação existente

## Contexto

Após encerramento de acordo, ambas as partes podem avaliar mutuamente. Avaliações só ficam públicas após ambas serem enviadas.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

```prisma
model WorkEvaluation {
  id              String   @id @default(uuid())
  agreementId     String
  agreement       WorkAgreement @relation(fields: [agreementId], references: [id])

  // Quem avalia quem
  authorId        String
  author          User     @relation("EvaluationAuthor", fields: [authorId], references: [id])
  targetId        String
  target          User     @relation("EvaluationTarget", fields: [targetId], references: [id])

  // Notas (1-5)
  overallRating       Int
  communicationRating Int?
  punctualityRating   Int?
  qualityRating       Int?

  // Comentário
  comment         String?
  commentStatus   CommentStatus @default(PENDING)

  // Visibilidade
  isPublic        Boolean @default(false)

  createdAt       DateTime @default(now())

  @@unique([agreementId, authorId])
}

enum CommentStatus {
  PENDING
  APPROVED
  REJECTED
}
```

#### 1.2 Endpoints

```typescript
// Avaliações
POST   /api/work/agreements/:id/evaluate     // Enviar avaliação
GET    /api/work/agreements/:id/evaluations  // Ver avaliações do acordo
GET    /api/work/evaluations/received        // Avaliações recebidas
GET    /api/work/evaluations/given           // Avaliações enviadas

// Estatísticas públicas
GET    /api/work/talents/:handle/stats       // Stats do profissional
```

**Request POST (Avaliar):**
```json
{
  "overallRating": 5,
  "communicationRating": 5,
  "punctualityRating": 4,
  "qualityRating": 5,
  "comment": "Excelente profissional, entregas no prazo..."
}
```

**Response:**
```json
{
  "evaluation": {
    "id": "uuid",
    "overallRating": 5,
    "communicationRating": 5,
    "punctualityRating": 4,
    "qualityRating": 5,
    "comment": "Excelente profissional...",
    "commentStatus": "PENDING",
    "isPublic": false,
    "createdAt": "2025-03-15T10:00:00Z"
  },
  "otherPartyEvaluated": true,
  "nowPublic": true
}
```

#### 1.3 Lógica de Publicação

```typescript
async function createEvaluation(data: CreateEvaluationData) {
  // Validar que acordo está encerrado
  const agreement = await prisma.workAgreement.findUnique({
    where: { id: data.agreementId },
  });

  if (agreement.status !== 'CLOSED') {
    throw new BadRequest('Acordo não está encerrado');
  }

  // Validar período (30 dias)
  const daysSinceClosed = differenceInDays(new Date(), agreement.closedAt!);
  if (daysSinceClosed > 30) {
    throw new BadRequest('Período de avaliação expirado');
  }

  // Verificar se já avaliou
  const existing = await prisma.workEvaluation.findUnique({
    where: {
      agreementId_authorId: {
        agreementId: data.agreementId,
        authorId: data.authorId,
      },
    },
  });

  if (existing) {
    throw new BadRequest('Você já avaliou este acordo');
  }

  // Determinar target
  const targetId = data.authorId === agreement.workerId
    ? agreement.companyId
    : agreement.workerId;

  // Criar avaliação
  const evaluation = await prisma.workEvaluation.create({
    data: {
      ...data,
      targetId,
      isPublic: false,
    },
  });

  // Verificar se outra parte já avaliou
  const otherEvaluation = await prisma.workEvaluation.findFirst({
    where: {
      agreementId: data.agreementId,
      authorId: targetId,
    },
  });

  if (otherEvaluation) {
    // Ambos avaliaram - tornar público
    await prisma.workEvaluation.updateMany({
      where: { agreementId: data.agreementId },
      data: { isPublic: true },
    });

    // Atualizar reputação de ambos
    await updateReputation(data.authorId, evaluation);
    await updateReputation(targetId, otherEvaluation);

    // Feed event
    await createFeedEvent({
      type: 'WORK_EVALUATIONS_PUBLISHED',
      data: { agreementId: data.agreementId },
    });
  }

  return evaluation;
}

async function updateReputation(userId: string, evaluation: WorkEvaluation) {
  // Buscar todas as avaliações recebidas
  const evaluations = await prisma.workEvaluation.findMany({
    where: { targetId: userId, isPublic: true },
  });

  // Calcular média
  const avgRating = evaluations.reduce((sum, e) => sum + e.overallRating, 0) / evaluations.length;

  // Atualizar perfil profissional
  await prisma.professionalProfile.update({
    where: { userId },
    data: {
      averageRating: avgRating,
      totalEvaluations: evaluations.length,
    },
  });

  // Integrar com sistema de reputação geral
  await reputationService.addWorkScore(userId, evaluation.overallRating);
}
```

### 2. Frontend (Web)

#### 2.1 Componentes

```
components/
  EvaluationForm.tsx          # Formulário de avaliação
  EvaluationCard.tsx          # Card de avaliação
  EvaluationPrompt.tsx        # Prompt para avaliar
  RatingStars.tsx             # Input de estrelas
  EvaluationStats.tsx         # Estatísticas agregadas
```

#### 2.2 EvaluationForm.tsx

```tsx
interface EvaluationFormProps {
  agreementId: string;
  targetName: string;
  onSubmit: (data: EvaluationData) => Promise<void>;
}

export function EvaluationForm({ agreementId, targetName, onSubmit }: EvaluationFormProps) {
  const [ratings, setRatings] = useState({
    overall: 0,
    communication: 0,
    punctuality: 0,
    quality: 0,
  });
  const [comment, setComment] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliar {targetName}</CardTitle>
        <CardDescription>
          Sua avaliação será pública após ambas as partes avaliarem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField label="Avaliação Geral" required>
          <RatingStars
            value={ratings.overall}
            onChange={(v) => setRatings({ ...ratings, overall: v })}
            size="lg"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Comunicação">
            <RatingStars
              value={ratings.communication}
              onChange={(v) => setRatings({ ...ratings, communication: v })}
            />
          </FormField>
          <FormField label="Pontualidade">
            <RatingStars
              value={ratings.punctuality}
              onChange={(v) => setRatings({ ...ratings, punctuality: v })}
            />
          </FormField>
          <FormField label="Qualidade">
            <RatingStars
              value={ratings.quality}
              onChange={(v) => setRatings({ ...ratings, quality: v })}
            />
          </FormField>
        </div>

        <FormField label="Comentário (opcional)">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Descreva sua experiência..."
            maxLength={1000}
          />
          <FormHint>{comment.length}/1000</FormHint>
        </FormField>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onSubmit({ ...ratings, comment })}
          disabled={ratings.overall === 0}
        >
          Enviar Avaliação
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### 2.3 EvaluationPrompt.tsx

Exibir após encerramento de acordo:

```tsx
<Alert>
  <Star className="h-4 w-4" />
  <AlertTitle>Avalie sua experiência</AlertTitle>
  <AlertDescription>
    O acordo com {counterpartyName} foi encerrado.
    Compartilhe sua experiência para ajudar outros usuários.
  </AlertDescription>
  <Button onClick={() => navigate(`/work/agreements/${id}/evaluate`)}>
    Avaliar agora
  </Button>
</Alert>
```

#### 2.4 EvaluationStats.tsx

Exibir no perfil do profissional:

```tsx
<div className="flex items-center gap-4">
  <div className="text-center">
    <div className="text-3xl font-bold">4.8</div>
    <RatingStars value={4.8} readonly size="sm" />
    <div className="text-sm text-muted-foreground">12 avaliações</div>
  </div>

  <div className="flex-1 space-y-2">
    <RatingBar label="Comunicação" value={4.9} />
    <RatingBar label="Pontualidade" value={4.7} />
    <RatingBar label="Qualidade" value={4.8} />
  </div>
</div>
```

### 3. Badges de Consistência

```typescript
// Verificar e conceder badges
async function checkWorkBadges(userId: string) {
  const stats = await getWorkStats(userId);

  // Badge: Pagamentos em dia (empresa)
  if (stats.onTimePayments >= 10 && stats.latePayments === 0) {
    await grantBadge(userId, 'PAYMENTS_ON_TIME');
  }

  // Badge: Acordos concluídos
  if (stats.completedAgreements >= 5) {
    await grantBadge(userId, 'WORK_VETERAN_5');
  }
  if (stats.completedAgreements >= 20) {
    await grantBadge(userId, 'WORK_VETERAN_20');
  }

  // Badge: Avaliação alta
  if (stats.averageRating >= 4.8 && stats.totalEvaluations >= 10) {
    await grantBadge(userId, 'TOP_RATED');
  }
}
```

### 4. Rotas

```tsx
<Route path="work/agreements/:id/evaluate" element={<EvaluationPage />} />
<Route path="work/evaluations" element={<MyEvaluationsPage />} />
```

## Critérios de Aceite

- [ ] Avaliação só disponível após encerramento
- [ ] Período de 30 dias para avaliar
- [ ] Avaliações só públicas após ambas enviadas
- [ ] Média calculada e exibida no perfil
- [ ] Comentários passam por moderação
- [ ] Badges concedidos automaticamente
- [ ] Feed event quando avaliações são publicadas

## Arquivos a Criar/Modificar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/work/evaluations.ts (criar)
  src/services/work-reputation.service.ts (criar)

apps/web/src/modules/work/
  pages/EvaluationPage.tsx
  pages/MyEvaluationsPage.tsx
  components/EvaluationForm.tsx
  components/EvaluationCard.tsx
  components/EvaluationPrompt.tsx
  components/EvaluationStats.tsx
  components/RatingStars.tsx (pode reutilizar do P2P)
```
