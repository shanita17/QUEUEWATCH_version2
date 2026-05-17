// ─── routes/auth.js ───
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { sql, poolPromise } = require("../db");

// ── POST /auth/register ──
router.post("/register", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });

  try {
    const pool = await poolPromise;

    // Check if email already exists
    const existing = await pool
      .request()
      .input("email", sql.NVarChar(150), email)
      .query("SELECT UserID FROM Users WHERE Email = @email");

    if (existing.recordset.length > 0)
      return res
        .status(400)
        .json({ error: "An account with this email already exists" });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool
      .request()
      .input("fullName", sql.NVarChar(100), fullName)
      .input("email", sql.NVarChar(150), email)
      .input("password", sql.NVarChar(255), hashedPassword)
      .input("role", sql.NVarChar(20), "user").query(`
        INSERT INTO Users (FullName, Email, Password, Role)
        OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role
        VALUES (@fullName, @email, @password, @role)
      `);

    const user = result.recordset[0];

    // Start session
    req.session.user = user;

    res.json({ message: "Account created successfully", user });
  } catch (err) {
    console.error("POST /auth/register error:", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ── POST /auth/login ──
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("email", sql.NVarChar(150), email)
      .query("SELECT * FROM Users WHERE Email = @email");

    if (result.recordset.length === 0)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = result.recordset[0];

    // Compare password — handle both hashed and plain (for seed data)
    let passwordMatch = false;
    if (user.Password.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, user.Password);
    } else {
      passwordMatch = password === user.Password;
    }

    if (!passwordMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    // Save user to session (never save password)
    req.session.user = {
      UserID: user.UserID,
      FullName: user.FullName,
      Email: user.Email,
      Role: user.Role,
    };

    res.json({ message: "Logged in successfully", user: req.session.user });
  } catch (err) {
    console.error("POST /auth/login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── POST /auth/logout ──
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ message: "Logged out successfully" });
  });
});

// ── GET /auth/me — check who is logged in ──
router.get("/me", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Not logged in" });
  res.json({ user: req.session.user });
});

module.exports = router;
