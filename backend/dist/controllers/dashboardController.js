"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
const db_1 = require("../config/db");
async function getDashboardStats(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    try {
        const totalProjects = await db_1.prisma.project.count({ where: { tenantId } });
        const totalTasks = await db_1.prisma.task.count({ where: { tenantId } });
        const totalMembers = await db_1.prisma.user.count({ where: { tenantId } });
        // Task counts by status
        const tasksByStatus = await db_1.prisma.task.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: { _all: true },
        });
        // Task counts by priority
        const tasksByPriority = await db_1.prisma.task.groupBy({
            by: ['priority'],
            where: { tenantId },
            _count: { _all: true },
        });
        // Project breakdown (tasks per project)
        const projectsWithTaskCount = await db_1.prisma.project.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                _count: {
                    select: { tasks: true },
                },
            },
            take: 10,
        });
        // Recent activity logs (last 5)
        const recentLogs = await db_1.prisma.auditLog.findMany({
            where: { tenantId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        return res.json({
            summary: {
                totalProjects,
                totalTasks,
                totalMembers,
            },
            tasksByStatus: {
                todo: tasksByStatus.find((t) => t.status === 'todo')?._count._all || 0,
                in_progress: tasksByStatus.find((t) => t.status === 'in_progress')?._count._all || 0,
                done: tasksByStatus.find((t) => t.status === 'done')?._count._all || 0,
            },
            tasksByPriority: {
                low: tasksByPriority.find((t) => t.priority === 'low')?._count._all || 0,
                medium: tasksByPriority.find((t) => t.priority === 'medium')?._count._all || 0,
                high: tasksByPriority.find((t) => t.priority === 'high')?._count._all || 0,
            },
            projectsOverview: projectsWithTaskCount.map((p) => ({
                id: p.id,
                name: p.name,
                taskCount: p._count.tasks,
            })),
            recentActivity: recentLogs.map((log) => ({
                id: log.id,
                action: log.action,
                details: log.details,
                userName: log.user?.name || 'System',
                userEmail: log.user?.email || null,
                createdAt: log.createdAt,
            })),
        });
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
