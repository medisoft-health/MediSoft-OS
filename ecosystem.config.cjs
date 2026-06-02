const fs = require('fs');
const path = require('path');
// Parse .env.local
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) return;
  const key = line.substring(0, eqIdx).trim();
  let val = line.substring(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
});
module.exports = {
  apps: [{
    name: 'medisoft',
    script: '.next/standalone/server.js',
    cwd: __dirname,
    env: env,
    node_args: '--max-old-space-size=3072',
  }]
};
