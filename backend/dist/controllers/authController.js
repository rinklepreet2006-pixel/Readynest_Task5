"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTenant = registerTenant;
exports.login = login;
exports.refreshToken = refreshToken;
exports.createMember = createMember;
exports.getTenantMembers = getTenantMembers;
exports.updateSubscription = updateSubscription;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production-12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'another-super-secret-refresh-key-98765';
async function registerTenant(req, res) {
    const { tenantName, subdomain, adminName, adminEmail, adminPassword } = req.body;
    if (!tenantName || !subdomain || !adminName || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        // Check if tenant subdomain exists
        const existingTenant = await db_1.prisma.tenant.findUnique({
            where: { subdomain: subdomain.toLowerCase().trim() },
        });
        if (existingTenant) {
            return res.status(400).json({ error: 'Subdomain is already taken' });
        }
        // Check if user exists
        const existingUser = await db_1.prisma.user.findUnique({
            where: { email: adminEmail.toLowerCase().trim() },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
        // Transaction to create Tenant and Admin User
        const result = await db_1.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName.trim(),
                    subdomain: subdomain.toLowerCase().trim(),
                },
            });
            const admin = await tx.user.create({
                data: {
                    name: adminName.trim(),
                    email: adminEmail.toLowerCase().trim(),
                    passwordHash: hashedPassword,
                    role: 'tenant_admin',
                    tenantId: tenant.id,
                },
            });
            return { tenant, admin };
        });
        // Log the tenant creation
        await (0, logger_1.logActivity)('tenant_created', `Tenant "${tenantName}" registered with admin "${adminEmail}"`, result.admin.id, result.tenant.id);
        return res.status(201).json({
            message: 'Tenant and Admin registered successfully',
            tenant: { id: result.tenant.id, name: result.tenant.name, subdomain: result.tenant.subdomain },
        });
    }
    catch (error) {
        console.error('Tenant registration error:', error);
        return res.status(500).json({ error: 'Internal server error during registration' });
    }
}
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { tenant: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate tokens
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        await (0, logger_1.logActivity)('user_login', `User ${user.email} logged in`, user.id, user.tenantId);
        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                tenantName: user.tenant.name,
                tenantSubdomain: user.tenant.subdomain,
                tenantSubscription: user.tenant.subscription,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
}
async function refreshToken(req, res) {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        // Verify user and tenant still exist
        const user = await db_1.prisma.user.findUnique({
            where: { id: decoded.id },
            include: { tenant: true },
        });
        if (!user) {
            return res.status(403).json({ error: 'User no longer exists' });
        }
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }, JWT_SECRET, { expiresIn: '15m' });
        return res.json({ accessToken });
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
}
// Route accessible only by tenant_admin to invite/register members
async function createMember(req, res) {
    const authReq = req;
    const { name, email, password, role } = req.body;
    const tenantId = authReq.user?.tenantId;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    try {
        // Check if user already exists
        const existingUser = await db_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await db_1.prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                passwordHash: hashedPassword,
                role: role === 'tenant_admin' ? 'tenant_admin' : 'member',
                tenantId,
            },
        });
        await (0, logger_1.logActivity)('member_created', `Admin created new member "${email}" with role "${role}"`, authReq.user?.id, tenantId);
        return res.status(201).json({
            message: 'Member user created successfully',
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    }
    catch (error) {
        console.error('Create member error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
// Get all users in the tenant
async function getTenantMembers(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    try {
        const users = await db_1.prisma.user.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        return res.json(users);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
// Update tenant subscription status (Mock billing)
async function updateSubscription(req, res) {
    const authReq = req;
    const tenantId = authReq.user?.tenantId;
    const { subscription } = req.body;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: missing tenant scope' });
    }
    if (!['free', 'premium', 'enterprise'].includes(subscription)) {
        return res.status(400).json({ error: 'Invalid subscription level' });
    }
    try {
        const updatedTenant = await db_1.prisma.tenant.update({
            where: { id: tenantId },
            data: { subscription },
        });
        await (0, logger_1.logActivity)('subscription_updated', `Subscription plan updated to "${subscription}"`, authReq.user?.id, tenantId);
        return res.json({
            message: 'Subscription updated successfully',
            subscription: updatedTenant.subscription,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}
