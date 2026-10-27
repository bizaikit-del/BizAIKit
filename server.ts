import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.js';
import { authRouter } from './server/routes/auth.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { studentsRouter } from './server/routes/students.js';
import { classesRouter } from './server/routes/classes.js';
import { teachersRouter } from './server/routes/teachers.js';
import { attendanceRouter } from './server/routes/attendance.js';
import { assessmentsRouter } from './server/routes/assessments.js';
import { settingsRouter } from './server/routes/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database and tables
initDatabase();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Bizaikit School Management System',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routers
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/students', studentsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/settings', settingsRouter);

// Global API error handler
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

// Vite or static serving
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bizaikit SMS] Server running on http://0.0.0.0:${PORT} (${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Startup Error]:', err);
  process.exit(1);
});
