const bcrypt = require("bcryptjs");
require("dotenv").config();

const password = process.env.SUPER_ADMIN_PASSWORD;

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log("Hashed password:", hash);
});
