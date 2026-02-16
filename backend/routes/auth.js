const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email et mot de passe requis" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[LOGIN FAILED] Incorrect password for user: ${email}`);
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, school_id: user.school_id || null },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log(`[LOGIN SUCCESS] User logged in: ${email}`);

    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        school_id: user.school_id || null
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
