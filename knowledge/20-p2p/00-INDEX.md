# P2P Module - UX Redesign

Especificacao completa para redesign do modulo P2P do Bazari.

## Documentos

| Arquivo | Descricao |
|---------|-----------|
| [01-ANALISE-ATUAL.md](./01-ANALISE-ATUAL.md) | Analise dos problemas da UX atual |
| [02-NOVA-UX-SPEC.md](./02-NOVA-UX-SPEC.md) | Especificacao da nova UX |
| [03-COMPONENTES.md](./03-COMPONENTES.md) | Novos componentes a criar |
| [04-IMPLEMENTACAO.md](./04-IMPLEMENTACAO.md) | Plano de implementacao |
| [prompts/](./prompts/) | Prompts para Claude Code |

## Resumo

O modulo P2P permite negociacao peer-to-peer de BZR e ZARI via PIX. O redesign foca em:

1. **Simplicidade** - Menos opcoes visiveis, wizard guiado
2. **Mobile-first** - Layout responsivo otimizado
3. **Comunicacao** - Chat mais proeminente
4. **Feedback** - Estados visuais claros

## Paginas do Modulo

```
/app/p2p                    → P2PHomePage (listagem de ofertas)
/app/p2p/offers/new         → P2POfferNewPage (criar oferta)
/app/p2p/offers/:id         → P2POfferPublicPage (ver oferta)
/app/p2p/orders/:id         → P2POrderRoomPage (sala de negociacao)
/app/p2p/my-orders          → P2PMyOrdersPage (minhas ordens)
/app/p2p/zari/stats         → ZARIStatsPage (estatisticas ZARI)
```

## Status

- [x] Analise da UX atual
- [x] Especificacao da nova UX
- [x] Componentes necessarios
- [x] Prompts de implementacao
- [ ] Implementacao Phase 1 (HomePage)
- [ ] Implementacao Phase 2 (OfferNewPage)
- [ ] Implementacao Phase 3 (OrderRoomPage)
- [ ] Implementacao Phase 4 (Componentes)
