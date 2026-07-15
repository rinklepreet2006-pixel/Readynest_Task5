"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const secret = process.env.JWT_SECRET || 'super-secret-key-change-in-production-12345';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Verify tenant exists
        const tenantExists = await db_1.prisma.tenant.findUnique({
            where: { id: decoded.tenantId },
        });
        if (!tenantExists) {
            return res.status(403).json({ error: 'Tenant organization no longer exists' });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired access token' });
    }
}
