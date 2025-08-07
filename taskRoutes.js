const express = require('express');
const authenticate = require('./authMiddleware'); // Middleware for authentication
const router = express.Router();

// ✅ Create Task (Only Project Creator Can Create & Assign)
router.post('/', authenticate, async (req, res) => {
    try {
        const { projectId, title, description, assignedTo, priority, dueDate } = req.body;
        const pool = await req.poolPromise;

        // Check if project exists and if user is the project creator
        const project = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!project.recordset.length) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only project creator can create tasks' });
        }

        // Check if assigned user exists
        if (assignedTo) {
            const userCheck = await pool.request()
                .input('assignedTo', assignedTo)
                .query('SELECT * FROM users WHERE user_id = @assignedTo');

            if (!userCheck.recordset.length) {
                return res.status(400).json({ error: 'Assigned user does not exist' });
            }
        }

        // Insert task
        const taskResult = await pool.request()
            .input('projectId', projectId)
            .input('title', title)
            .input('description', description)
            .input('assignedTo', assignedTo || null)
            .input('createdBy', req.user.user_id)
            .input('priority', priority || 'Medium')
            .input('dueDate', dueDate || null)
            .query(`
                INSERT INTO tasks (project_id, title, description, assigned_to, created_by, priority, due_date, status)
                OUTPUT INSERTED.task_id
                VALUES (@projectId, @title, @description, @assignedTo, @createdBy, @priority, @dueDate, 'Pending')
            `);

        const taskId = taskResult.recordset[0].task_id;

        // ✅ Log Initial Task History
        await pool.request()
            .input('taskId', taskId)
            .input('changedBy', req.user.user_id)
            .input('oldStatus', 'Pending')
            .input('newStatus', 'Pending')
            .query(`
                INSERT INTO task_history (task_id, changed_by, old_status, new_status)
                VALUES (@taskId, @changedBy, @oldStatus, @newStatus)
            `);

        res.status(201).json({ message: 'Task created and history logged', taskId });

    } catch (error) {
        res.status(500).json({ error: 'Task creation failed', details: error.message });
    }
});

// ✅ Update Task (Project Creator Can Update Task Details, Assigned User Can Update Status)
router.put('/:taskId', authenticate, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { title, description, assignedTo, priority, status, dueDate } = req.body;
        const pool = await req.poolPromise;

        // Check if task exists
        const taskResult = await pool.request()
            .input('taskId', taskId)
            .query('SELECT * FROM tasks WHERE task_id = @taskId');

        if (!taskResult.recordset.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const task = taskResult.recordset[0];
        const oldStatus = task.status;

        // Get project details
        const project = await pool.request()
            .input('projectId', task.project_id)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!project.recordset.length) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const isProjectCreator = project.recordset[0].created_by === req.user.user_id;
        const isAssignedUser = task.assigned_to === req.user.user_id;

        // Check permissions
        if (status && status !== oldStatus) {
            if (!isAssignedUser) {
                return res.status(403).json({ error: 'Only the assigned user can update task status' });
            }
        } else {
            if (!isProjectCreator) {
                return res.status(403).json({ error: 'Only the project creator can update task details' });
            }
        }

        // Dynamically build update query
        let updateQuery = `UPDATE tasks SET `;
        const updateFields = [];

        if (title && isProjectCreator) updateFields.push(`title = @title`);
        if (description && isProjectCreator) updateFields.push(`description = @description`);
        if (assignedTo && isProjectCreator) updateFields.push(`assigned_to = @assignedTo`);
        if (priority && isProjectCreator) updateFields.push(`priority = @priority`);
        if (dueDate && isProjectCreator) updateFields.push(`due_date = @dueDate`);
        if (status && isAssignedUser) updateFields.push(`status = @status`);

        if (!updateFields.length) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updateQuery += updateFields.join(', ') + ` WHERE task_id = @taskId`;

        const updateRequest = pool.request().input('taskId', taskId);
        if (title && isProjectCreator) updateRequest.input('title', title);
        if (description && isProjectCreator) updateRequest.input('description', description);
        if (assignedTo && isProjectCreator) updateRequest.input('assignedTo', assignedTo);
        if (priority && isProjectCreator) updateRequest.input('priority', priority);
        if (dueDate && isProjectCreator) updateRequest.input('dueDate', dueDate);
        if (status && isAssignedUser) updateRequest.input('status', status);

        await updateRequest.query(updateQuery);

        // ✅ Log Task Status Change
        if (status && status !== oldStatus) {
            await pool.request()
                .input('taskId', taskId)
                .input('changedBy', req.user.user_id)
                .input('oldStatus', oldStatus)
                .input('newStatus', status)
                .query(`
                    INSERT INTO task_history (task_id, changed_by, old_status, new_status)
                    VALUES (@taskId, @changedBy, @oldStatus, @newStatus)
                `);
        }

        res.json({ message: 'Task updated successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Task update failed', details: error.message });
    }
});


// ✅ Get Task by ID
router.get('/:taskId', authenticate, async (req, res) => {
    try {
        const { taskId } = req.params;
        const pool = await req.poolPromise;

        const taskResult = await pool.request()
            .input('taskId', taskId)
            .query('SELECT * FROM tasks WHERE task_id = @taskId');

        if (!taskResult.recordset.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(taskResult.recordset[0]);

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch task', details: error.message });
    }
});

// ✅ Delete Task (Only Project Creator Can Delete)
router.delete('/:taskId', authenticate, async (req, res) => {
    try {
        const { taskId } = req.params;
        const pool = await req.poolPromise;

        // Check if task exists
        const taskResult = await pool.request()
            .input('taskId', taskId)
            .query('SELECT * FROM tasks WHERE task_id = @taskId');

        if (!taskResult.recordset.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const task = taskResult.recordset[0];

        // Check if user is project creator
        const project = await pool.request()
            .input('projectId', task.project_id)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!project.recordset.length || project.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only project creator can delete tasks' });
        }

        // Delete task
        await pool.request()
            .input('taskId', taskId)
            .query('DELETE FROM tasks WHERE task_id = @taskId');

        res.json({ message: 'Task deleted successfully' });

    } catch (error) {
        res.status(500).json({ error: 'Task deletion failed', details: error.message });
    }
});

module.exports = router;
