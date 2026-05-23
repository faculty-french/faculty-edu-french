export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function formatDateFr(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function isBlankAnswer(value) {
  return !value || value.trim().length === 0;
}

export function splitMessage(text, maxLength = 4096) {
  if (text.length <= maxLength) return [text];
  const parts = [];
  let remaining = text;
  while (remaining.length > 0) {
    let chunk = remaining.substring(0, maxLength);
    const lastNewline = chunk.lastIndexOf('\n');
    if (lastNewline > maxLength * 0.5 && remaining.length > maxLength) {
      chunk = remaining.substring(0, lastNewline);
    }
    parts.push(chunk);
    remaining = remaining.substring(chunk.length);
  }
  return parts;
}

export function sanitizeInput(text) {
  if (!text) return '';
  return text.replace(/[<>]/g, '');
}
