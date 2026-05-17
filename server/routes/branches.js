// ─── routes/branches.js ───
const express = require("express");
const router = express.Router();
const { poolPromise } = require("../db");

// ── GET all branches with their latest status and avg wait today ──
router.get("/", async (req, res) => {
  try {
    const db = await poolPromise;
    const branches = await db.all(`
      SELECT
        b.BranchID,
        b.Name,
        b.Type,
        b.Address,
        b.Latitude,
        b.Longitude,
        -- Latest status from most recent report today
        (
          SELECT Status
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
            AND date(CreatedAt) = date('now')
          ORDER BY CreatedAt DESC
          LIMIT 1
        ) AS Status,
        -- Average wait time today
        (
          SELECT AVG(WaitMinutes)
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
            AND date(CreatedAt) = date('now')
        ) AS AvgWait,
        -- Total reports today
        (
          SELECT COUNT(*)
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
            AND date(CreatedAt) = date('now')
        ) AS ReportsToday,
        -- Time of last report
        (
          SELECT CreatedAt
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
          ORDER BY CreatedAt DESC
          LIMIT 1
        ) AS LastReportAt
      FROM Branches b
      ORDER BY b.Name
    `);
    res.json(branches);
  } catch (err) {
    console.error("GET /branches error:", err.message);
    res.status(500).json({ error: "Failed to load branches" });
  }
});

// ── GET single branch by ID ──
router.get("/:id", async (req, res) => {
  try {
    const db = await poolPromise;
    const branch = await db.get("SELECT * FROM Branches WHERE BranchID = ?", [req.params.id]);

    if (!branch)
      return res.status(404).json({ error: "Branch not found" });

    res.json(branch);
  } catch (err) {
    console.error("GET /branches/:id error:", err.message);
    res.status(500).json({ error: "Failed to load branch" });
  }
});

module.exports = router;
