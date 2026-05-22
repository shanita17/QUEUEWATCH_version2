// ─── routes/reports.js ───
const express = require("express");
const router = express.Router();
const { poolPromise } = require("../db");

// ── GET all reports for a specific branch ──
router.get("/branch/:id", async (req, res) => {
  try {
    const db = await poolPromise;
    const reports = await db.all(`
      SELECT
        r.ReportID,
        r.Status,
        r.WaitMinutes,
        r.Notes,
        r.IsFlagged,
        r.CreatedAt,
        u.FullName AS UserName
      FROM WaitingTimeReports r
      JOIN Users u ON r.UserID = u.UserID
      WHERE r.BranchID = ?
      ORDER BY r.CreatedAt DESC
    `, [req.params.id]);
    res.json(reports);
  } catch (err) {
    console.error("GET /reports/branch/:id error:", err.message);
    res.status(500).json({ error: "Failed to load reports" });
  }
});

// ── GET system stats (admin) ──
router.get("/stats", async (req, res) => {
  if (!req.session.user || req.session.user.Role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  try {
    const db = await poolPromise;
    const users = await db.get("SELECT COUNT(*) as count FROM Users");
    const branches = await db.get("SELECT COUNT(*) as count FROM Branches");
    res.json({ users: users.count, branches: branches.count });
  } catch (err) {
    console.error("GET /reports/stats error:", err.message);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ── GET all reports (admin) ──
router.get("/", async (req, res) => {
  try {
    const db = await poolPromise;
    const reports = await db.all(`
      SELECT
        r.ReportID,
        r.Status,
        r.WaitMinutes,
        r.Notes,
        r.IsFlagged,
        r.CreatedAt,
        u.FullName  AS UserName,
        b.Name      AS BranchName
      FROM WaitingTimeReports r
      JOIN Users    u ON r.UserID   = u.UserID
      JOIN Branches b ON r.BranchID = b.BranchID
      ORDER BY r.CreatedAt DESC
    `);
    res.json(reports);
  } catch (err) {
    console.error("GET /reports error:", err.message);
    res.status(500).json({ error: "Failed to load reports" });
  }
});

// ── POST a new report ──
router.post("/", async (req, res) => {
  // Must be logged in
  if (!req.session.user)
    return res
      .status(401)
      .json({ error: "You must be logged in to submit a report" });

  const { branchId, status, waitMinutes, notes } = req.body;

  if (!branchId || !status)
    return res.status(400).json({ error: "Branch and status are required" });

  const validStatuses = ["Quiet", "Busy", "Very Busy", "System Offline"];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: "Invalid status value" });

  try {
    const db = await poolPromise;
    await db.run(`
      INSERT INTO WaitingTimeReports (BranchID, UserID, Status, WaitMinutes, Notes)
      VALUES (?, ?, ?, ?, ?)
    `, [branchId, req.session.user.UserID, status, waitMinutes || 0, notes || ""]);

    res.json({ message: "Report submitted successfully" });
  } catch (err) {
    console.error("POST /reports error:", err.message);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// ── DELETE a report (admin only) ──
router.delete("/:id", async (req, res) => {
  if (!req.session.user || req.session.user.Role !== "admin")
    return res.status(403).json({ error: "Admin access required" });

  try {
    const db = await poolPromise;
    await db.run("DELETE FROM WaitingTimeReports WHERE ReportID = ?", [req.params.id]);

    res.json({ message: "Report deleted" });
  } catch (err) {
    console.error("DELETE /reports/:id error:", err.message);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// ── PATCH flag a report (admin only) ──
router.patch("/:id/flag", async (req, res) => {
  if (!req.session.user || req.session.user.Role !== "admin")
    return res.status(403).json({ error: "Admin access required" });

  try {
    const db = await poolPromise;
    await db.run("UPDATE WaitingTimeReports SET IsFlagged = 1 WHERE ReportID = ?", [req.params.id]);

    res.json({ message: "Report flagged" });
  } catch (err) {
    console.error("PATCH /reports/:id/flag error:", err.message);
    res.status(500).json({ error: "Failed to flag report" });
  }
});

// ── GET all reports submitted by the logged in user ──
router.get("/user", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "You must be logged in to fetch your reports" });
  }

  try {
    const db = await poolPromise;
    const reports = await db.all(`
      SELECT
        r.ReportID,
        r.BranchID,
        r.Status,
        r.WaitMinutes,
        r.Notes,
        r.IsFlagged,
        r.CreatedAt,
        b.Name AS BranchName
      FROM WaitingTimeReports r
      JOIN Branches b ON r.BranchID = b.BranchID
      WHERE r.UserID = ?
      ORDER BY r.CreatedAt DESC
    `, [req.session.user.UserID]);

    res.json(reports);
  } catch (err) {
    console.error("GET /reports/user error:", err.message);
    res.status(500).json({ error: "Failed to load your reports" });
  }
});

module.exports = router;
