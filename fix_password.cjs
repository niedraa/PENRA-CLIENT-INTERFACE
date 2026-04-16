const betterSqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = betterSqlite3('backend/penra.sqlite');

async function fix() {
  const hash = await bcrypt.hash('admin123', 10);
  const info = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'admin@penra.fr');
  const info2 = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'client@penra.fr');
  console.log('Admin & Client passwords reset.', info, info2);
}

fix().catch(console.error);
