// ─── server.js — QueueWatch SA Backend ───
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

const app = express();

// ── Middleware ──
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Sessions ──
app.use(
  session({
    secret: process.env.SESSION_SECRET || "queuewatch_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

// ── Serve frontend files ──
app.use(express.static(path.join(__dirname, "..")));

// ── API Routes ──
app.use("/api/branches", require("./routes/branches"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/auth", require("./routes/auth"));

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "QueueWatch SA API is running",
    time: new Date().toISOString(),
  });
});

// ── 404 for unknown API routes ──
app.use("/api/*path", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// ── Start server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 QueueWatch SA server running at http://localhost:${PORT}`);
  console.log(`📂 Serving frontend from: ${path.join(__dirname, "..")}`);
  console.log(`🔗 API available at: http://localhost:${PORT}/api`);
});
