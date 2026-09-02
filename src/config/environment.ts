const required = (key: string): string => {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val ?? '';
};

export const env = {
  geminiApiKey: required('GEMINI_API_KEY'),
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9002',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
