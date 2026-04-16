const fs = require('fs');
let file = 'src/features/client/dashboard/client-dashboard-page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/LayoutDashboard, /g, '');
fs.writeFileSync(file, content);
