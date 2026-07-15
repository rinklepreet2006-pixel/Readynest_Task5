import { Response } from 'express';
import { prisma } from '../config/db';
import { logActivity } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createProject(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;
  const { name, description } = req.body;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        tenantId,
      },
    });

    await logActivity(
      'project_created',
      `Project "${project.name}" was created`,
      authReq.user?.id,
      tenantId
    );

    return res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProjects(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProject(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;
  const { id } = req.params;
  const { name, description } = req.body;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  try {
    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id, tenantId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name ? name.trim() : project.name,
        description: description !== undefined ? description.trim() : project.description,
      },
    });

    await logActivity(
      'project_updated',
      `Project "${updated.name}" details updated`,
      authReq.user?.id,
      tenantId
    );

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteProject(req: any, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
  }

  try {
    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id, tenantId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.project.delete({
      where: { id },
    });

    await logActivity(
      'project_deleted',
      `Project "${project.name}" was deleted`,
      authReq.user?.id,
      tenantId
    );

    return res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
