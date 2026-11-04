import fs from "node:fs";
import path from "node:path";
import { config } from "../server/config.mjs";
import { initDb, closeDb, getDbHandle } from "../server/db.mjs";

initDb();
const dir = process.env.BACKUP_DIR || path.join(config.root, "backups");
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(dir, `basket-playbook-${stamp}.db`);
const db = getDbHandle();
try {
  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
} catch {}
fs.copyFileSync(config.dbPath, target);
console.log(`Backup creado: ${target}`);
closeDb();
