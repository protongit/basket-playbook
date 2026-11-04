import { initDb, closeDb, getUserByEmail, createUser } from "../server/db.mjs";
import { hashPassword } from "../server/auth.mjs";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
  console.error("Uso: node scripts/create-user.mjs <email> <nombre> <contraseña>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

initDb();
if (getUserByEmail(email)) {
  console.error("Ya existe un usuario con ese email.");
  closeDb();
  process.exit(1);
}
const { salt, hash } = await hashPassword(password);
const user = createUser({ email, name, passwordHash: hash, passwordSalt: salt });
console.log(`Usuario creado: ${user.email} (${user.id})`);
closeDb();
