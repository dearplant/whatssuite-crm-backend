// PM2 Ecosystem Configuration
// For production deployment with process management

module.exports = {
  apps: [
    {
      name: 'whatsapp-crm-backend',
      script: './src/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000,
      },
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Auto restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'sessions', 'uploads'],
      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      // Instance variables for Socket.io sticky sessions
      instance_var: 'INSTANCE_ID',
    },
    {
      name: 'whatsapp-crm-workers',
      script: './src/workers/index.js',
      instances: 2, // Run 2 worker instances
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        WORKER_MODE: 'true',
      },
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      kill_timeout: 30000, // Longer timeout for workers to finish jobs
      listen_timeout: 3000,
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server-1', 'production-server-2'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/whatsapp-crm-backend.git',
      path: '/opt/whatsapp-crm-backend',
      'post-deploy':
        'npm install && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git',
    },
    staging: {
      user: 'deploy',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/whatsapp-crm-backend.git',
      path: '/opt/whatsapp-crm-backend-staging',
      'post-deploy':
        'npm install && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
