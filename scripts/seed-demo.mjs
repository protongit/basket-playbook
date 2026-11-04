import { initDb, closeDb, getUserByEmail, createPlaybook, createPlay } from "../server/db.mjs";
import { buildDemoPlaybook } from "../server/seed.mjs";

const email = process.argv[2];
if (!email) {
  console.error("Uso: node scripts/seed-demo.mjs <email>");
  process.exit(1);
}
initDb();
const user = getUserByEmail(email);
if (!user) {
  console.error("No existe ningún usuario con ese email.");
  closeDb();
  process.exit(1);
}
const demo = buildDemoPlaybook();
const book = createPlaybook(user.id, demo);
for (const play of demo.plays) {
  createPlay(book.id, user.id, {
    chapterId: play.chapterId,
    title: play.title,
    callCode: play.callCode,
    category: play.category,
    subcategory: play.subcategory,
    court: play.court,
    meta: play.meta,
    frames: play.frames,
  });
}
console.log(`Playbook de ejemplo creado para ${email}: ${book.id}`);
closeDb();
