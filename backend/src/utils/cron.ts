import cron from 'node-cron';
import { prisma } from '../config/db';

export function initBackgroundJobs() {
  // Run at 00:00 every day to perform database maintenance
  cron.schedule('0 0 * * *', async () => {
    console.log('[Background Job] Running daily database maintenance...');
    try {
      // Clean up audit logs older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      console.log(`[Background Job] Database maintenance finished. Deleted ${deleted.count} old audit logs.`);
    } catch (error) {
      console.error('[Background Job Error] Daily maintenance job failed:', error);
    }
  });

  // Simple console notification every hour to log system activity state
  cron.schedule('0 * * * *', async () => {
    try {
      const tenantCount = await prisma.tenant.count();
      const userCount = await prisma.user.count();
      console.log(`[Background Status Report] Active Tenants: ${tenantCount}, Total Users: ${userCount}`);
    } catch (e) {
      // ignore
    }
  });
}
