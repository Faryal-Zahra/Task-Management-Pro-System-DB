const express = require('express');
const authenticate = require('./authMiddleware');
const router = express.Router();

// Create Project
router.post('/', authenticate, async (req, res) => {
    try {
        const { projectName, description, dueDate, priority, category } = req.body;

        console.log('Request Body:', req.body);
        console.log('User ID:', req.user.user_id);

        const pool = await req.poolPromise;

        await pool.request()
            .input('projectName', projectName)
            .input('description', description)
            .input('createdBy', req.user.user_id)
            .input('dueDate', dueDate ? new Date(dueDate) : null)
            .input('priority', priority || 'Medium')
            .input('category', category || null)
            .query(`
                INSERT INTO projects (project_name, description, created_by, due_date, priority, category)
                VALUES (@projectName, @description, @createdBy, @dueDate, @priority, @category)
            `);

        res.status(201).send({ message: 'Project created successfully' });
    } catch (error) {
        console.error('Error Details:', error.message);
        res.status(500).send({ error: 'Project creation failed', details: error.message });
    }
});

// Get All Projects
router.get('/', authenticate, async (req, res) => {
    try {
        const pool = await req.poolPromise;
        const query = req.user.role === 'Admin'
            ? 'SELECT * FROM projects'
            : 'SELECT * FROM projects WHERE created_by = @userId';

        const result = await pool.request()
            .input('userId', req.user.user_id)
            .query(query);

        res.send(result.recordset);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch projects', details: error.message });
    }
});

// Get Project by ID
router.get('/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const pool = await req.poolPromise;

        const result = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!result.recordset.length) {
            return res.status(404).send({ error: 'Project not found' });
        }

        const project = result.recordset[0];

        if (req.user.role !== 'Admin' && project.created_by !== req.user.user_id) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        res.send(project);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch project', details: error.message });
    }
});

// Update Project
router.put('/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { projectName, description, dueDate, priority, category } = req.body;
        const pool = await req.poolPromise;

        const existing = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!existing.recordset.length) {
            return res.status(404).send({ error: 'Project not found' });
        }

        if (existing.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        await pool.request()
            .input('projectId', projectId)
            .input('projectName', projectName)
            .input('description', description)
            .input('dueDate', dueDate ? new Date(dueDate) : null)
            .input('priority', priority || 'Medium')
            .input('category', category || null)
            .query(`
                UPDATE projects
                SET project_name = @projectName,
                    description = @description,
                    due_date = @dueDate,
                    priority = @priority,
                    category = @category
                WHERE project_id = @projectId
            `);

        res.send({ message: 'Project updated successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Update failed', details: error.message });
    }
});

// Delete Project
router.delete('/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const pool = await req.poolPromise;

        const existing = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!existing.recordset.length) {
            return res.status(404).send({ error: 'Project not found' });
        }

        if (existing.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        await pool.request()
            .input('projectId', projectId)
            .query('DELETE FROM projects WHERE project_id = @projectId');

        res.send({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Deletion failed', details: error.message });
    }
});

module.exports = router;
