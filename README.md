# Task-Management-Pro-System-DB

---
# 📂 TaskMasterDB — Task Management System (SQL Schema)

TaskMasterDB is a robust **relational database schema** designed to support a full-featured task management system. It handles **user roles, projects, tasks, milestones, kanban boards, notifications, achievements, task history, and automation**, making it suitable for enterprise project management applications.

This schema is ideal for integration with **backend systems, web dashboards, or mobile apps** where structured task workflows and collaboration are essential.

---

## 🔧 Features

* 👤 **User Management** with roles (`Admin`, `Manager`, `Employee`)
* 📁 **Projects & Tasks** with priorities, statuses, due dates
* 📌 **Task History** tracking via a detailed audit log
* ✅ **Kanban Board Support** (columns, drag-drop tasks)
* 🏆 **Milestones & Achievements** system with badges and points
* 📬 **Notifications** system for user alerts
* ⚙️ **Task Automation** via trigger-action pairs
* 🌗 **User Preferences** like dark mode and notification settings
* 👀 **Views** for easy filtering: tasks by user, project history, user achievements, etc.

---

## 🧱 ERD (Entities Overview)

* `users`
* `projects`
* `tasks`
* `task_comments`
* `task_history`
* `notifications`
* `milestones`
* `user_achievements`
* `kanban_boards`, `kanban_columns`, `kanban_tasks`
* `task_automation`
* `user_settings`

---

## 🧠 How to Use

1. Run `CREATE DATABASE TaskMangementSystem` and switch to it using `USE TaskMangementSystem`.
2. Execute the table creation SQL scripts in order.
3. Optionally, query the **views** for insights like:

   * Task history by project or user
   * User-specific tasks with project names
   * Project-wise member and task details
   * Milestone tracking and achievements

---



## 🔮 Future Suggestions

* Integrate this schema into a full-stack application (e.g., using Node.js, ASP.NET, or Django).
* Add stored procedures for automatic deadline reminders.
* Build a frontend dashboard with charts and Kanban drag-and-drop.
* Add time tracking, file attachments, and team chat.

