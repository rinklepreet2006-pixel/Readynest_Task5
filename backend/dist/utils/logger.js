"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
const db_1 = require("../config/db");
async function logActivity(action, details, userId, tenantId) {
    try {
        if (!tenantId) {
            console.warn(`[AuditLog Warn] Attempted to log action "${action}" without tenantId.`);
            return;
        }
        await db_1.prisma.auditLog.create({
            data: {
                action,
                details,
                userId: userId || null,
                tenantId,
            },
        });
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
}
