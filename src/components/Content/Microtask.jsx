// data-block-index sits on the text element, not the wrapper: highlight offsets are
// measured against the block's textContent, and the wrapper also contains the
// "Micro-tâche N" label and the timer, which would shift every offset.
export default function Microtask({ number, text, duration, 'data-block-index': blockIndex }) {
  return (
    <div className="microtask">
      <span className="microtask__label">Micro-tâche {number}</span>
      <p className="microtask__text" data-block-index={blockIndex} dangerouslySetInnerHTML={{ __html: text }} />
      {duration && <span className="microtask__timer">{duration}</span>}
    </div>
  );
}
