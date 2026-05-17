// ─── routes/auth.js ───
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { poolPromise } = require("../db");
const nodemailer = require("nodemailer");

async function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    let testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
}
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
    const db = await poolPromise;

    // Check if email already exists
    const existing = await db.get("SELECT UserID FROM Users WHERE Email = ?", [email]);

    if (existing)
      return res
        .status(400)
        .json({ error: "An account with this email already exists" });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.run(`
      INSERT INTO Users (FullName, Email, Password, Role)
      VALUES (?, ?, ?, ?)
    `, [fullName, email, hashedPassword, "user"]);

    // Fetch the newly created user
    const user = await db.get("SELECT UserID, FullName, Email, Role FROM Users WHERE UserID = ?", [result.lastID]);

    // Start session
    req.session.user = user;

    res.json({ message: "Account created successfully", user });

    // Send Welcome Email asynchronously
    try {
      let transporter = await getTransporter();

      let info = await transporter.sendMail({
        from: '"QueueWatch SA" <noreply@queuewatch.co.za>',
        to: email,
        subject: "Welcome to QueueWatch SA!",
        text: `Hi ${fullName},\n\nWelcome to QueueWatch SA! We're thrilled to have you join our community-driven effort to track queue wait times across South Africa.\n\nStart reporting queue times today and help out your community!\n\nCheers,\nThe QueueWatch Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #f5c518;">Welcome to QueueWatch SA! 🇿🇦</h2>
            <p>Hi <b>${fullName}</b>,</p>
            <p>We're thrilled to have you join our community-driven effort to track queue wait times across South Africa.</p>
            <p>Start reporting queue times today and help out your community!</p>
            <br>
            <p>Cheers,<br><b>The QueueWatch Team</b></p>
          </div>
        `,
      });
      console.log("✉️ Welcome email sent to " + email);
      if (!process.env.SMTP_USER) {
        console.log("🔗 Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
    }
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
    const db = await poolPromise;
    const user = await db.get("SELECT * FROM Users WHERE Email = ?", [email]);

    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

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

// ── POST /auth/forgot-password ──
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const db = await poolPromise;
    const user = await db.get("SELECT * FROM Users WHERE Email = ?", [email]);

    if (!user) {
      // For security, we still return success even if user isn't found
      return res.json({ message: "If that email exists, a reset link was sent." });
    }

    // Generate a simple base64 token of the email for prototype purposes
    const token = Buffer.from(email).toString('base64');
    const resetLink = `http://localhost:3000/reset.html?token=${token}`;

    // Send Reset Email asynchronously
    try {
      let transporter = await getTransporter();

      let info = await transporter.sendMail({
        from: '"QueueWatch SA Support" <support@queuewatch.co.za>',
        to: email,
        subject: "Password Reset Request",
        text: `Hi ${user.FullName},\n\nYou requested a password reset. Click here to reset your password: ${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\nCheers,\nThe QueueWatch Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #f5c518;">Password Reset Request</h2>
            <p>Hi <b>${user.FullName}</b>,</p>
            <p>You recently requested to reset your password for your QueueWatch SA account.</p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #f5c518; color: #111; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 10px 0;">Reset Password</a>
            <p>If you did not request this, you can safely ignore this email.</p>
            <br>
            <p>Cheers,<br><b>The QueueWatch Team</b></p>
          </div>
        `,
      });
      console.log("✉️ Password reset email sent to " + email);
      if (!process.env.SMTP_USER) {
        console.log("🔗 Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr);
    }

    res.json({ message: "If that email exists, a reset link was sent." });
  } catch (err) {
    console.error("POST /auth/forgot-password error:", err.message);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// ── POST /auth/reset-password ──
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Missing token or password" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const email = Buffer.from(token, 'base64').toString('ascii');
    const db = await poolPromise;
    const user = await db.get("SELECT * FROM Users WHERE Email = ?", [email]);
    
    if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

    // Hash the new password and update the database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE Users SET Password = ? WHERE Email = ?", [hashedPassword, email]);
    
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("POST /auth/reset-password error:", err.message);
    res.status(500).json({ error: "Failed to reset password" });
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
