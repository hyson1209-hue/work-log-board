// Production storage backed by Upstash Redis (REST API). Logs and the audit
// trail are each stored as a single JSON string under one key. Uses the global
// fetch available in Node 18+, so no extra dependency is required.
function createRedisStorage({ url, token }) {
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수가 필요합니다.');
  }

  async function command(args) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    if (!response.ok) {
      throw new Error(`Upstash 요청 실패 (${response.status})`);
    }
    const data = await response.json();
    return data.result;
  }

  async function readArray(key) {
    const value = await command(['GET', key]);
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch (error) {
      return [];
    }
  }

  async function writeArray(key, arr) {
    await command(['SET', key, JSON.stringify(arr)]);
  }

  return {
    readLogs: () => readArray('logs'),
    writeLogs: (logs) => writeArray('logs', logs),
    readAudit: () => readArray('audit'),
    writeAudit: (entries) => writeArray('audit', entries)
  };
}

module.exports = { createRedisStorage };
