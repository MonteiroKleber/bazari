export const chatConfig = {
  wsUrl: import.meta.env.VITE_CHAT_WS_URL || "ws://localhost:8081",
  e2ee: import.meta.env.VITE_CHAT_E2EE_ENABLED !== "false",
  media: {
    maxMB: Number(import.meta.env.VITE_CHAT_MAX_MEDIA_MB || 50),
    accept: ["image/*", "video/*", "audio/*", "application/pdf"],
  },
  rateLimit: {
    dmsPerMinute: 20,
    mediaPerMinute: 5,
  },
  proposals: {
    allowCounterOffer: true,
    expiresHours: 48,
  },
  checkout: {
    currency: "BZR",
    showP2PShortcut: true,
  },
  commissions: {
    defaultPercent: 5,
    modes: ["open", "followers", "affiliates"] as const,
    defaultMode: "open" as const,
  },
} as const;
