const ensureEnv = (key: string, fallback: string) => {
  if (!process.env[key]) {
    process.env[key] = fallback;
  }
};

ensureEnv('JWT_SECRET', 'test-secret-value-should-be-long-1234567890');
ensureEnv('AUTH_DOMAIN', 'auth.localhost');
ensureEnv('AUTH_URI', 'https://auth.localhost/login');
ensureEnv('BAZARICHAIN_GENESIS_HASH', '0x1234567890abcdef');
