// ─── routes/reports.js ───
const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

// ── GET all reports for a specific branch ──
router.get("/branch/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().input("id", sql.Int, req.params.id)
      .query(`
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
        WHERE r.BranchID = @id
        ORDER BY r.CreatedAt DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /reports/branch/:id error:", err.message);
    res.status(500).json({ error: "Failed to load reports" });
  }
});

// ── GET all reports (admin) ──
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
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
    res.json(result.recordset);
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
    const pool = await poolPromise;
    await pool
      .request()
      .input("branchId", sql.Int, branchId)
      .input("userId", sql.Int, req.session.user.UserID)
      .input("status", sql.NVarChar(50), status)
      .input("waitMinutes", sql.Int, waitMinutes || 0)
      .input("notes", sql.NVarChar(500), notes || "").query(`
        INSERT INTO WaitingTimeReports (BranchID, UserID, Status, WaitMinutes, Notes)
        VALUES (@branchId, @userId, @status, @waitMinutes, @notes)
      `);

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
    const pool = await poolPromise;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM WaitingTimeReports WHERE ReportID = @id");

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
    const pool = await poolPromise;
    await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(
        "UPDATE WaitingTimeReports SET IsFlagged = 1 WHERE ReportID = @id",
      );

    res.json({ message: "Report flagged" });
  } catch (err) {
    console.error("PATCH /reports/:id/flag error:", err.message);
    res.status(500).json({ error: "Failed to flag report" });
  }
});

module.exports = router;
