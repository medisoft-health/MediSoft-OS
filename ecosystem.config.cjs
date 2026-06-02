module.exports = {
  apps: [
    {
      name: "medisoft-cos",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      watch: false,
      autorestart: true,
    },
  ],
};
