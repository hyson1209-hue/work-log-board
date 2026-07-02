const { createApp } = require('../lib/handlers');
const { createRedisStorage } = require('../lib/redis-storage');
const { createTelegramNotifier } = require('../lib/telegram');

const storage = createRedisStorage({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const app = createApp({
  storage,
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',
  notify: createTelegramNotifier({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  })
});

module.exports = async (req, res) => {
  try {
    const handled = await app(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    try {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify({ error: String((error && error.stack) || error) }));
    } catch (_) {
      // response already finished
    }
  }
};
