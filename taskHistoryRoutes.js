const express = require("express");
const sql = require("mssql");
const authenticate = require("./authMiddleware");

const router = express.Router();

// Get task history based on filters (Admin sees all, Users see only their projects)
router.get("/", authenticate, async (req, res) => {
  try {
    const pool = await req.poolPromise;
    const { role, user_id } = req.user; // Extract user role and ID from token

    // Extract query parameters for filtering
    const { userId, projectId, taskId } = req.query;

    // Base query
    let query = `
      SELECT * FROM view_task_history
      WHERE 1=1
    `;

    // Parameters for filtering
    const params = {};

    // Apply filters based on query parameters
    if (userId) {
      query += " AND user_id = @userId";
      params.userId = userId;
    }
    if (projectId) {
      query += " AND project_id = @projectId";
      params.projectId = projectId;
    }
    if (taskId) {
      query += " AND task_id = @taskId";
      params.taskId = taskId;
    }

    // If the user is NOT an admin, restrict them to only their associated projects
    if (role.toLowerCase() !== "admin") {
      query += ` AND project_id IN (
        SELECT project_id FROM view_project_members WHERE user_id = @currentUserId
      )`;
      params.currentUserId = user_id;
    }

    // Debugging: Log the query and parameters
    console.log("Executing query:", query);
    console.log("With parameters:", params);

    // Prepare SQL request
    const request = pool.request();
    for (const [key, value] of Object.entries(params)) {
      request.input(key, sql.Int, value);
    }

    // Execute query
    const result = await request.query(query);

    // Check if the result is empty
    if (!result.recordset.length) {
      return res.status(404).json({ error: "No task history found for the given filters." });
    }

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching task history:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

module.exports = router;