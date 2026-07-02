const crypto = require('crypto');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
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

// Body may arrive as a parsed object (Vercel) or as a raw stream (Node http server).
function getBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(JSON.parse(req.body || '{}'));
      } catch (error) {
        return Promise.resolve({});
      }
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (error) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// content의 [비고] 섹션 본문을 추출한다 (다음 [섹션] 전까지).
function extractRemarks(content) {
  const lines = (content || '').split('\n');
  const start = lines.findIndex((line) => line.trim() === '[비고]');
  if (start === -1) return '';
  const collected = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\[.+\]$/.test(lines[i].trim())) break;
    collected.push(lines[i]);
  }
  return collected.join('\n').trim();
}

// Builds the shared API request handler. `storage` provides async
// readLogs/writeLogs/readAudit/writeAudit. `notify(log, remarks)`가 주어지면
// 비고가 새로 작성/변경된 일지를 저장할 때 호출된다(예: 텔레그램 전송).
// The returned function resolves to
// `true` when it handled an /api route, `false` otherwise (so the caller can
// fall back to serving static files).
function createApp({ storage, adminPassword, notify }) {
  const ADMIN_TOKEN = crypto.createHash('sha256').update(adminPassword).digest('hex');

  // 알림 실패가 일지 저장을 막지 않도록 조용히 무시한다.
  async function notifyRemarks(log, previousContent) {
    if (!notify) return;
    const remarks = extractRemarks(log.content);
    if (!remarks || remarks === extractRemarks(previousContent)) return;
    try {
      await notify(log, remarks);
    } catch (error) {
      console.error('비고 알림 전송 실패:', error);
    }
  }

  async function recordAudit(action, log, actor) {
    const entries = await storage.readAudit();
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
    await storage.writeAudit(entries.slice(0, 1000));
  }

  return async function handle(req, res) {
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    if (!pathname.startsWith('/api/')) {
      return false;
    }

    if (req.method === 'GET' && pathname === '/api/logs') {
      const filters = {
        date: reqUrl.searchParams.get('date') || '',
        channel: reqUrl.searchParams.get('channel') || '',
        worker: reqUrl.searchParams.get('worker') || ''
      };
      sendJson(res, 200, filterLogs(await storage.readLogs(), filters));
      return true;
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === 'GET' && pathname === '/api/audit') {
      if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        sendJson(res, 401, { error: '관리자 권한이 필요합니다.' });
        return true;
      }
      sendJson(res, 200, await storage.readAudit());
      return true;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/logs/')) {
      if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        sendJson(res, 401, { error: '관리자 권한이 필요합니다.' });
        return true;
      }
      const id = decodeURIComponent(pathname.slice('/api/logs/'.length));
      const logs = await storage.readLogs();
      const index = logs.findIndex((log) => log.id === id);
      if (index === -1) {
        sendJson(res, 404, { error: 'Not found' });
        return true;
      }
      const [removed] = logs.splice(index, 1);
      await storage.writeLogs(logs);
      await recordAudit('delete', removed, '관리자');
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/login') {
      const data = await getBody(req);
      if (data.password === adminPassword) {
        sendJson(res, 200, { token: ADMIN_TOKEN });
      } else {
        sendJson(res, 401, { error: '비밀번호가 올바르지 않습니다.' });
      }
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/logs') {
      const data = await getBody(req);
      const entry = {
        id: Date.now().toString(36),
        date: readDate(data.date),
        channel: (data.channel || 'TV').toUpperCase(),
        worker: data.worker || '미입력',
        title: data.title || '제목 없음',
        content: data.content || '',
        createdAt: new Date().toISOString()
      };

      const logs = await storage.readLogs();
      const duplicate = logs.find((log) => log.date === entry.date && log.channel === entry.channel);
      if (duplicate) {
        sendJson(res, 409, { error: '이미 해당 날짜·매체의 일지가 있습니다. 기존 일지를 수정해주세요.' });
        return true;
      }

      logs.unshift(entry);
      await storage.writeLogs(logs);
      await recordAudit('create', entry, entry.worker);
      await notifyRemarks(entry, '');
      sendJson(res, 201, entry);
      return true;
    }

    const approvalMatch = pathname.match(/^\/api\/logs\/([^/]+)\/approval$/);
    if (req.method === 'PUT' && approvalMatch) {
      if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        sendJson(res, 401, { error: '관리자 권한이 필요합니다.' });
        return true;
      }
      const id = decodeURIComponent(approvalMatch[1]);
      const data = await getBody(req);
      const logs = await storage.readLogs();
      const index = logs.findIndex((log) => log.id === id);
      if (index === -1) {
        sendJson(res, 404, { error: 'Not found' });
        return true;
      }
      const approved = Boolean(data.approved);
      logs[index] = {
        ...logs[index],
        approved,
        approvedAt: approved ? new Date().toISOString() : null
      };
      await storage.writeLogs(logs);
      await recordAudit(approved ? 'approve' : 'unapprove', logs[index], '관리자');
      sendJson(res, 200, logs[index]);
      return true;
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/logs/')) {
      const id = decodeURIComponent(pathname.slice('/api/logs/'.length));
      const data = await getBody(req);
      const logs = await storage.readLogs();
      const index = logs.findIndex((log) => log.id === id);
      if (index === -1) {
        sendJson(res, 404, { error: 'Not found' });
        return true;
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
      await storage.writeLogs(logs);
      await recordAudit('update', updated, updated.worker);
      await notifyRemarks(updated, existing.content);
      sendJson(res, 200, updated);
      return true;
    }

    sendJson(res, 404, { error: 'Not found' });
    return true;
  };
}

module.exports = { createApp };
