const express = require('express');
const authenticate = require('./authMiddleware'); 
const router = express.Router();

// Create a new notification
router.post('/', authenticate, async (req, res) => {
    try {
        const { user_id, message } = req.body;
        const pool = await req.poolPromise;

        await pool.request()
            .input('user_id', user_id)
            .input('message', message)
            .query(`
                INSERT INTO notifications (user_id, message)
                VALUES (@user_id, @message)
            `);

        res.status(201).send({ message: 'Notification created successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to create notification', details: error.message });
    }
});

// Get all notifications for a user
router.get('/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await req.poolPromise;

        if (req.user.user_id !== parseInt(userId)) {
            return res.status(403).send({ error: 'Unauthorized' });
        }

        const result = await pool.request()
            .input('userId', userId)
            .query('SELECT * FROM notifications WHERE user_id = @userId');

        res.send(result.recordset);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch notifications', details: error.message });
    }
});

// Mark a notification as read
router.put('/:notificationId', authenticate, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const pool = await req.poolPromise;

        await pool.request()
            .input('notificationId', notificationId)
            .query('UPDATE notifications SET is_read = 1 WHERE notification_id = @notificationId');

        res.send({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to update notification', details: error.message });
    }
});

// Delete a notification
router.delete('/:notificationId', authenticate, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const pool = await req.poolPromise;

        await pool.request()
            .input('notificationId', notificationId)
            .query('DELETE FROM notifications WHERE notification_id = @notificationId');

        res.send({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to delete notification', details: error.message });
    }
});

module.exports = router;
