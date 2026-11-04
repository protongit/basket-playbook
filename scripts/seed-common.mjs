import {
  initDb,
  closeDb,
  getUserByEmail,
  createPlaybook,
  createPlay,
  listPlaybooks,
} from "../server/db.mjs";
import { buildCommonPlaybook } from "../server/common-plays.mjs";

const email = process.argv[2] || "hensip@gmail.com";
const force = process.argv.includes("--force");

initDb();
const user = getUserByEmail(email);
if (!user) {
  console.error(`No existe ningún usuario con el email ${email}`);
  closeDb();
  process.exit(1);
}

const common = buildCommonPlaybook();
const exists = listPlaybooks(user.id).some((book) => book.title === common.title);
if (exists && !force) {
  console.log(`El playbook "${common.title}" ya existe para ${email}. Usa --force para duplicarlo.`);
  closeDb();
  process.exit(0);
}

const book = createPlaybook(user.id, common);
for (const play of common.plays) {
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
console.log(`Playbook "${book.title}" creado para ${email}: ${book.id} (${common.plays.length} jugadas)`);
closeDb();
