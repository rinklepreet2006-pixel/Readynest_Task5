import { prisma } from '../config/db';

export async function logActivity(action: string, details: string, userId?: string, tenantId?: string) {
  try {
    if (!tenantId) {
      console.warn(`[AuditLog Warn] Attempted to log action "${action}" without tenantId.`);
      return;
    }
    await prisma.auditLog.create({
      data: {
        action,
        details,
        userId: userId || null,
        tenantId,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
