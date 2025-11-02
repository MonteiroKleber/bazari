# Media Module - Vision & Purpose

## 🎯 Vision
**"Prover armazenamento seguro, escalável e eficiente de mídia para todos os módulos da plataforma Bazari."**

## 📋 Purpose
1. **Upload** - Receber e armazenar imagens, vídeos, documentos
2. **Storage** - LocalFS (dev) ou S3 (production)
3. **Deduplication** - Content hashing (SHA-256) para evitar duplicatas
4. **Delivery** - URLs públicas ou assinadas
5. **Optimization** - Resize, compress, format conversion (future)

## 🌟 Key Principles
- **Pluggable Storage** - LocalFS ou S3 via adapter pattern
- **Content Addressing** - Hash-based deduplication
- **Security** - Owner-based access control
- **IPFS-Ready** - Migration path to IPFS

## 🏗️ Architecture
```
Client → Upload → API → StorageAdapter
                           ├─> LocalFsStorage
                           └─> S3Storage
```

## 📊 Supported Formats
- **Images**: JPG, PNG, WebP, GIF (max 10MB)
- **Videos**: MP4, WebM (max 100MB)
- **Documents**: PDF (max 20MB)

## 🔮 Future Features
1. **IPFS Integration** - Decentralized storage
2. **Image Optimization** - Auto resize/compress
3. **CDN Integration** - Cloudflare/AWS CloudFront
4. **Video Transcoding** - Multiple quality levels

**Status:** ✅ Implemented & Production-Ready
