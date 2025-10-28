# 🤖 PROMPT PARA CLAUDE CODE - FASE 1

**Copie e cole este prompt para Claude Code executar a FASE 1**

---

```
Você é um desenvolvedor Substrate experiente trabalhando no projeto bazari-chain.

# TAREFA: Renomear moeda nativa UNIT → BZR

Leia COMPLETAMENTE a especificação em:
/root/bazari/docs/fase002-final/zari/spec/FASE-01-BZR-RENAME-BLOCKCHAIN.md

## CONTEXTO

A blockchain bazari-chain atualmente usa constantes genéricas UNIT/MILLI_UNIT/MICRO_UNIT do template Substrate. Precisamos renomear para BZR (Bazari Token) para refletir a identidade do projeto.

## O QUE FAZER

Execute OS 9 PASSOS descritos na especificação, NA ORDEM:

1. **Renomear constantes principais** em runtime/src/lib.rs
   - UNIT → BZR
   - MILLI_UNIT → MILLI_BZR
   - MICRO_UNIT → MICRO_BZR
   - Adicionar TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DECIMALS
   - Adicionar aliases deprecated para compatibilidade

2. **Atualizar imports** em runtime/src/configs/mod.rs
   - Imports de constantes
   - Valores de deposits (UniquesCollectionDeposit, etc)

3. **Bump runtime version** em runtime/src/lib.rs
   - spec_version: 100 → 101
   - spec_name: "solochain-template-runtime" → "bazari-runtime"

4. **Atualizar chain spec** em node/src/chain_spec.rs
   - Adicionar properties: tokenSymbol, tokenName, tokenDecimals
   - development_config() e local_testnet_config()

5. **Atualizar comments** em runtime/src/genesis_config_presets.rs
   - Adicionar comentário sobre initial balance em BZR

6. **Compilar**
   ```bash
   cd /root/bazari-chain
   cargo clean
   cargo build --release
   ```

7. **Rodar testes**
   ```bash
   cargo test
   ```
   Se falharem, corrigir assertions nos testes

8. **Testar node local**
   ```bash
   ./target/release/solochain-template-node --dev --tmp
   ```
   Deixar rodando em background

9. **Validar com Polkadot.js Apps**
   - Conectar em ws://127.0.0.1:9944
   - Verificar metadata mostra "BZR"
   - Fazer transação de teste

## REGRAS IMPORTANTES

1. **NÃO QUEBRAR FUNCIONALIDADE EXISTENTE**
   - Adicionar aliases deprecated (UNIT = BZR)
   - Manter valores numéricos idênticos
   - Só renomear, não mudar lógica

2. **SEGUIR PADRÕES DO PROJETO**
   - Manter estilo de código existente
   - Usar mesmas convenções de naming
   - Comments em inglês

3. **VALIDAR CADA PASSO**
   - Compilar após cada mudança significativa
   - Se der erro, reverter e tentar novamente
   - Não prosseguir se testes falharem

4. **BUSCAR TODAS REFERÊNCIAS**
   - Usar grep/ripgrep para encontrar UNIT/MILLI_UNIT/MICRO_UNIT
   - Verificar pallets customizados também
   - Não deixar nenhum "UNIT" hardcoded

## CRITÉRIOS DE SUCESSO

Ao final, os seguintes comandos devem executar SEM ERROS:

```bash
cd /root/bazari-chain

# 1. Compila
cargo build --release

# 2. Testes passam
cargo test

# 3. Node inicia
./target/release/solochain-template-node --dev --tmp
```

E Polkadot.js Apps deve mostrar:
- tokenSymbol: "BZR"
- tokenDecimals: 12
- Balances em BZR não UNIT

## ARQUIVOS A MODIFICAR

Estes são OS ÚNICOS arquivos que devem ser modificados nesta fase:

1. /root/bazari-chain/runtime/src/lib.rs
2. /root/bazari-chain/runtime/src/configs/mod.rs
3. /root/bazari-chain/runtime/src/genesis_config_presets.rs
4. /root/bazari-chain/node/src/chain_spec.rs
5. Possível: arquivos de teste em runtime/src/tests/ (se falharem)
6. Possível: pallets customizados (stores, bazari-identity, universal-registry) se usarem UNIT

**NÃO modificar:**
- Backend (/root/bazari/apps/api) - será FASE 2
- Frontend (/root/bazari/apps/web) - será FASE 2
- Documentação .md (exceto se encontrar UNIT em README)

## TROUBLESHOOTING

Se encontrar erros:

**Erro: "cannot find value UNIT"**
→ Faltou atualizar import. Buscar: `grep -r "use crate::" runtime/src/configs/`

**Erro: Tests failing**
→ Atualizar assertions: `UNIT` → `BZR` nos testes

**Erro: Node panic ao iniciar**
→ Deletar database: `rm -rf ~/.local/share/solochain-template-node/chains/dev/db/`

**Polkadot.js mostra "Unit" não "BZR"**
→ Verificar properties foram adicionadas em chain_spec.rs

## ENTREGA

Ao completar:

1. **Confirmar** que todos critérios de sucesso foram atingidos
2. **Listar** os arquivos modificados
3. **Reportar** quaisquer problemas encontrados e como resolveu
4. **Tempo gasto** vs 2 semanas estimadas
5. **Pronto para FASE 2?** Sim/Não com justificativa

## PERGUNTA ANTES DE COMEÇAR

Confirme que entendeu a tarefa respondendo:
- Qual é o objetivo principal? (renomear UNIT → BZR)
- Quantos arquivos serão modificados? (~5-8)
- Qual o passo mais crítico? (Bump runtime version)
- Como validar sucesso? (Compilar + testes + Polkadot.js Apps)

Após confirmar, execute PASSO-A-PASSO conforme especificação.

BOA SORTE! 🚀
```

---

**Instruções de uso:**

1. Abra Claude Code
2. Navegue até /root/bazari-chain
3. Cole o prompt acima
4. Aguarde execução completa
5. Valide critérios de sucesso
6. Se tudo OK, prosseguir para FASE 2

---

*Prompt criado em: 27/Out/2025*
