import { Response } from 'express';
import { prisma } from '../config/db';
import { logActivity } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createTask(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;
  const { title, description, projectId, assignedToId, status, priority, dueDate } = req.body;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  if (!title || !projectId) {
    return res.status(400).json({ error: 'Title and Project ID are required' });
  }

  try {
    // Validate project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      return res.status(400).json({ error: 'Invalid Project ID' });
    }

    // Process file upload if any
    let attachmentUrl = null;
    if (req.file) {
      attachmentUrl = `/uploads/${req.file.filename}`;
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        projectId,
        tenantId,
        assignedToId: assignedToId || null,
        status: status || 'todo',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        attachmentUrl,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await logActivity(
      'task_created',
      `Task "${task.title}" created in project "${project.name}"`,
      authReq.user?.id,
      tenantId
    );

    // Emit Real-time WebSocket update
    const io = req.app.get('io');
    if (io) {
      io.to(tenantId).emit('task_updated', { type: 'create', task });
    }

    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTasks(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  // Parse query params for search, filters, pagination & sorting
  const {
    projectId,
    status,
    priority,
    assignedToId,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '100',
  } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 100;
  const skip = (pageNum - 1) * limitNum;

  // Build filter conditions
  const whereClause: any = { tenantId };

  if (projectId) whereClause.projectId = projectId as string;
  if (status) whereClause.status = status as string;
  if (priority) whereClause.priority = priority as string;
  if (assignedToId) whereClause.assignedToId = assignedToId as string;
  
  if (search) {
    whereClause.OR = [
      { title: { contains: search as string } },
      { description: { contains: search as string } },
    ];
  }

  try {
    const totalCount = await prisma.task.count({ where: whereClause });
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { [sortBy as string]: sortOrder as string },
      skip,
      take: limitNum,
    });

    return res.json({
      tasks,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTask(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;
  const { id } = req.params;
  const { title, description, assignedToId, status, priority, dueDate } = req.body;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  try {
    // Verify task belongs to tenant
    const existingTask = await prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    let attachmentUrl = existingTask.attachmentUrl;
    if (req.file) {
      attachmentUrl = `/uploads/${req.file.filename}`;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title ? title.trim() : existingTask.title,
        description: description !== undefined ? (description ? description.trim() : null) : existingTask.description,
        assignedToId: assignedToId !== undefined ? (assignedToId || null) : existingTask.assignedToId,
        status: status || existingTask.status,
        priority: priority || existingTask.priority,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existingTask.dueDate,
        attachmentUrl,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await logActivity(
      'task_updated',
      `Task "${updatedTask.title}" was updated (status: ${updatedTask.status})`,
      authReq.user?.id,
      tenantId
    );

    // Emit Real-time WebSocket update
    const io = req.app.get('io');
    if (io) {
      io.to(tenantId).emit('task_updated', { type: 'update', task: updatedTask });
    }

    return res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTask(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  try {
    // Verify task belongs to tenant
    const task = await prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id },
    });

    await logActivity(
      'task_deleted',
      `Task "${task.title}" was deleted`,
      authReq.user?.id,
      tenantId
    );

    // Emit Real-time WebSocket update
    const io = req.app.get('io');
    if (io) {
      io.to(tenantId).emit('task_updated', { type: 'delete', taskId: id });
    }

    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
