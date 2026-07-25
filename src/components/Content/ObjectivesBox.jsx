// Accepts two item shapes for backward compatibility with un-migrated files:
//   - legacy: plain strings like "01\nComprendre l'idée générale…"
//   - new schema: { num: "01", text: "Comprendre l'idée générale…" }
function normalizeItem(item) {
  if (item && typeof item === 'object') {
    return { num: item.num || '', text: item.text || '' };
  }
  if (typeof item === 'string') {
    const [first, ...rest] = item.split('\n');
    if (rest.length > 0) {
      return { num: first, text: rest.join('\n') };
    }
    return { num: '', text: item };
  }
  return { num: '', text: '' };
}

export default function ObjectivesBox({ title, items, 'data-block-index': blockIndex }) {
  const normalized = (items || []).map(normalizeItem);
  return (
    <div className="objectives-box" data-block-index={blockIndex}>
      <h3 className="objectives-box__title" dangerouslySetInnerHTML={{ __html: title || 'Objectifs de cette leçon' }} />
      <ul className="objectives-box__list">
        {normalized.map((item, i) => (
          <li key={i} className="objectives-box__item">
            {item.num && <span className="objectives-box__num">{item.num}</span>}
            <span className="objectives-box__text" dangerouslySetInnerHTML={{ __html: item.text }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

