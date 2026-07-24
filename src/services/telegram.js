import { CONFIG } from '../config/config';

export async function sendToTelegram(studentName, lessonTitle, questions, answers) {
  // A multiple-choice answer is stored as the option's id ("b"), which is meaningless
  // on its own in Telegram — resolve it to the option's own wording. Where the lesson
  // declares the expected answer, also mark whether the student got it right.
  const describe = (q, raw) => {
    if (q.type === 'multiple-choice' && Array.isArray(q.options)) {
      const opt = q.options.find((o) => o.id === raw);
      if (opt) return `${opt.label ?? opt.id}) ${opt.text}`;
    }
    return raw;
  };

  const payload = {
    studentName,
    lessonId: questions[0]?.lessonId || '',
    lessonTitle,
    submittedAt: new Date().toISOString(),
    answers: questions.map((q, i) => {
      const raw = answers[q.id]?.value ?? '';
      const gradable = q.type === 'multiple-choice' || q.type === 'vrai-faux';
      return {
        index: i + 1,
        type: q.type || 'open-ended',
        question: q.text || '',
        answer: String(describe(q, raw)),
        correct: gradable && q.answer != null && raw !== '' ? raw === q.answer : null
      };
    })
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
