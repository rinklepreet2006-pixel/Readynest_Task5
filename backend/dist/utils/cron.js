"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBackgroundJobs = initBackgroundJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../config/db");
function initBackgroundJobs() {
    // Run at 00:00 every day to perform database maintenance
    node_cron_1.default.schedule('0 0 * * *', async () => {
        console.log('[Background Job] Running daily database maintenance...');
        try {
            // Clean up audit logs older than 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const deleted = await db_1.prisma.auditLog.deleteMany({
                where: {
                    createdAt: {
                        lt: thirtyDaysAgo,
                    },
                },
            });
            console.log(`[Background Job] Database maintenance finished. Deleted ${deleted.count} old audit logs.`);
        }
        catch (error) {
            console.error('[Background Job Error] Daily maintenance job failed:', error);
        }
    });
    // Simple console notification every hour to log system activity state
    node_cron_1.default.schedule('0 * * * *', async () => {
        try {
            const tenantCount = await db_1.prisma.tenant.count();
            const userCount = await db_1.prisma.user.count();
            console.log(`[Background Status Report] Active Tenants: ${tenantCount}, Total Users: ${userCount}`);
        }
        catch (e) {
            // ignore
        }
    });
}
