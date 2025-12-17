# 🧪 TESTE DE NAVEGAÇÃO - REWARDS & MISSIONS

## ✅ Status: Servidor Rodando
- **URL Local**: http://localhost:5173/
- **URL Network**: http://191.252.179.192:5173/
- **Status**: ✅ VITE pronto sem erros

---

## 🎯 O QUE VOCÊ DEVE VER NO HEADER

### Desktop (após fazer login):

```
┌───────────────────────────────────────────────────────────────────────┐
│ [☰] B Bazari  Feed  Marketplace  [🎯 Missions]  Chat │ Search │ 🔥5  💰1.00 ZARI  🔔  👤│
│                                      ↑                           ↑         ↑            │
│                                   NOVA ABA                  WIDGETS NOVOS              │
└───────────────────────────────────────────────────────────────────────┘
```

**3 ELEMENTOS NOVOS**:

1. **Aba "Missions"** - Entre "Marketplace" e "Chat"
2. **Widget 🔥** - Mostra streak de dias (ex: 🔥 5)
3. **Widget 💰** - Mostra saldo ZARI (ex: 💰 1.00 ZARI)

---

## 📋 CHECKLIST DE TESTE

### 1️⃣ **Teste Visual Inicial**
- [ ] Acesse: http://localhost:5173/
- [ ] Faça login no sistema
- [ ] Procure no header pela aba **"Missions"**
- [ ] Procure pelos widgets **🔥** e **💰**

### 2️⃣ **Teste de Navegação - Aba Missions**
- [ ] Click na aba **"Missions"**
- [ ] Deve redirecionar para: `/app/rewards/missions`
- [ ] Deve mostrar a página **"Missões & Recompensas"**

### 3️⃣ **Teste de Navegação - Widget Streak (🔥)**
- [ ] Click no widget **🔥 5** (ou o número que aparecer)
- [ ] Deve redirecionar para: `/app/rewards/streaks`
- [ ] Deve mostrar a página **"Histórico de Sequências"** (calendário)

### 4️⃣ **Teste de Navegação - Widget ZARI (💰)**
- [ ] Click no widget **💰 1.00 ZARI** (ou o valor que aparecer)
- [ ] Deve redirecionar para: `/app/rewards/cashback`
- [ ] Deve mostrar a página **"Dashboard ZARI"**

### 5️⃣ **Teste Mobile**
- [ ] Abra o menu hamburguer **☰**
- [ ] Procure pela opção **"Missions"** na lista
- [ ] Click em **"Missions"**
- [ ] Deve redirecionar para `/app/rewards/missions`

---

## 🐛 SE NÃO APARECER

### Opção A: Testar Página Isolada
Acesse diretamente: **http://localhost:5173/app/test-rewards-header**

Esta página mostra APENAS os widgets isolados para testar se eles funcionam.

### Opção B: Verificar Console do Navegador
1. Abra DevTools (F12)
2. Vá para aba **Console**
3. Procure por erros em vermelho
4. **Copie e envie os erros para mim**

### Opção C: Verificar Network
1. Abra DevTools (F12)
2. Vá para aba **Network**
3. Recarregue a página (Ctrl+R)
4. Procure por requisições com **status 404** ou **500**
5. **Me informe quais arquivos estão falhando**

---

## 🔍 URLs PARA TESTAR DIRETAMENTE

Se o header não mostrar os links, teste acessando diretamente:

1. **Teste Widgets Isolados**:
   ```
   http://localhost:5173/app/test-rewards-header
   ```
   ☝️ **COMECE POR AQUI!** Se os widgets aparecerem aqui, mas não no header, é problema de import.

2. **Missions Hub**:
   ```
   http://localhost:5173/app/rewards/missions
   ```

3. **Streak History**:
   ```
   http://localhost:5173/app/rewards/streaks
   ```

4. **Cashback Dashboard**:
   ```
   http://localhost:5173/app/rewards/cashback
   ```

5. **Admin Panel** (se for admin):
   ```
   http://localhost:5173/app/admin/missions
   ```

---

## 📊 COMPORTAMENTO ESPERADO DOS WIDGETS

### Widget de Streak (🔥)
- **Se backend estiver rodando**: Mostra número real de dias
- **Se backend NÃO estiver rodando**: Mostra "0" ou skeleton de loading
- **Cor**: Laranja (orange-500)

### Widget de ZARI (💰)
- **Se backend estiver rodando**: Mostra saldo real (ex: 1.25 ZARI)
- **Se backend NÃO estiver rodando**: Mostra "0.00 ZARI" ou skeleton de loading
- **Cor**: Amarelo (yellow-600)

**⚠️ É NORMAL** os widgets mostrarem valores padrão (0) até que o backend seja implementado!

---

## 🎬 PRÓXIMOS PASSOS

### Se TUDO APARECEU: ✅
Ótimo! A navegação está funcionando. Agora:
1. Explore as páginas de missões
2. Teste os fluxos de interação
3. Aguarde implementação do backend para dados reais

### Se NÃO APARECEU: ❌
1. **Teste a página isolada** (`/app/test-rewards-header`) primeiro
2. **Copie os erros do console** do navegador
3. **Me envie os erros** para eu investigar
4. **Limpe o cache** do navegador (Ctrl+Shift+R)

---

## 📞 COMO REPORTAR PROBLEMAS

Se algo não funcionar, me envie:

```
1. O que você esperava ver:
   [descreva aqui]

2. O que você realmente viu:
   [descreva aqui]

3. Erros do console (se houver):
   [cole aqui]

4. URL que você estava acessando:
   [cole aqui]

5. Screenshot (se possível):
   [anexe aqui]
```

---

**🚀 Servidor Online**: http://localhost:5173/
**📅 Data**: 2025-11-14
**⏰ Status**: Aguardando seu teste!
