"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load config
dotenv_1.default.config();
// Initialize express
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // In production, match with frontend URL
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});
// App configuration setup
const PORT = process.env.PORT || 5000;
app.set('io', io); // Expose Socket.io instance on express app
// Ensure upload directory exists
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Multer Config for local file storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
// Safety & Security Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false, // Let frontend fetch uploads statically
}));
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static upload assets
app.use('/uploads', express_1.default.static(uploadDir));
// Rate limiters
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many authentication attempts, please try again later.' },
});
// Apply general limiter
app.use('/api/', generalLimiter);
// Controllers & Middlewares
const auth_1 = require("./middleware/auth");
const role_1 = require("./middleware/role");
const authController_1 = require("./controllers/authController");
const projectController_1 = require("./controllers/projectController");
const taskController_1 = require("./controllers/taskController");
const dashboardController_1 = require("./controllers/dashboardController");
const auditController_1 = require("./controllers/auditController");
const cron_1 = require("./utils/cron");
// Authentication Endpoints
app.post('/api/auth/register-tenant', authLimiter, authController_1.registerTenant);
app.post('/api/auth/login', authLimiter, authController_1.login);
app.post('/api/auth/refresh-token', authController_1.refreshToken);
app.post('/api/auth/create-member', auth_1.authenticateToken, (0, role_1.requireRole)(['tenant_admin']), authController_1.createMember);
app.get('/api/auth/members', auth_1.authenticateToken, authController_1.getTenantMembers);
app.put('/api/auth/subscription', auth_1.authenticateToken, (0, role_1.requireRole)(['tenant_admin']), authController_1.updateSubscription);
// Projects Endpoints
app.post('/api/projects', auth_1.authenticateToken, projectController_1.createProject);
app.get('/api/projects', auth_1.authenticateToken, projectController_1.getProjects);
app.put('/api/projects/:id', auth_1.authenticateToken, projectController_1.updateProject);
app.delete('/api/projects/:id', auth_1.authenticateToken, (0, role_1.requireRole)(['tenant_admin']), projectController_1.deleteProject);
// Tasks Endpoints
app.post('/api/tasks', auth_1.authenticateToken, upload.single('file'), taskController_1.createTask);
app.get('/api/tasks', auth_1.authenticateToken, taskController_1.getTasks);
app.put('/api/tasks/:id', auth_1.authenticateToken, upload.single('file'), taskController_1.updateTask);
app.delete('/api/tasks/:id', auth_1.authenticateToken, taskController_1.deleteTask);
// Dashboard Analytics Endpoint
app.get('/api/dashboard/stats', auth_1.authenticateToken, dashboardController_1.getDashboardStats);
// Audit Logging Endpoint
app.get('/api/audit/logs', auth_1.authenticateToken, (0, role_1.requireRole)(['tenant_admin']), auditController_1.getAuditLogs);
// Real-time socket coordination
io.on('connection', (socket) => {
    const { tenantId, email } = socket.handshake.auth;
    if (tenantId) {
        socket.join(tenantId);
        console.log(`[Socket] Member "${email}" joined tenant channel "${tenantId}"`);
    }
    socket.on('disconnect', () => {
        console.log(`[Socket] Member "${email}" disconnected`);
    });
});
// Background task scheduler startup
(0, cron_1.initBackgroundJobs)();
// Global JSON error response handler
app.use((err, req, res, next) => {
    console.error('[Global Error Middleware]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error occurred',
    });
});
// Fire up server
server.listen(PORT, () => {
    console.log(`[Server] TenantFlow platform active on http://localhost:${PORT}`);
});
