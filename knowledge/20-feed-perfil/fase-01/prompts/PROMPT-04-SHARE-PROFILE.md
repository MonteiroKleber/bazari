# Prompt: Implementar Compartilhar Perfil

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

Adicionar botao de compartilhar que usa Web Share API (mobile) ou copia para clipboard (desktop).

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-01/04-SHARE-PROFILE.md`

## Ordem de Implementacao

### Etapa 1: Criar Componente ShareButton

Criar `apps/web/src/components/ui/ShareButton.tsx`:

```typescript
interface ShareButtonProps {
  title: string;      // Titulo para Web Share
  text: string;       // Texto descritivo
  url: string;        // URL a compartilhar
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
}
```

Logica:
1. Verificar se `navigator.share` existe
2. Se sim: Usar Web Share API
3. Se nao: Fallback para `navigator.clipboard.writeText()`
4. Mostrar toast de sucesso/erro
5. Mudar icone para Check apos copiar (por 2 segundos)

### Etapa 2: Integrar em ProfilePublicPage

Modificar `apps/web/src/pages/ProfilePublicPage.tsx`:

Adicionar no header, ao lado do botao "Editar Perfil" ou entre os controles:

```tsx
<ShareButton
  title={`${p.displayName} no Bazari`}
  text={`Confira o perfil de @${p.handle} no Bazari`}
  url={window.location.href}
  variant="ghost"
  size="icon"
/>
```

O botao deve aparecer SEMPRE, independente de estar logado ou ser proprio perfil.

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/ui/ShareButton.tsx`

### Modificar
- [ ] `apps/web/src/pages/ProfilePublicPage.tsx`

## Cenarios de Teste

1. [ ] Web Share API funciona em mobile (Android/iOS)
2. [ ] Fallback copia URL para clipboard em desktop
3. [ ] Toast "Link copiado!" aparece no fallback
4. [ ] Icone muda para Check temporariamente
5. [ ] URL compartilhada esta correta
6. [ ] Funciona em dark mode
7. [ ] Usuario pode cancelar share sem erro

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(profile): add share profile button

- Create ShareButton component with Web Share API
- Fallback to clipboard copy on desktop
- Show toast feedback on copy
- Add share button to profile header"
```
