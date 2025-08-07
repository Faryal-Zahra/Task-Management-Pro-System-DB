const express = require('express');
const router = express.Router();
const authenticate = require('./authMiddleware'); // Middleware for authentication

// ✅ Create User Achievement (Only Admin)
router.post('/', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Unauthorized: Only admins can create user achievements' });
        }

        const { userId, milestoneId, badgeName, pointsEarned } = req.body;
        const pool = await req.poolPromise;

        console.log('Request Body:', req.body);

        // Check if the milestone exists
        const milestone = await pool.request()
            .input('milestoneId', milestoneId)
            .query('SELECT * FROM milestones WHERE milestone_id = @milestoneId');

        console.log('Milestone Query Result:', milestone.recordset);

        if (!milestone.recordset.length) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        // Insert user achievement
        await pool.request()
            .input('userId', userId)
            .input('milestoneId', milestoneId)
            .input('badgeName', badgeName)
            .input('pointsEarned', pointsEarned || 0)
            .query(`
                INSERT INTO user_achievements (user_id, milestone_id, badge_name, points_earned) 
                VALUES (@userId, @milestoneId, @badgeName, @pointsEarned)
            `);

        res.status(201).json({ message: 'User achievement created successfully' });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to create user achievement', details: error.message });
    }
});

// ✅ Get User Achievements (Only for the logged-in user)
router.get('/', authenticate, async (req, res) => {
    try {
        const pool = await req.poolPromise;

        // Fetch achievements for the logged-in user
        const achievements = await pool.request()
            .input('userId', req.user.user_id)
            .query(`
                SELECT ua.achievement_id, ua.badge_name, ua.points_earned, ua.achieved_at, 
                       m.name AS milestone_name, p.project_name
                FROM user_achievements ua
                JOIN milestones m ON ua.milestone_id = m.milestone_id
                JOIN projects p ON m.project_id = p.project_id
                WHERE ua.user_id = @userId
            `);

        res.json(achievements.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user achievements', details: error.message });
    }
});

module.exports = router;