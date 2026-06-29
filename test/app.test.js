const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const tempDataFile = path.join(os.tmpdir(), `work-log-${Date.now()}.json`);
const tempAuditFile = path.join(os.tmpdir(), `work-log-audit-${Date.now()}.json`);
let server;

function waitForServer(url, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeout) {
            reject(new Error('Server did not start in time'));
            return;
          }
          setTimeout(tryConnect, 200);
        });
    };
    tryConnect();
  });
}

test.before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3100', DATA_FILE: tempDataFile, AUDIT_FILE: tempAuditFile },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await waitForServer('http://127.0.0.1:3100/api/health');
});

test.after(() => {
  if (server) {
    server.kill('SIGTERM');
  }
  if (fs.existsSync(tempDataFile)) {
    fs.unlinkSync(tempDataFile);
  }
  if (fs.existsSync(tempAuditFile)) {
    fs.unlinkSync(tempAuditFile);
  }
});

test('POST /api/logs stores a TV entry and GET filters by date/channel/worker', async () => {
  const postRes = await fetch('http://127.0.0.1:3100/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: '2026-06-29',
      channel: 'TV',
      worker: '홍길동',
      title: '테스트 업무',
      content: '테스트 내용'
    })
  });

  assert.equal(postRes.status, 201);

  const getRes = await fetch('http://127.0.0.1:3100/api/logs?date=2026-06-29&channel=TV&worker=홍길동');
  assert.equal(getRes.status, 200);

  const items = await getRes.json();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, '테스트 업무');
  assert.equal(items[0].channel, 'TV');
});

test('PUT /api/logs/:id updates an existing entry', async () => {
  const postRes = await fetch('http://127.0.0.1:3100/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: '2026-07-01',
      channel: 'RADIO',
      worker: '김철수',
      title: '원본 제목',
      content: '원본 내용'
    })
  });
  const created = await postRes.json();

  const putRes = await fetch(`http://127.0.0.1:3100/api/logs/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: '2026-07-01',
      channel: 'RADIO',
      worker: '김철수',
      title: '수정 제목',
      content: '수정 내용'
    })
  });

  assert.equal(putRes.status, 200);
  const updated = await putRes.json();
  assert.equal(updated.id, created.id);
  assert.equal(updated.title, '수정 제목');
  assert.equal(updated.content, '수정 내용');

  const getRes = await fetch('http://127.0.0.1:3100/api/logs?date=2026-07-01&channel=RADIO&worker=김철수');
  const items = await getRes.json();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, '수정 제목');
});

test('POST rejects a duplicate date+channel with 409', async () => {
  const first = await fetch('http://127.0.0.1:3100/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-08-01', channel: 'TV', worker: '홍길동', title: '첫번째', content: 'a' })
  });
  assert.equal(first.status, 201);

  const second = await fetch('http://127.0.0.1:3100/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-08-01', channel: 'TV', worker: '이영희', title: '두번째', content: 'b' })
  });
  assert.equal(second.status, 409);

  const getRes = await fetch('http://127.0.0.1:3100/api/logs?date=2026-08-01&channel=TV');
  const items = await getRes.json();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, '첫번째');
});

test('admin approval requires auth; editing resets approval', async () => {
  const created = await (
    await fetch('http://127.0.0.1:3100/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-01', channel: 'RADIO', worker: '홍길동', title: '점검', content: 'c' })
    })
  ).json();

  const noAuth = await fetch(`http://127.0.0.1:3100/api/logs/${created.id}/approval`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved: true })
  });
  assert.equal(noAuth.status, 401);

  const badLogin = await fetch('http://127.0.0.1:3100/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong' })
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch('http://127.0.0.1:3100/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin1234' })
  });
  assert.equal(login.status, 200);
  const { token } = await login.json();

  const approve = await fetch(`http://127.0.0.1:3100/api/logs/${created.id}/approval`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ approved: true })
  });
  assert.equal(approve.status, 200);
  const approved = await approve.json();
  assert.equal(approved.approved, true);
  assert.ok(approved.approvedAt);

  const edited = await (
    await fetch(`http://127.0.0.1:3100/api/logs/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-01', channel: 'RADIO', worker: '홍길동', title: '점검 수정', content: 'c2' })
    })
  ).json();
  assert.equal(edited.approved, false);
  assert.equal(edited.approvedAt, null);
});

test('admin can delete a log; audit records and requires auth', async () => {
  const created = await (
    await fetch('http://127.0.0.1:3100/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-10-01', channel: 'TV', worker: '홍길동', title: '삭제대상', content: 'x' })
    })
  ).json();

  const noAuth = await fetch(`http://127.0.0.1:3100/api/logs/${created.id}`, { method: 'DELETE' });
  assert.equal(noAuth.status, 401);

  const { token } = await (
    await fetch('http://127.0.0.1:3100/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin1234' })
    })
  ).json();

  const del = await fetch(`http://127.0.0.1:3100/api/logs/${created.id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token }
  });
  assert.equal(del.status, 200);

  const getRes = await fetch('http://127.0.0.1:3100/api/logs?date=2026-10-01&channel=TV');
  const items = await getRes.json();
  assert.equal(items.length, 0);

  const auditNoAuth = await fetch('http://127.0.0.1:3100/api/audit');
  assert.equal(auditNoAuth.status, 401);

  const audit = await (
    await fetch('http://127.0.0.1:3100/api/audit', { headers: { 'x-admin-token': token } })
  ).json();
  const actions = audit.filter((e) => e.logId === created.id).map((e) => e.action);
  assert.ok(actions.includes('create'));
  assert.ok(actions.includes('delete'));
});
