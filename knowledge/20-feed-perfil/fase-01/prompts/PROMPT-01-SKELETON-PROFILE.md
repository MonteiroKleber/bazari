# Prompt: Implementar Skeleton Loading no Perfil

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Criar um componente de skeleton loading para a pagina de perfil publico que substitui o texto simples "Carregando...".

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-01/01-SKELETON-PROFILE.md`

## Ordem de Implementacao

### Etapa 1: Criar Componente ProfileSkeleton

Criar `apps/web/src/components/profile/ProfileSkeleton.tsx`:

1. Importar componente existente `PostCardSkeleton` de `@/components/social/PostCardSkeleton`
2. Criar estrutura que replica o layout de ProfilePublicPage
3. Usar classes Tailwind `animate-pulse` e `bg-muted`

Estrutura do skeleton:
- Banner: `w-full h-48 md:h-64`
- Avatar: `h-24 w-24 md:h-32 md:w-32 rounded-full`
- Nome: `h-8 w-48`
- Handle: `h-4 w-32`
- Bio: `h-4 w-64`
- Contadores: 3x `h-4 w-20`
- Tabs: 5x `h-8 w-20`
- Posts: 3x PostCardSkeleton

### Etapa 2: Integrar em ProfilePublicPage

Modificar `apps/web/src/pages/ProfilePublicPage.tsx`:

1. Importar ProfileSkeleton
2. Substituir o loading state atual:

```typescript
// De:
if (loading) return <div className="container mx-auto p-6">{t('profile.loading')}</div>;

// Para:
if (loading) return <ProfileSkeleton />;
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/profile/ProfileSkeleton.tsx`

### Modificar
- [ ] `apps/web/src/pages/ProfilePublicPage.tsx`

## Cenarios de Teste

1. [ ] Skeleton aparece durante loading inicial
2. [ ] Layout do skeleton corresponde ao layout real
3. [ ] Animacao pulse funciona
4. [ ] Dark mode renderiza com cores corretas
5. [ ] Transicao suave quando dados carregam

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(profile): add skeleton loading component

- Create ProfileSkeleton component with animated placeholders
- Replace loading text with skeleton in ProfilePublicPage
- Reuse existing PostCardSkeleton for consistency"
```
