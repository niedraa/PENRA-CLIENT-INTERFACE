const fs = require('fs');
let file = 'backend/server.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/app\.use\(cors\(\{ origin: process\.env\.CORS_ORIGIN || true, credentials: false \}\)\)/, "app.use(cors({ origin: '*', credentials: false }))");
fs.writeFileSync(file, content);
