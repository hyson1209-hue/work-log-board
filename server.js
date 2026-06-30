const http = require('http');
const fs = require('fs');
const path = require('path');

const { createApp } = require('./lib/handlers');
const { createFileStorage } = require('./lib/file-storage');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'logs.json');
const AUDIT_FILE = process.env.AUDIT_FILE || path.join(DATA_DIR, 'audit.json');

const storage = createFileStorage({ dataFile: DATA_FILE, auditFile: AUDIT_FILE });
const app = createApp({ storage, adminPassword: ADMIN_PASSWORD });

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const handled = await app(req, res);
  if (handled) {
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const safePath = reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveStatic(res, filePath);
  } else {
    serveStatic(res, path.join(PUBLIC_DIR, 'index.html'));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
