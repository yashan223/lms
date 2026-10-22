module.exports = {
  apps: [
    {
      name: "edupulse-lms",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
        NEXT_PUBLIC_APP_URL: "https://pulseedu.online",
      },
    },
  ],
};
