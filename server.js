const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'logs.json');
const AUDIT_FILE = process.env.AUDIT_FILE || path.join(DATA_DIR, 'audit.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}
if (!fs.existsSync(AUDIT_FILE)) {
  fs.writeFileSync(AUDIT_FILE, '[]', 'utf8');
}

function readLogs() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read logs:', error.message);
    return [];
  }
}

function writeLogs(logs) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2));
}

function readAudit() {
  try {
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function recordAudit(action, log, actor) {
  const entries = readAudit();
  entries.unshift({
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    at: new Date().toISOString(),
    action,
    actor: actor || log.worker || '미상',
    logId: log.id,
    date: log.date,
    channel: log.channel,
    worker: log.worker,
    title: log.title
  });
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(entries.slice(0, 1000), null, 2));
}

function readDate(value) {
  return value || new Date().toISOString().slice(0, 10);
}

function filterLogs(logs, filters = {}) {
  return logs.filter((log) => {
    const matchDate = filters.date ? log.date === filters.date : true;
    const matchChannel = filters.channel ? log.channel === filters.channel.toUpperCase() : true;
    const matchWorker = filters.worker ? log.worker === filters.worker : true;
    return matchDate && matchChannel && matchWorker;
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

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

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && reqUrl.pathname === '/api/logs') {
    const filters = {
      date: reqUrl.searchParams.get('date') || '',
      channel: reqUrl.searchParams.get('channel') || '',
      worker: reqUrl.searchParams.get('worker') || ''
    };
    sendJson(res, 200, filterLogs(readLogs(), filters));
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/audit') {
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      sendJson(res, 401, { error: '관리자 권한이 필요합니다.' });
      return;
    }
    sendJson(res, 200, readAudit());
    return;
  }

  if (req.method === 'DELETE' && reqUrl.pathname.startsWith('/api/logs/')) {
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      sendJson(res, 401, { error: '관리자 권한이 필요합니다.' });
      return;
    }
    const id = decodeURIComponent(reqUrl.pathname.slice('/api/logs/'.length));
    const logs = readLogs();
    const index = logs.findIndex((log) => log.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    const [removed] = logs.splice(index, 1);
    writeLogs(logs);
    recordAudit('delete', removed, '관리자');
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/login') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (data.password === ADMIN_PASSWORD) {
          sendJson(res, 200, { token: ADMIN_TOKEN });
        } else {
          sendJson(res, 401, { error: '비밀번호가 올바르지 않습니다.' });
        }
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid payload' });
      }
    });
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/logs') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const entry = {
          id: Date.now().toString(36),
          date: readDate(data.date),
          channel: (data.channel || 'TV').toUpperCase(),
          worker: data.worker || '미입력',
          title: data.title || '제목 없음',
          content: data.content || '',
          createdAt: new Date().toISOString()
        };

        const logs = readLogs();
        const duplicate = logs.find((log) => log.date === entry.date && log.channel === entry.channel);
        if (duplicate) {
          sendJson(res, 409, { error: '이미 해당 날짜·매체의 일지가 있습니다. 기존 일지를 수정해주세요.' });
          return;
        }

        logs.unshift(entry);
        writeLogs(logs);
        recordAudit('create', entry, entry.worker);
        sendJson(res, 201, entry);
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid payload' });
      }
    });
    return;
  }

  const approvalMatch = reqUrl.pathname.match(/^\/api\/logs\/([^/]+)\/approval$/);
  if (req.method === 'PUT' && approvalMatch) {
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      sendJson(res, 401, { error: '관리자 권한이 필요합니다.' });
      return;
    }

    const id = decodeURIComponent(approvalMatch[1]);
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const logs = readLogs();
        const index = logs.findIndex((log) => log.id === id);
        if (index === -1) {
          sendJson(res, 404, { error: 'Not found' });
          return;
        }
        const approved = Boolean(data.approved);
        logs[index] = {
          ...logs[index],
          approved,
          approvedAt: approved ? new Date().toISOString() : null
        };
        writeLogs(logs);
        recordAudit(approved ? 'approve' : 'unapprove', logs[index], '관리자');
        sendJson(res, 200, logs[index]);
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid payload' });
      }
    });
    return;
  }

  if (req.method === 'PUT' && reqUrl.pathname.startsWith('/api/logs/')) {
    const id = decodeURIComponent(reqUrl.pathname.slice('/api/logs/'.length));
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const logs = readLogs();
        const index = logs.findIndex((log) => log.id === id);

        if (index === -1) {
          sendJson(res, 404, { error: 'Not found' });
          return;
        }

        const existing = logs[index];
        const updated = {
          ...existing,
          date: readDate(data.date),
          channel: (data.channel || existing.channel).toUpperCase(),
          worker: data.worker || existing.worker,
          title: data.title || existing.title,
          content: data.content || '',
          approved: false,
          approvedAt: null,
          updatedAt: new Date().toISOString()
        };

        logs[index] = updated;
        writeLogs(logs);
        recordAudit('update', updated, updated.worker);
        sendJson(res, 200, updated);
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid payload' });
      }
    });
    return;
  }

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
