import * as dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Server configuration
const PORT = parseInt(process.env['PORT'] || '3000', 10);
const HOST = '0.0.0.0';

// Create basic HTTP server
const server = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Root endpoint
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        name: 'Serapeum API',
        version: '1.0.0',
        status: 'running',
        message: 'AI orchestration service powered by Genkit',
      })
    );
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Serapeum API server started`);
  console.log(`📍 Listening on http://${HOST}:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`\n✨ Server is ready to accept connections`);
});

// Graceful shutdown handling
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
