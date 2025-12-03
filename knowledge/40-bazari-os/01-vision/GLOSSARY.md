# BazariOS - Glossário

**Versão:** 1.0.0
**Data:** 2024-12-03

---

## Termos do BazariOS

### A

**App**
Unidade modular de funcionalidade no BazariOS. Cada app tem seu próprio manifest, permissões, e pode ser instalado/desinstalado pelo usuário.

**App Container**
Componente React que envolve cada app, fornecendo error boundary, loading states, e validação de permissões.

**App Hub**
Página principal do dashboard onde o usuário vê seus apps instalados e pode acessá-los.

**App Registry**
Singleton que mantém o registro de todos os apps disponíveis na plataforma.

**App Store**
Interface onde usuários descobrem, buscam, e instalam novos apps.

### B

**BazariApp**
Interface TypeScript que define a estrutura de um app no sistema.

**Bridge**
Camada de comunicação entre apps de terceiros (iframe) e o host via postMessage.

### C

**Category**
Classificação de apps: finance, social, commerce, tools, governance, entertainment.

**Code Splitting**
Técnica onde cada app é um bundle separado, carregado sob demanda via React.lazy().

**Core Services**
Serviços fundamentais disponíveis para todos os apps: Auth, API Client, Blockchain, Storage.

### D

**Developer Portal**
Interface web onde desenvolvedores gerenciam seus apps, veem analytics, e fazem publicações.

### E

**Entry Point**
Rota principal de um app. Ex: `/app/wallet` para o app Wallet.

### F

**Featured App**
App destacado na App Store, geralmente na seção inicial.

### G

**Granted Permissions**
Permissões que o usuário concedeu a um app específico.

### I

**Installed Apps**
Lista de apps que o usuário escolheu ter em seu dashboard.

### L

**Lazy Loading**
Carregamento sob demanda de apps, apenas quando acessados.

### M

**Manifest**
Arquivo de configuração de um app contendo metadados, permissões, assets, etc.

### N

**Native App**
App desenvolvido pela equipe Bazari, integrado diretamente ao código (não sandboxed).

### P

**Permission**
Capacidade específica que um app pode solicitar (ex: `wallet.balance.read`).

**Permission Level**
Classificação de risco de uma permissão: low, medium, high, critical.

**Pinned App**
App fixado no topo do dashboard pelo usuário.

**Platform Layer**
Camada de código que gerencia apps, permissões, registry, e preferências.

### R

**Registry**
Ver App Registry.

**Required Role**
Papel que o usuário precisa ter para usar um app (ex: `seller`, `dao_member`).

**Revenue Share**
Divisão de receita entre desenvolvedores e Bazari para apps pagos.

### S

**Sandbox**
Ambiente isolado (iframe) onde apps de terceiros executam.

**SDK**
Software Development Kit - pacote npm que desenvolvedores usam para criar apps.

**Status**
Estado de um app: stable, beta, alpha, deprecated.

**Store** (Zustand)
Estado global gerenciado por Zustand para preferências e apps instalados.

### T

**Third-party App**
App desenvolvido por terceiros, executado em sandbox com permissões limitadas.

### U

**User Apps Store**
Store Zustand que mantém estado dos apps instalados e preferências do usuário.

### V

**Verified App**
App de terceiro que passou por auditoria completa da equipe Bazari.

---

## Permissões

| ID | Nome | Descrição |
|----|------|-----------|
| `user.profile.read` | Ler perfil | Ver nome, avatar, handle |
| `user.profile.write` | Editar perfil | Modificar informações do perfil |
| `wallet.balance.read` | Ver saldo | Consultar saldo de tokens |
| `wallet.history.read` | Ver histórico | Acessar transações passadas |
| `wallet.transfer.request` | Solicitar pagamento | Pedir autorização para transferir |
| `products.read` | Ver produtos | Listar produtos e lojas |
| `products.write` | Gerenciar produtos | Criar e editar produtos |
| `orders.read` | Ver pedidos | Acessar histórico de pedidos |
| `orders.write` | Gerenciar pedidos | Criar e atualizar pedidos |
| `feed.read` | Ler feed | Ver posts e interações |
| `feed.write` | Postar | Criar posts em nome do usuário |
| `messages.read` | Ler mensagens | Acessar conversas |
| `messages.write` | Enviar mensagens | Enviar mensagens |
| `notifications.send` | Notificações | Enviar push notifications |
| `storage.app` | Armazenamento | Salvar dados do app |
| `camera` | Câmera | Acessar câmera do dispositivo |
| `location` | Localização | Acessar GPS |
| `blockchain.read` | Ler blockchain | Consultar dados on-chain |
| `blockchain.sign` | Assinar transações | Solicitar assinatura |

---

## Categorias de Apps

| Categoria | Código | Ícone | Descrição |
|-----------|--------|-------|-----------|
| Finanças | `finance` | 💰 | Wallet, P2P, Vesting, Staking |
| Social | `social` | 💬 | Feed, Chat, Descobrir |
| Comércio | `commerce` | 🛒 | Marketplace, Lojas, Pedidos |
| Ferramentas | `tools` | 🛠️ | Analytics, Delivery, Admin |
| Governança | `governance` | 🗳️ | Propostas, Votação, Treasury |
| Entretenimento | `entertainment` | 🎮 | VR, Missões, Games |

---

## Status de Apps

| Status | Badge | Descrição |
|--------|-------|-----------|
| `stable` | - | Produção, estável |
| `beta` | BETA | Em testes públicos |
| `alpha` | ALPHA | Em desenvolvimento |
| `deprecated` | DEPRECATED | Será descontinuado |

---

## Roles de Usuário

| Role | Código | Descrição |
|------|--------|-----------|
| Usuário | `user` | Qualquer usuário autenticado |
| Vendedor | `seller` | Usuário com loja ativa |
| Membro DAO | `dao_member` | Participante da governança |
| Entregador | `delivery` | Perfil de entrega ativo |
| Admin | `admin` | Administrador do sistema |

---

## Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| `platform/types/app.types.ts` | Definições de tipos de apps |
| `platform/types/permission.types.ts` | Definições de permissões |
| `platform/registry/app-registry.ts` | Registry singleton |
| `platform/registry/native-apps.ts` | Registro dos apps nativos |
| `platform/store/user-apps.store.ts` | Store Zustand |
| `platform/hooks/useApps.ts` | Hook principal |
| `apps/[app]/manifest.ts` | Manifest de cada app |

---

**Mantido por:** Claude Code
**Data:** 2024-12-03
