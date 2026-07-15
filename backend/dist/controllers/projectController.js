"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.getProjects = getProjects;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
async function createProject(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    const { name, description } = req.body;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
    }
    try {
        const project = await db_1.prisma.project.create({
            data: {
                name: name.trim(),
                description: description ? description.trim() : null,
                tenantId,
            },
        });
        await (0, logger_1.logActivity)('project_created', `Project "${project.name}" was created`, authReq.user?.id, tenantId);
        return res.status(201).json(project);
    }
    catch (error) {
        console.error('Create project error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getProjects(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    try {
        const projects = await db_1.prisma.project.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(projects);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function updateProject(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const { name, description } = req.body;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    try {
        // Verify project belongs to tenant
        const project = await db_1.prisma.project.findFirst({
            where: { id, tenantId },
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const updated = await db_1.prisma.project.update({
            where: { id },
            data: {
                name: name ? name.trim() : project.name,
                description: description !== undefined ? description.trim() : project.description,
            },
        });
        await (0, logger_1.logActivity)('project_updated', `Project "${updated.name}" details updated`, authReq.user?.id, tenantId);
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function deleteProject(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    try {
        // Verify project belongs to tenant
        const project = await db_1.prisma.project.findFirst({
            where: { id, tenantId },
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        await db_1.prisma.project.delete({
            where: { id },
        });
        await (0, logger_1.logActivity)('project_deleted', `Project "${project.name}" was deleted`, authReq.user?.id, tenantId);
        return res.json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
