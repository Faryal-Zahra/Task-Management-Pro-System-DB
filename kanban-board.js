const express = require('express');
const router = express.Router();
const authenticate = require('./authMiddleware'); // Middleware for authentication

// ✅ Create Kanban Board (Only Project Creator)
router.post('/boards', authenticate, async (req, res) => {
    try {
        const { projectId, name } = req.body;
        const pool = await req.poolPromise;

        // Check if the project exists and the user is the creator
        const project = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM projects WHERE project_id = @projectId');

        if (!project.recordset.length) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can create a Kanban board' });
        }

        // Check if a board already exists for the project
        const existingBoard = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM kanban_boards WHERE project_id = @projectId');

        if (existingBoard.recordset.length) {
            return res.status(400).json({ error: 'A Kanban board already exists for this project' });
        }

        // Create the Kanban board
        await pool.request()
            .input('projectId', projectId)
            .input('name', name)
            .query(`
                INSERT INTO kanban_boards (project_id, name) 
                VALUES (@projectId, @name)
            `);

        res.status(201).json({ message: 'Kanban board created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create Kanban board', details: error.message });
    }
});

// ✅ Get Kanban Board (Only Project Members)
router.get('/boards/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const pool = await req.poolPromise;

        // Check if the user is a member of the project
        const projectMember = await pool.request()
            .input('projectId', projectId)
            .input('userId', req.user.user_id)
            .query(`
                SELECT * FROM tasks 
                WHERE project_id = @projectId AND assigned_to = @userId
            `);

        if (!projectMember.recordset.length) {
            return res.status(403).json({ error: 'Unauthorized: Only project members can view the Kanban board' });
        }

        // Fetch the Kanban board
        const board = await pool.request()
            .input('projectId', projectId)
            .query('SELECT * FROM kanban_boards WHERE project_id = @projectId');

        res.json(board.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Kanban board', details: error.message });
    }
});

// ✅ Update Kanban Board (Only Project Creator)
router.put('/boards/:boardId', authenticate, async (req, res) => {
    try {
        const { boardId } = req.params;
        const { name } = req.body;
        const pool = await req.poolPromise;

        // Check if the board exists and the user is the project creator
        const board = await pool.request()
            .input('boardId', boardId)
            .query(`
                SELECT kb.*, p.created_by 
                FROM kanban_boards kb
                JOIN projects p ON kb.project_id = p.project_id
                WHERE kb.board_id = @boardId
            `);

        if (!board.recordset.length) {
            return res.status(404).json({ error: 'Kanban board not found' });
        }

        if (board.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can update the Kanban board' });
        }

        // Update the Kanban board
        await pool.request()
            .input('boardId', boardId)
            .input('name', name)
            .query(`
                UPDATE kanban_boards 
                SET name = @name 
                WHERE board_id = @boardId
            `);

        res.json({ message: 'Kanban board updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update Kanban board', details: error.message });
    }
});

// ✅ Delete Kanban Board (Only Project Creator)
router.delete('/boards/:boardId', authenticate, async (req, res) => {
    try {
        const { boardId } = req.params;
        const pool = await req.poolPromise;

        // Check if the board exists and the user is the project creator
        const board = await pool.request()
            .input('boardId', boardId)
            .query(`
                SELECT kb.*, p.created_by 
                FROM kanban_boards kb
                JOIN projects p ON kb.project_id = p.project_id
                WHERE kb.board_id = @boardId
            `);

        if (!board.recordset.length) {
            return res.status(404).json({ error: 'Kanban board not found' });
        }

        if (board.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can delete the Kanban board' });
        }

        // Delete the Kanban board
        await pool.request()
            .input('boardId', boardId)
            .query('DELETE FROM kanban_boards WHERE board_id = @boardId');

        res.json({ message: 'Kanban board deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete Kanban board', details: error.message });
    }
});

// ✅ Create Kanban Column (Only Project Creator)
router.post('/columns', authenticate, async (req, res) => {
    try {
        const { boardId, name, position } = req.body;
        const pool = await req.poolPromise;

        // Check if the board exists and the user is the project creator
        const board = await pool.request()
            .input('boardId', boardId)
            .query(`
                SELECT kb.*, p.created_by 
                FROM kanban_boards kb
                JOIN projects p ON kb.project_id = p.project_id
                WHERE kb.board_id = @boardId
            `);

        if (!board.recordset.length) {
            return res.status(404).json({ error: 'Kanban board not found' });
        }

        if (board.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can add columns' });
        }

        // Create the Kanban column
        await pool.request()
            .input('boardId', boardId)
            .input('name', name)
            .input('position', position)
            .query(`
                INSERT INTO kanban_columns (board_id, name, position) 
                VALUES (@boardId, @name, @position)
            `);

        res.status(201).json({ message: 'Kanban column created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create Kanban column', details: error.message });
    }
});

// ✅ Get Kanban Columns (Only Project Members)
router.get('/columns/:boardId', authenticate, async (req, res) => {
    try {
        const { boardId } = req.params;
        const pool = await req.poolPromise;

        // Check if the user is a member of the project
        const board = await pool.request()
            .input('boardId', boardId)
            .query(`
                SELECT kb.*, p.created_by 
                FROM kanban_boards kb
                JOIN projects p ON kb.project_id = p.project_id
                JOIN project_members pm ON p.project_id = pm.project_id
                WHERE kb.board_id = @boardId AND pm.user_id = @userId
            `);

        if (!board.recordset.length) {
            return res.status(403).json({ error: 'Unauthorized: Only project members can view columns' });
        }

        // Fetch columns for the Kanban board
        const columns = await pool.request()
            .input('boardId', boardId)
            .query('SELECT * FROM kanban_columns WHERE board_id = @boardId ORDER BY position');

        res.json(columns.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Kanban columns', details: error.message });
    }
});

// ✅ Update Kanban Column (Only Project Creator)
router.put('/columns/:columnId', authenticate, async (req, res) => {
    try {
        const { columnId } = req.params;
        const { name, position } = req.body;
        const pool = await req.poolPromise;

        // Check if the column exists and the user is the project creator
        const column = await pool.request()
            .input('columnId', columnId)
            .query(`
                SELECT kc.*, p.created_by 
                FROM kanban_columns kc
                JOIN kanban_boards kb ON kc.board_id = kb.board_id
                JOIN projects p ON kb.project_id = p.project_id
                WHERE kc.column_id = @columnId
            `);

        if (!column.recordset.length) {
            return res.status(404).json({ error: 'Kanban column not found' });
        }

        if (column.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can update columns' });
        }

        // Update the Kanban column
        await pool.request()
            .input('columnId', columnId)
            .input('name', name)
            .input('position', position)
            .query(`
                UPDATE kanban_columns 
                SET name = @name, position = @position 
                WHERE column_id = @columnId
            `);

        res.json({ message: 'Kanban column updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update Kanban column', details: error.message });
    }
});

// ✅ Delete Kanban Column (Only Project Creator)
router.delete('/columns/:columnId', authenticate, async (req, res) => {
    try {
        const { columnId } = req.params;
        const pool = await req.poolPromise;

        // Check if the column exists and the user is the project creator
        const column = await pool.request()
            .input('columnId', columnId)
            .query(`
                SELECT kc.*, p.created_by 
                FROM kanban_columns kc
                JOIN kanban_boards kb ON kc.board_id = kb.board_id
                JOIN projects p ON kb.project_id = p.project_id
                WHERE kc.column_id = @columnId
            `);

        if (!column.recordset.length) {
            return res.status(404).json({ error: 'Kanban column not found' });
        }

        if (column.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can delete columns' });
        }

        // Delete the Kanban column
        await pool.request()
            .input('columnId', columnId)
            .query('DELETE FROM kanban_columns WHERE column_id = @columnId');

        res.json({ message: 'Kanban column deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete Kanban column', details: error.message });
    }
});

// ✅ Create Kanban Task (Only Project Creator)
router.post('/tasks', authenticate, async (req, res) => {
    try {
        const { columnId, taskId, position } = req.body;
        const pool = await req.poolPromise;

        // Check if the column exists and the user is the project creator
        const column = await pool.request()
            .input('columnId', columnId)
            .query(`
                SELECT kc.*, p.created_by 
                FROM kanban_columns kc
                JOIN kanban_boards kb ON kc.board_id = kb.board_id
                JOIN projects p ON kb.project_id = p.project_id
                WHERE kc.column_id = @columnId
            `);

        if (!column.recordset.length) {
            return res.status(404).json({ error: 'Kanban column not found' });
        }

        if (column.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can add tasks' });
        }

        // Add the task to the Kanban column
        await pool.request()
            .input('columnId', columnId)
            .input('taskId', taskId)
            .input('position', position)
            .query(`
                INSERT INTO kanban_tasks (column_id, task_id, position) 
                VALUES (@columnId, @taskId, @position)
            `);

        res.status(201).json({ message: 'Kanban task created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create Kanban task', details: error.message });
    }
});

// ✅ Get Kanban Tasks (Only Project Members)
router.get('/tasks/:columnId', authenticate, async (req, res) => {
    try {
        const { columnId } = req.params;
        const pool = await req.poolPromise;

        // Check if the user is a member of the project
        const column = await pool.request()
            .input('columnId', columnId)
            .query(`
                SELECT kc.*, p.created_by 
                FROM kanban_columns kc
                JOIN kanban_boards kb ON kc.board_id = kb.board_id
                JOIN projects p ON kb.project_id = p.project_id
                JOIN project_members pm ON p.project_id = pm.project_id
                WHERE kc.column_id = @columnId AND pm.user_id = @userId
            `);

        if (!column.recordset.length) {
            return res.status(403).json({ error: 'Unauthorized: Only project members can view tasks' });
        }

        // Fetch tasks for the Kanban column
        const tasks = await pool.request()
            .input('columnId', columnId)
            .query('SELECT * FROM kanban_tasks WHERE column_id = @columnId ORDER BY position');

        res.json(tasks.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Kanban tasks', details: error.message });
    }
});

// ✅ Update Kanban Task (Only Project Members)
router.put('/tasks/:taskId', authenticate, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { columnId, position } = req.body;
        const pool = await req.poolPromise;

        // Check if the task exists and the user is a project member
        const task = await pool.request()
            .input('taskId', taskId)
            .query(`
                SELECT kt.*, kc.board_id, p.project_id 
                FROM kanban_tasks kt
                JOIN kanban_columns kc ON kt.column_id = kc.column_id
                JOIN kanban_boards kb ON kc.board_id = kb.board_id
                JOIN projects p ON kb.project_id = p.project_id
                JOIN project_members pm ON p.project_id = pm.project_id
                WHERE kt.task_id = @taskId AND pm.user_id = @userId
            `);

        if (!task.recordset.length) {
            return res.status(403).json({ error: 'Unauthorized: Only project members can update tasks' });
        }

        // Update the Kanban task
        await pool.request()
            .input('taskId', taskId)
            .input('columnId', columnId)
            .input('position', position)
            .query(`
                UPDATE kanban_tasks 
                SET column_id = @columnId, position = @position 
                WHERE task_id = @taskId
            `);

        res.json({ message: 'Kanban task updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update Kanban task', details: error.message });
    }
});

// ✅ Delete Kanban Task (Only Project Creator)
router.delete('/tasks/:taskId', authenticate, async (req, res) => {
    try {
        const { taskId } = req.params;
        const pool = await req.poolPromise;

        // Check if the task exists and the user is the project creator
        const task = await pool.request()
            .input('taskId', taskId)
            .query(`
                SELECT kt.*, kc.board_id, p.created_by 
                FROM kanban_tasks kt
                JOIN kanban_columns kc ON kt.column_id = kc.column_id
                JOIN kanban_boards kb ON kc.board_id = kb.board_id
                JOIN projects p ON kb.project_id = p.project_id
                WHERE kt.task_id = @taskId
            `);

        if (!task.recordset.length) {
            return res.status(404).json({ error: 'Kanban task not found' });
        }

        if (task.recordset[0].created_by !== req.user.user_id) {
            return res.status(403).json({ error: 'Unauthorized: Only the project creator can delete tasks' });
        }

        // Delete the Kanban task
        await pool.request()
            .input('taskId', taskId)
            .query('DELETE FROM kanban_tasks WHERE task_id = @taskId');

        res.json({ message: 'Kanban task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete Kanban task', details: error.message });
    }
});

module.exports = router;