const fs = require('fs');
const path = require('path');

// Helper to load .env file into environment automatically
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

const defaultApiEnv = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PORT: process.env.API_PORT || '4000',
  PORT: process.env.API_PORT || '4000',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/klyro',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_klyro_jwt_key_dev_mode_only_123456789',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_klyro_jwt_refresh_key_dev_mode_only_987654321',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  DEV_OTP_ENABLED: process.env.DEV_OTP_ENABLED || 'true',
  DEFAULT_DEV_OTP: process.env.DEFAULT_DEV_OTP || '123456',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  KLYRO_BILLING_MODE: process.env.KLYRO_BILLING_MODE || 'development',
};

module.exports = {
  apps: [
    {
      name: 'klyro-api',
      script: 'node_modules/@nestjs/cli/bin/nest.js',
      args: 'start --watch',
      cwd: './apps/api',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: defaultApiEnv,
    },
    {
      name: 'klyro-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 3000',
      cwd: './apps/web',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
      },
    },
  ],
};
