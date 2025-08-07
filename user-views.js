const express = require("express");
const sql = require("mssql");
const authenticate = require("./authMiddleware");

const router = express.Router();

// ✅ Get all tasks for the logged-in user or tasks assigned to a specific user (Admin only)
router.get("/tasks", authenticate, async (req, res) => {
  try {
    const { role, user_id } = req.user; // Extract user role and ID from token
    const { userId } = req.query; // Optional query parameter for Admin to filter by userId

    const pool = await req.app.locals.poolPromise; // Access the database connection pool

    // If the user is not an admin, restrict them to only their own tasks
    if (role.toLowerCase() !== "admin") {
      if (userId && parseInt(userId) !== user_id) {
        return res.status(403).json({ error: "Access denied. You can only view your own tasks." });
      }
    }

    // Base query
    let query = `
      SELECT * FROM view_user_tasks_with_projects
      WHERE user_id = @userId
    `;

    const request = pool.request();

    if (role.toLowerCase() === "admin" && userId) {
      request.input("userId", sql.Int, userId);
    } else {
      request.input("userId", sql.Int, user_id);
    }

    // Execute the query
    const result = await request.query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching user tasks:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// ✅ Get all projects created by the logged-in user or projects created by a specific user (Admin only)
router.get("/projects", authenticate, async (req, res) => {
  try {
    const { role, user_id } = req.user; // Extract user role and ID from token
    const { userId } = req.query; // Optional query parameter for Admin to filter by userId

    const pool = await req.app.locals.poolPromise; // Access the database connection pool

    // If the user is not an admin, restrict them to only their own projects
    if (role.toLowerCase() !== "admin") {
      if (userId && parseInt(userId) !== user_id) {
        return res.status(403).json({ error: "Access denied. You can only view your own projects." });
      }
    }

    // Base query
    let query = `
      SELECT * FROM view_projects_by_user
      WHERE user_id = @userId
    `;

    const request = pool.request();

    if (role.toLowerCase() === "admin" && userId) {
      request.input("userId", sql.Int, userId);
    } else {
      request.input("userId", sql.Int, user_id);
    }

    // Execute the query
    const result = await request.query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching user projects:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

module.exports = router;