const fs = require('fs');
let file = 'src/features/auth/login-page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /setErrorMsg\(\(error as any\)\.response\?\.data\?\.message \|\| 'Identifiants incorrects\.'\);/,
  "setErrorMsg((error as any).response?.data?.message || (error as any).message || 'Erreur de connexion.');\n      console.error('Login error:', error);"
);
fs.writeFileSync(file, content);
