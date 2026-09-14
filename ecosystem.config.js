// PM2 configuration for deploying EduPulse on Ubuntu/Debian VPS
module.exports = {
  apps: [
    {
      name: "edupulse-lms",
      script: "server.js",
      instances: 1, // Single instance preserves in-memory WebSocket registry (or use Redis/Postgres pubsub for multi-instance)
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
