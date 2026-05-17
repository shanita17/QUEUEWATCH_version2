// ─── routes/branches.js ───
const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

// ── GET all branches with their latest status and avg wait today ──
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        b.BranchID,
        b.Name,
        b.Type,
        b.Address,
        b.Latitude,
        b.Longitude,
        -- Latest status from most recent report today
        (
          SELECT TOP 1 Status
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
            AND CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
          ORDER BY CreatedAt DESC
        ) AS Status,
        -- Average wait time today
        (
          SELECT AVG(WaitMinutes)
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
            AND CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
        ) AS AvgWait,
        -- Total reports today
        (
          SELECT COUNT(*)
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
            AND CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
        ) AS ReportsToday,
        -- Time of last report
        (
          SELECT TOP 1 CreatedAt
          FROM WaitingTimeReports
          WHERE BranchID = b.BranchID
          ORDER BY CreatedAt DESC
        ) AS LastReportAt
      FROM Branches b
      ORDER BY b.Name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /branches error:", err.message);
    res.status(500).json({ error: "Failed to load branches" });
  }
});

// ── GET single branch by ID ──
router.get("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM Branches WHERE BranchID = @id");

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Branch not found" });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("GET /branches/:id error:", err.message);
    res.status(500).json({ error: "Failed to load branch" });
  }
});

module.exports = router;
