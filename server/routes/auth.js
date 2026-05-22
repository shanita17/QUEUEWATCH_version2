// ─── routes/auth.js ───
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { poolPromise } = require("../db");
const nodemailer = require("nodemailer");

// ── HTTP Email Sender (Bypasses Render SMTP Block) ──
async function sendAppEmail(toEmail, toName, subject, htmlBody) {
  const apiKey = process.env.BREVO_API_KEY;
  
  // If no API key, just log it (development mode)
  if (!apiKey) {
    console.log(`\n [DEV MODE] Email to ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${htmlBody}\n`);
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: { name: "QueueWatch SA", email: "ethankokong@gmail.com" },
      to: [{ email: toEmail, name: toName }],
      subject: subject,
      htmlContent: htmlBody
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("HTTP Email API Error: " + errText);
  }
  console.log(" HTTP Email successfully sent to " + toEmail);
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
      const subject = "Welcome to QueueWatch SA!";
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #f5c518;">Welcome to QueueWatch SA! </h2>
          <p>Hi <b>${fullName}</b>,</p>
          <p>We're thrilled to have you join our community-driven effort to track queue wait times across South Africa.</p>
          <p>Start reporting queue times today and help out your community!</p>
          <br>
          <p>Cheers,<br><b>The QueueWatch Team</b></p>
        </div>
      `;
      await sendAppEmail(email, fullName, subject, htmlBody);
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
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const resetLink = `${protocol}://${req.get('host')}/reset.html?token=${token}`;

    // Send Reset Email asynchronously
    try {
      const subject = "Password Reset Request";
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #f5c518;">Password Reset Request</h2>
          <p>Hi <b>${user.FullName}</b>,</p>
          <p>You recently requested to reset your password for your QueueWatch SA account.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #f5c518; color: #111; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 10px 0;">Reset Password</a>
          <p>If you did not request this, you can safely ignore this email.</p>
          <br>
          <p>Cheers,<br><b>The QueueWatch Team</b></p>
        </div>
      `;
      await sendAppEmail(email, user.FullName, subject, htmlBody);
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

// ── PUT /auth/profile — update user profile information ──
router.put("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "You must be logged in to update your profile" });
  }

  const { fullName, email, newPassword } = req.body;
  const userId = req.session.user.UserID;

  if (!fullName || !email) {
    return res.status(400).json({ error: "Full Name and Email are required" });
  }

  try {
    const db = await poolPromise;

    // Check if email already exists for another user
    const existing = await db.get("SELECT UserID FROM Users WHERE Email = ? AND UserID != ?", [email, userId]);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    if (newPassword && newPassword.length > 0) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.run(
        "UPDATE Users SET FullName = ?, Email = ?, Password = ? WHERE UserID = ?",
        [fullName, email, hashedPassword, userId]
      );
    } else {
      await db.run(
        "UPDATE Users SET FullName = ?, Email = ? WHERE UserID = ?",
        [fullName, email, userId]
      );
    }

    // Update current session user
    req.session.user.FullName = fullName;
    req.session.user.Email = email;

    res.json({ message: "Profile updated successfully", user: req.session.user });
  } catch (err) {
    console.error("PUT /auth/profile error:", err.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ── POST /auth/contact — handle contact form submissions ──
router.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const adminEmail = process.env.SMTP_USER || "ethankokong@gmail.com";
    const mailSubject = `New Contact Form Submission: ${subject}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #f5c518; border-bottom: 2px solid #f5c518; padding-bottom: 10px;">New Support/Enquiry Message</h2>
        <p><b>From:</b> ${name} (&lt;${email}&gt;)</p>
        <p><b>Subject:</b> ${subject}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #f5c518; margin: 15px 0; white-space: pre-wrap;">${message}</div>
        <p style="font-size: 0.8rem; color: #888;">Submitted via QueueWatch SA contact form.</p>
      </div>
    `;

    // Send email using existing utility
    await sendAppEmail(adminEmail, "QueueWatch Admin", mailSubject, htmlBody);

    res.json({ message: "Message sent — we'll be in touch!" });
  } catch (err) {
    console.error("POST /auth/contact error:", err.message);
    res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
});

module.exports = router;
