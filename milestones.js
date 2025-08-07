const express = require('express');
const router = express.Router();
const authenticate = require('./authMiddleware'); // Correctly require the middleware

// ✅ Create Milestone (Only Project Creator)
router.post('/', authenticate, async (req, res) => {
    try {
        const { projectId, name, description } = req.body;
        const pool = await req.poolPromise;

        // Check if project exists and if the user is the creator
        const project = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!project.recordset.length) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only project creator can add milestones' });
        }

        // Insert milestone
        await pool.request()
            .input('projectId', projectId)
            .input('name', name)
            .input('description', description)
            .query(`
                INSERT INTO milestones (project_id, name, description) 
                VALUES (@projectId, @name, @description)
            `);

        res.json({ message: 'Milestone created successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to create milestone', details: error.message });
    }
});

// ✅ Get Milestones for User's Projects (Only Project Members)
router.get('/', authenticate, async (req, res) => {
    try {
        const pool = await req.poolPromise;

        // Fetch milestones only for projects where the user is a member
        const result = await pool.request()
            .input('userId', req.user.user_id)
            .query(`
                SELECT m.* FROM milestones m
                JOIN project_members pm ON m.project_id = pm.project_id
                WHERE pm.user_id = @userId
            `);

        res.json(result.recordset);

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch milestones', details: error.message });
    }
});

// ✅ Get Milestones by Project ID (Admin or Project Members)
router.get('/project/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const pool = await req.poolPromise;

        // Check if the user is an admin or a member of the project
        const project = await pool.request()
            .input('projectId', projectId)
            .query(`
                SELECT * FROM projects 
                WHERE project_id = @projectId
            `);

        if (!project.recordset.length) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (req.user.role !== 'Admin' && project.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only admins or project members can view milestones' });
        }

        // Fetch milestones for the project
        const milestones = await pool.request()
            .input('projectId', projectId)
            .query(`
                SELECT * FROM milestones 
                WHERE project_id = @projectId
            `);

        res.json(milestones.recordset);

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch milestones', details: error.message });
    }
});

// ✅ Get Single Milestone by ID (Only Project Members)
router.get('/:milestoneId', authenticate, async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const pool = await req.poolPromise;

        // Check if the user is part of the project associated with this milestone
        const result = await pool.request()
            .input('milestoneId', milestoneId)
            .input('userId', req.user.user_id)
            .query(`
                SELECT m.* FROM milestones m
                JOIN project_members pm ON m.project_id = pm.project_id
                WHERE m.milestone_id = @milestoneId AND pm.user_id = @userId
            `);

        if (!result.recordset.length) {
            return res.status(404).json({ error: 'Milestone not found or access denied' });
        }

        res.json(result.recordset[0]);

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch milestone', details: error.message });
    }
});

// ✅ Update Milestone (Only Project Creator)
router.put('/:milestoneId', authenticate, async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { name, description } = req.body;
        const pool = await req.poolPromise;

        // Get milestone and project details
        const milestone = await pool.request()
            .input('milestoneId', milestoneId)
            .query('SELECT * FROM milestones WHERE milestone_id = @milestoneId');

        if (!milestone.recordset.length) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        const project = await pool.request()
            .input('projectId', milestone.recordset[0].project_id)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!project.recordset.length || project.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only project creator can update milestones' });
        }

        // Update milestone
        await pool.request()
            .input('milestoneId', milestoneId)
            .input('name', name)
            .input('description', description)
            .query(`
                UPDATE milestones 
                SET name = @name, description = @description
                WHERE milestone_id = @milestoneId
            `);

        res.json({ message: 'Milestone updated successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to update milestone', details: error.message });
    }
});

// ✅ Delete Milestone (Only Project Creator)
router.delete('/:milestoneId', authenticate, async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const pool = await req.poolPromise;

        // Get milestone and project details
        const milestone = await pool.request()
            .input('milestoneId', milestoneId)
            .query('SELECT * FROM milestones WHERE milestone_id = @milestoneId');

        if (!milestone.recordset.length) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        const project = await pool.request()
            .input('projectId', milestone.recordset[0].project_id)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!project.recordset.length || project.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only project creator can delete milestones' });
        }

        // Delete milestone
        await pool.request()
            .input('milestoneId', milestoneId)
            .query('DELETE FROM milestones WHERE milestone_id = @milestoneId');

        res.json({ message: 'Milestone deleted successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to delete milestone', details: error.message });
    }
});

module.exports = router;
