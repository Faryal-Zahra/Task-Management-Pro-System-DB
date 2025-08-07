const express = require("express");
const sql = require("mssql");
const authenticate = require("./authMiddleware");

const router = express.Router();

// ✅ Get all tasks under a project (Admin or Project Member)
router.get("/:projectId/tasks", authenticate, async (req, res) => {
  try {
    const { role, user_id } = req.user; // Extract user role and ID from token
    const { projectId } = req.params;

    const pool = await req.poolPromise; // ✅ Fix: Use req.poolPromise instead of req.app.locals.poolPromise

    // If the user is not an admin, check if they are associated with the project
    if (role.toLowerCase() !== "admin") {
      const associationCheck = await pool
        .request()
        .input("userId", sql.Int, user_id)
        .input("projectId", sql.Int, projectId)
        .query(`
          SELECT 1 FROM view_project_members
          WHERE user_id = @userId AND project_id = @projectId
        `);

      if (!associationCheck.recordset.length) {
        return res.status(403).json({ error: "Access denied. You are not a project member." });
      }
    }

    // Fetch all tasks under the project using view_project_tasks
    const tasksResult = await pool
      .request()
      .input("projectId", sql.Int, projectId)
      .query("SELECT * FROM view_project_tasks WHERE project_id = @projectId");

    res.status(200).json(tasksResult.recordset);
  } catch (error) {
    console.error("Error fetching project tasks:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});
// ✅ Get all members under a project (Admin or Project Member)
router.get("/:projectId/members", authenticate, async (req, res) => {
    try {
      const { role, user_id } = req.user; // Extract user role and ID from token
      const { projectId } = req.params;
  
      const pool = await req.app.locals.poolPromise; // Access the database connection pool
  
      // If the user is not an admin, check if they are associated with the project
      if (role.toLowerCase() !== "admin") {
        const associationCheck = await pool
          .request()
          .input("userId", sql.Int, user_id)
          .input("projectId", sql.Int, projectId)
          .query(`
            SELECT 1 FROM view_project_members
            WHERE user_id = @userId AND project_id = @projectId
          `);
  
        if (!associationCheck.recordset.length) {
          return res.status(403).json({ error: "Access denied. You are not a project member." });
        }
      }
  
      // Fetch all members under the project using view_project_members
      const membersResult = await pool
        .request()
        .input("projectId", sql.Int, projectId)
        .query("SELECT * FROM view_project_members WHERE project_id = @projectId");
  
      res.status(200).json(membersResult.recordset);
    } catch (error) {
      console.error("Error fetching project members:", error.message);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });
  

module.exports = router;
