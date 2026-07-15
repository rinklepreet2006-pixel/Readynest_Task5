import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getAuditLogs(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  const { search, page = '1', limit = '50' } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = { tenantId };

  if (search) {
    whereClause.OR = [
      { action: { contains: search as string } },
      { details: { contains: search as string } },
      { user: { name: { contains: search as string } } },
      { user: { email: { contains: search as string } } },
    ];
  }

  try {
    const totalCount = await prisma.auditLog.count({ where: whereClause });
    const logs = await prisma.auditLog.findMany({
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
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
