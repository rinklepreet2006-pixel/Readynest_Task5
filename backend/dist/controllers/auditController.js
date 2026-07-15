"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = getAuditLogs;
const db_1 = require("../config/db");
async function getAuditLogs(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    const { search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;
    const whereClause = { tenantId };
    if (search) {
        whereClause.OR = [
            { action: { contains: search } },
            { details: { contains: search } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
        ];
    }
    try {
        const totalCount = await db_1.prisma.auditLog.count({ where: whereClause });
        const logs = await db_1.prisma.auditLog.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });
        return res.json({
            logs,
            pagination: {
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                currentPage: pageNum,
                limit: limitNum,
            },
        });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
