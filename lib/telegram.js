// 일지 비고(특이사항)를 텔레그램으로 전송한다. 봇 토큰과 채팅 ID가 모두
// 설정된 경우에만 notifier를 만들고, 없으면 null을 반환해 알림을 끈다.
function createTelegramNotifier({ botToken, chatId }) {
  if (!botToken || !chatId) {
    return null;
  }

  return async function notify(log, remarks) {
    const channelName = log.channel === 'RADIO' ? '라디오' : 'TV';
    const text = [
      `📋 [${channelName}] ${log.date} 근무일지 비고`,
      `근무자: ${log.worker}`,
      '',
      remarks
    ].join('\n');

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Telegram 전송 실패 (${response.status}): ${detail.slice(0, 300)}`);
    }
  };
}

module.exports = { createTelegramNotifier };
