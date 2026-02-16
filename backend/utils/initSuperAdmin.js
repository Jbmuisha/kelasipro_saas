
const db = require("../config/db");
require("dotenv").config();

async function createSuperAdmin() {
  const [rows] = await db.query("SELECT * FROM users WHERE role = 'SUPER_ADMIN'");
  if (rows.length === 0) {
    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [
        process.env.SUPER_ADMIN_NAME,
        process.env.SUPER_ADMIN_EMAIL,
        process.env.SUPER_ADMIN_PASSWORD_HASH,
        "SUPER_ADMIN"
      ]
    );
    console.log("Super Admin created!");
  } else {
    console.log("Super Admin already exists.");
  }
}

module.exports = createSuperAdmin;
