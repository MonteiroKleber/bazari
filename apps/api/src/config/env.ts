// Adicionar ao env existente
export const chatConfig = {
  wsPort: Number(process.env.CHAT_WS_PORT ?? 8081),
  wsMaxConn: Number(process.env.CHAT_WS_MAX_CONN ?? 5000),
  rateLimitRpm: Number(process.env.CHAT_RATE_LIMIT_RPM ?? 120),
  maxMediaMb: Number(process.env.CHAT_MAX_MEDIA_MB ?? 50),
  commissionMaxPercent: Number(process.env.CHAT_COMMISSION_MAX_PERCENT ?? 20),
  ipfsApiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080/ipfs/',
  ipfsTimeoutMs: Number(process.env.IPFS_TIMEOUT_MS ?? 10000),
  aiGatewayUrl: process.env.AI_GATEWAY_URL,
  chainWs: process.env.BAZARICHAIN_WS || 'ws://localhost:9944',
  treasuryAddr: process.env.TREASURY_ADDR || '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  bazariFeesBps: Number(process.env.BAZARI_FEE_BPS ?? 100),
};
