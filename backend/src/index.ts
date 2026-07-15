import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';

// Load config
dotenv.config();

// Initialize express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, match with frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// App configuration setup
const PORT = process.env.PORT || 5000;
app.set('io', io); // Expose Socket.io instance on express app

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Safety & Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Let frontend fetch uploads statically
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static upload assets
app.use('/uploads', express.static(uploadDir));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// Apply general limiter
app.use('/api/', generalLimiter);

// Controllers & Middlewares
import { authenticateToken } from './middleware/auth';
import { requireRole } from './middleware/role';
import {
  registerTenant,
  login,
  refreshToken,
  createMember,
  getTenantMembers,
  updateSubscription,
} from './controllers/authController';
import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
} from './controllers/projectController';
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from './controllers/taskController';
import { getDashboardStats } from './controllers/dashboardController';
import { getAuditLogs } from './controllers/auditController';
import { initBackgroundJobs } from './utils/cron';

// Authentication Endpoints
app.post('/api/auth/register-tenant', authLimiter, registerTenant);
app.post('/api/auth/login', authLimiter, login);
app.post('/api/auth/refresh-token', refreshToken);
app.post('/api/auth/create-member', authenticateToken, requireRole(['tenant_admin']), createMember);
app.get('/api/auth/members', authenticateToken, getTenantMembers);
app.put('/api/auth/subscription', authenticateToken, requireRole(['tenant_admin']), updateSubscription);

// Projects Endpoints
app.post('/api/projects', authenticateToken, createProject);
app.get('/api/projects', authenticateToken, getProjects);
app.put('/api/projects/:id', authenticateToken, updateProject);
app.delete('/api/projects/:id', authenticateToken, requireRole(['tenant_admin']), deleteProject);

// Tasks Endpoints
app.post('/api/tasks', authenticateToken, upload.single('file'), createTask);
app.get('/api/tasks', authenticateToken, getTasks);
app.put('/api/tasks/:id', authenticateToken, upload.single('file'), updateTask);
app.delete('/api/tasks/:id', authenticateToken, deleteTask);

// Dashboard Analytics Endpoint
app.get('/api/dashboard/stats', authenticateToken, getDashboardStats);

// Audit Logging Endpoint
app.get('/api/audit/logs', authenticateToken, requireRole(['tenant_admin']), getAuditLogs);

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
initBackgroundJobs();

// Global JSON error response handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Middleware]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred',
  });
});

// Fire up server
server.listen(PORT, () => {
  console.log(`[Server] TenantFlow platform active on http://localhost:${PORT}`);
});
