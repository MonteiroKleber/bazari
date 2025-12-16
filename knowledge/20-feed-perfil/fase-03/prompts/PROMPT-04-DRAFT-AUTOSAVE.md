# Prompt: Implementar Draft Auto-save

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

Salvar automaticamente rascunho do post em localStorage.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-03/04-DRAFT-AUTOSAVE.md`

## Ordem de Implementacao

### Etapa 1: Hook useDraftPost

Criar `apps/web/src/hooks/useDraftPost.ts`:

```typescript
interface PostDraft {
  content: string;
  kind: 'text' | 'poll';
  pollOptions?: string[];
  pollDuration?: string;
  savedAt: number;
}

interface UseDraftPostReturn {
  hasDraft: boolean;
  draft: PostDraft | null;
  lastSaved: Date | null;
  saveDraft: (data: Omit<PostDraft, 'savedAt'>) => void;
  clearDraft: () => void;
  getDraft: () => PostDraft | null;
}
```

Funcionalidades:
- Carregar de localStorage ao montar
- Verificar expiracao (24 horas)
- Salvar com debounce de 3 segundos
- Limpar rascunhos vazios

Storage key: `bazari:post-draft`

### Etapa 2: Componente DraftRecoveryDialog

Criar `apps/web/src/components/social/DraftRecoveryDialog.tsx`:

AlertDialog com:
- Titulo: "Rascunho encontrado"
- Preview do conteudo (truncado)
- Tempo desde salvamento
- Botoes: "Descartar" / "Recuperar"

### Etapa 3: Componente DraftSaveIndicator

Criar `apps/web/src/components/social/DraftSaveIndicator.tsx`:

Indicador pequeno mostrando:
- Icone Check + "Rascunho salvo"
- Aparece brevemente apos save

### Etapa 4: Integrar em CreatePostModal

Modificar `apps/web/src/components/social/CreatePostModal.tsx`:

1. Importar hook e componentes
2. Verificar rascunho ao abrir modal
3. Mostrar dialog de recuperacao se houver
4. Auto-save quando conteudo muda (useEffect)
5. Limpar rascunho apos publicar com sucesso
6. Mostrar indicador de salvamento no header

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/hooks/useDraftPost.ts`
- [ ] `apps/web/src/components/social/DraftRecoveryDialog.tsx`
- [ ] `apps/web/src/components/social/DraftSaveIndicator.tsx`

### Modificar
- [ ] `apps/web/src/components/social/CreatePostModal.tsx`

## Cenarios de Teste

1. [ ] Rascunho salva automaticamente apos 3s de inatividade
2. [ ] Ao reabrir modal, dialog pergunta se quer recuperar
3. [ ] "Recuperar" restaura conteudo e opcoes de enquete
4. [ ] "Descartar" limpa rascunho
5. [ ] Rascunho limpo apos publicar com sucesso
6. [ ] Indicador "Rascunho salvo" aparece
7. [ ] Rascunhos > 24 horas sao descartados
8. [ ] Conteudo vazio nao salva rascunho

## Commit

```bash
git add .
git commit -m "feat(posts): add draft auto-save to CreatePostModal

- Create useDraftPost hook with localStorage persistence
- Create DraftRecoveryDialog for restoring drafts
- Create DraftSaveIndicator for visual feedback
- Auto-save every 3 seconds with debounce"
```
