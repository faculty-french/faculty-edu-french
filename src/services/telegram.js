import { CONFIG } from '../config/config';

export async function sendToTelegram(studentName, lessonTitle, questions, answers) {
  const payload = {
    studentName,
    lessonId: questions[0]?.lessonId || '',
    lessonTitle,
    submittedAt: new Date().toISOString(),
    answers: questions.map((q, i) => ({
      index: i + 1,
      type: q.type || 'open-ended',
      question: q.text || '',
      answer: answers[q.id]?.value || ''
    }))
  };

  let response;
  try {
    response = await fetch(`${CONFIG.RELAY_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('Délai d\'attente dépassé (20s). Veuillez vérifier votre connexion internet et réessayer.');
    }
    throw new Error('Impossible de contacter le serveur de relais. Veuillez vérifier votre connexion.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || errorData.warning || `Erreur serveur (${response.status})`;
    throw new Error(message);
  }

  return true;
}
