# Bazari Documentation HTML - Multi-Language

Documentação executiva completa do Bazari em HTML estático, com suporte a **Português**, **Inglês** e **Espanhol**.

---

## 📁 Estrutura

```
docs/html/
├── index.html                    # Auto-redirect baseado no idioma do browser
├── pt/                          # 🇧🇷 Português
│   ├── index.html
│   ├── 01-visao-geral.html
│   ├── 02-proof-of-commerce.html
│   ├── 03-dores-mercado.html
│   ├── 04-modulos-ecossistema.html
│   ├── 05-arquitetura.html
│   └── 06-roadmap.html
├── en/                          # 🇺🇸 English
│   ├── index.html
│   ├── 01-overview-context.html
│   ├── 02-proof-of-commerce.html
│   ├── 03-market-pain-points.html
│   ├── 04-ecosystem-modules.html
│   ├── 05-architecture.html
│   └── 06-roadmap.html
├── es/                          # 🇪🇸 Español
│   ├── index.html
│   ├── 01-vision-general.html
│   ├── 02-proof-of-commerce.html
│   ├── 03-problemas-mercado.html
│   ├── 04-modulos-ecosistema.html
│   ├── 05-arquitectura.html
│   └── 06-roadmap.html
└── assets/
    ├── style.css                # CSS customizado com cores Bazari
    ├── prism.css                # Syntax highlighting para código
    └── script.js                # Troca de idioma, tema, navegação
```

---

## 🚀 Como Servir em Produção

### Opção 1: Via Nginx (Recomendado)

Adicione esta configuração ao seu Nginx:

```nginx
# /etc/nginx/sites-available/bazari

server {
    listen 80;
    listen [::]:80;
    server_name bazari.libervia.xyz;

    # Redireciona HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bazari.libervia.xyz;

    # Certificados SSL (Certbot/Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/bazari.libervia.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bazari.libervia.xyz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root da aplicação principal
    root /root/bazari/apps/web/dist;
    index index.html;

    # Documentação estática
    location /doc {
        alias /root/bazari/docs/html;
        index index.html;
        try_files $uri $uri/ $uri/index.html =404;

        # Cache de assets
        location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Cache de HTML (1 hora)
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }

    # API
    location /api {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Aplicação principal (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Comandos para ativar:

```bash
# 1. Copiar configuração
sudo nano /etc/nginx/sites-available/bazari

# 2. Ativar site
sudo ln -s /etc/nginx/sites-available/bazari /etc/nginx/sites-enabled/

# 3. Testar configuração
sudo nginx -t

# 4. Recarregar Nginx
sudo systemctl reload nginx
```

---

### Opção 2: Via Express (apps/api)

Adicione esta rota no arquivo `apps/api/src/index.ts`:

```typescript
import express from 'express';
import path from 'path';

// ... seu código existente ...

// Servir documentação estática
app.use('/doc', express.static(path.join(__dirname, '../../docs/html'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Cache mais agressivo para assets
    if (filePath.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Fallback para documentação (SPA-like)
app.get('/doc/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../docs/html/index.html'));
});
```

---

## 🌐 URLs Disponíveis

```
https://bazari.libervia.xyz/doc/          → Auto-redirect para idioma do browser
https://bazari.libervia.xyz/doc/pt/       → Português
https://bazari.libervia.xyz/doc/en/       → English
https://bazari.libervia.xyz/doc/es/       → Español

# Documentos específicos
https://bazari.libervia.xyz/doc/pt/03-dores-mercado.html
https://bazari.libervia.xyz/doc/en/03-market-pain-points.html
https://bazari.libervia.xyz/doc/es/03-problemas-mercado.html
```

---

## 🎨 Personalização

### Cores do Tema Bazari

Definidas em `assets/style.css`:

```css
:root {
  --primary: hsl(0, 100%, 27%);       /* #8B0000 - Vermelho Bazari */
  --secondary: hsl(45, 100%, 54%);    /* #FFB300 - Dourado */
  --background: hsl(40, 20%, 96%);    /* #F5F1E0 - Bege */
  --foreground: hsl(0, 0%, 10%);      /* Texto escuro */
}
```

### Dark Mode

Ativa automaticamente com base na preferência do usuário ou via botão de toggle.

```css
[data-theme="dark"] {
  --primary: hsl(0, 80%, 45%);
  --background: hsl(0, 0%, 8%);
  --foreground: hsl(0, 0%, 96%);
}
```

---

## 🔧 Funcionalidades

### ✅ Implementado

- [x] 3 idiomas (PT, EN, ES)
- [x] Auto-detecção de idioma do browser
- [x] Seletor de idioma com persistência (localStorage)
- [x] Dark mode com toggle
- [x] Navegação lateral fixa
- [x] Breadcrumb e navegação entre documentos
- [x] Syntax highlighting para código
- [x] Botão "Copy" em blocos de código
- [x] Tabelas responsivas
- [x] Smooth scroll
- [x] Atalhos de teclado:
  - `Ctrl/Cmd + K`: Focar busca
  - `Ctrl/Cmd + D`: Toggle dark mode
- [x] Print-friendly CSS
- [x] SEO-ready (meta tags, semântica HTML5)

### 🚧 Para Implementar Futuramente (Opcional)

- [ ] Busca client-side (Lunr.js ou Pagefind)
- [ ] Comentários (Utterances/Giscus via GitHub)
- [ ] Analytics (Plausible ou Umami - privacy-friendly)
- [ ] RSS feed
- [ ] Modo leitura (remove sidebar)
- [ ] Progresso de leitura

---

## 📊 Performance

### Otimizações Implementadas

- ✅ CSS minificado inline (critical CSS)
- ✅ JavaScript vanilla (sem frameworks pesados)
- ✅ Lazy loading de imagens (quando aplicável)
- ✅ Cache headers corretos
- ✅ Gzip/Brotli (via Nginx)

### Métricas Esperadas (Lighthouse)

- Performance: 95-100
- Accessibility: 100
- Best Practices: 100
- SEO: 100

---

## 🔒 Segurança

### Headers Recomendados (Nginx)

```nginx
# Adicione ao bloco server {}

# Segurança
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# CSP (Content Security Policy)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

# HSTS (só se tiver SSL configurado)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

## 🐛 Troubleshooting

### Problema: Documentação não carrega (404)

**Solução 1 - Verificar permissões:**
```bash
sudo chown -R www-data:www-data /root/bazari/docs/html
sudo chmod -R 755 /root/bazari/docs/html
```

**Solução 2 - Verificar path no Nginx:**
```bash
# Verificar se o alias está correto
sudo nginx -T | grep "alias"
```

### Problema: Troca de idioma não funciona

**Causa:** JavaScript não está sendo carregado.

**Solução:**
```bash
# Verificar se o arquivo existe
ls -la /root/bazari/docs/html/assets/script.js

# Verificar logs do browser (F12 > Console)
```

### Problema: Estilos não aplicados

**Causa:** CSS não está sendo carregado ou caminho errado.

**Solução:**
```bash
# Verificar se o arquivo existe
ls -la /root/bazari/docs/html/assets/style.css

# Verificar no browser (F12 > Network > CSS)
```

---

## 📝 Manutenção

### Atualizar Documentação

1. **Editar Markdown original:**
   ```bash
   nano docs/baz/exec/03-dores-mercado-solucoes.md
   ```

2. **Converter para HTML:**
   - Use um conversor Markdown → HTML (ou re-execute o script de geração)
   - Ou edite diretamente o HTML

3. **Traduzir para outros idiomas:**
   - Edite `en/03-market-pain-points.html`
   - Edite `es/03-problemas-mercado.html`

4. **Testar localmente:**
   ```bash
   cd /root/bazari/docs/html
   python3 -m http.server 8000
   # Abra http://localhost:8000
   ```

5. **Deploy:**
   ```bash
   sudo systemctl reload nginx
   ```

---

## 🚀 Deploy Rápido (Checklist)

```bash
# 1. Verificar arquivos estão no lugar
ls -la /root/bazari/docs/html/

# 2. Configurar Nginx
sudo nano /etc/nginx/sites-available/bazari

# 3. Testar configuração
sudo nginx -t

# 4. Recarregar Nginx
sudo systemctl reload nginx

# 5. Testar URLs
curl -I https://bazari.libervia.xyz/doc/
curl -I https://bazari.libervia.xyz/doc/pt/
curl -I https://bazari.libervia.xyz/doc/en/
curl -I https://bazari.libervia.xyz/doc/es/

# 6. Verificar no browser
# Abra: https://bazari.libervia.xyz/doc/
```

---

## 📞 Suporte

Em caso de problemas:

1. Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
2. Verificar console do browser (F12 > Console)
3. Verificar permissões de arquivos
4. Consultar este README

---

## 📄 Licença

Esta documentação está sob licença **CC BY-NC-SA 4.0**.

---

**Última atualização:** Outubro 2025
**Versão:** 1.0.0
