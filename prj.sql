CREATE DATABASE TaskMangementSystem
Use TaskMangementSystem

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Manager', 'Employee') DEFAULT 'Employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT,
    start_date DATE,
    end_date DATE,
    status ENUM('Not Started', 'Ongoing', 'Completed') DEFAULT 'Not Started',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Tasks Table
CREATE TABLE tasks (
    task_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INT,
    created_by INT,
    status ENUM('Pending', 'In Progress', 'Completed', 'On Hold') DEFAULT 'Pending',
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- Task Comments Table
CREATE TABLE task_comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT,
    user_id INT,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Task History Table
CREATE TABLE task_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT,
    changed_by INT,
    old_status ENUM('Pending', 'In Progress', 'Completed', 'On Hold'),
    new_status ENUM('Pending', 'In Progress', 'Completed', 'On Hold'),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

-- Notifications Table
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Milestones Table
CREATE TABLE milestones (
    milestone_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- User Achievements Table
CREATE TABLE user_achievements (
    achievement_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    milestone_id INT,
    badge_name VARCHAR(255),
    points_earned INT DEFAULT 0,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (milestone_id) REFERENCES milestones(milestone_id)
);

-- Kanban Board Table
CREATE TABLE kanban_boards (
    board_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- Kanban Columns Table
CREATE TABLE kanban_columns (
    column_id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT,
    name VARCHAR(255) NOT NULL,
    position INT NOT NULL,
    FOREIGN KEY (board_id) REFERENCES kanban_boards(board_id) ON DELETE CASCADE
);

-- Kanban Tasks Table (Mapping Tasks to Columns)
CREATE TABLE kanban_tasks (
    task_id INT,
    column_id INT,
    position INT NOT NULL,
    PRIMARY KEY (task_id, column_id),
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(column_id) ON DELETE CASCADE
);

-- Task Automation Table
CREATE TABLE task_automation (
    automation_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT,
    trigger_event VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- User Settings Table
CREATE TABLE user_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    dark_mode BOOLEAN DEFAULT FALSE,
    notification_preferences JSON DEFAULT '{}' CHECK (JSON_VALID(notification_preferences)),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);



--- to see the task history though filteration of userid ,task id ,project id

CREATE VIEW view_task_history AS
SELECT 
    th.history_id,
    th.task_id,
    t.title AS task_title,
    p.project_id,
    p.project_name,
    th.changed_by AS user_id,
    u.first_name AS changed_by_first_name,
    u.last_name AS changed_by_last_name,
    th.old_status,
    th.new_status,
    th.changed_at
FROM task_history th
JOIN tasks t ON th.task_id = t.task_id
JOIN projects p ON t.project_id = p.project_id
JOIN users u ON th.changed_by = u.user_id;


---- to see alll projects created by a user under there id 
CREATE VIEW view_projects_by_user AS
SELECT 
    p.project_id,
    p.project_name,
    p.description,
    p.created_by AS user_id,
    u.first_name AS creator_first_name,
    u.last_name AS creator_last_name,
    p.start_date,
    p.end_date,
    p.status,
    p.created_at
FROM projects p
JOIN users u ON p.created_by = u.user_id;

SELECT * FROM view_task_history WHERE task_id = 10;
SELECT * FROM view_task_history WHERE user_id = 5;
SELECT * FROM view_task_history WHERE project_id = 3;



--- to see total members in a project
CREATE VIEW view_project_members AS
SELECT 
    p.project_id,
    p.project_name,
    u.user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role
FROM projects p
JOIN tasks t ON p.project_id = t.project_id
JOIN users u ON t.assigned_to = u.user_id
GROUP BY p.project_id, p.project_name, u.user_id, u.first_name, u.last_name, u.email, u.role;



--- to see all the tasks under a project

CREATE VIEW view_project_tasks AS
SELECT 
    p.project_id,
    p.project_name,
    t.task_id,
    t.title AS task_title,
    t.description AS task_description,
    t.assigned_to,
    u.first_name AS assigned_first_name,
    u.last_name AS assigned_last_name,
    t.status,
    t.priority,
    t.due_date,
    t.created_at
FROM projects p
JOIN tasks t ON p.project_id = t.project_id
LEFT JOIN users u ON t.assigned_to = u.user_id;


--- to see all the tasks under a user with name of the project
CREATE VIEW view_user_tasks_with_projects AS
SELECT 
    t.task_id,
    t.title AS task_title,
    t.description AS task_description,
    t.status AS task_status,
    t.priority AS task_priority,
    t.due_date,
    p.project_id,
    p.project_name,
    u.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS assigned_to_user
FROM tasks t
JOIN projects p ON t.project_id = p.project_id
JOIN users u ON t.assigned_to = u.user_id;


--- to see the milestones by prj id  or by projecrt name 
CREATE VIEW view_milestones_by_project AS
SELECT 
    m.milestone_id,
    m.project_id,
    p.project_name,
    m.name AS milestone_name,
    m.description AS milestone_description,
    m.created_at
FROM milestones m
JOIN projects p ON m.project_id = p.project_id;


--- to see the achievment with the name of the user and project name and milestone name
CREATE VIEW view_user_achievements AS
SELECT 
    ua.user_id,
    m.name AS milestone_name,
    p.project_name,
    ua.badge_name,
    ua.points_earned,
    ua.achieved_at
FROM user_achievements ua
JOIN milestones m ON ua.milestone_id = m.milestone_id
JOIN projects p ON m.project_id = p.project_id;