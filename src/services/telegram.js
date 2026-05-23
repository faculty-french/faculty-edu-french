import { CONFIG } from '../config/config';
import { formatDateFr, splitMessage } from './utils';

export async function sendToTelegram(studentName, lessonTitle, questions, answers) {
  const header = `📚 *Soumission de devoir*\n👤 Étudiant: ${studentName}\n📖 Leçon: ${lessonTitle}\n📅 Date: ${formatDateFr()}\n\n`;

  let body = '';
  questions.forEach((q, i) => {
    const answer = answers[q.id]?.value || '—';
    const emoji = q.type === 'open-ended' ? '✍️' : '✅';
    body += `*Question ${i + 1}:* ${q.text}\n${emoji} Réponse: ${answer}\n\n`;
  });

  body += `---\nTotal: ${questions.length} questions`;

  const fullMessage = header + body;
  const parts = splitMessage(fullMessage);

  for (let i = 0; i < parts.length; i++) {
    const response = await fetch(
      `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.TELEGRAM_CHAT_ID,
          text: parts[i],
          parse_mode: 'Markdown'
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.description || `Erreur HTTP ${response.status}`);
    }
  }

  return true;
}
