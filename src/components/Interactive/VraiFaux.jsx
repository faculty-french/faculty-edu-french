export default function VraiFaux({ question, value, onChange }) {
  const stopEvent = (e) => e.stopPropagation();

  return (
    <div className="question-block" id={`question-${question.id}`}>
      <p className="question-block__text">{question.text}</p>
      <div className="vrai-faux-options">
        <button
          className={`vrai-faux-btn ${value === 'vrai' ? 'vrai-faux-btn--selected-vrai' : ''}`}
          onClick={() => onChange(question.id, 'vrai')}
          onPointerDown={stopEvent}
          onMouseDown={stopEvent}
          onTouchStart={stopEvent}
          type="button"
        >
          ✓ Vrai
        </button>
        <button
          className={`vrai-faux-btn ${value === 'faux' ? 'vrai-faux-btn--selected-faux' : ''}`}
          onClick={() => onChange(question.id, 'faux')}
          onPointerDown={stopEvent}
          onMouseDown={stopEvent}
          onTouchStart={stopEvent}
          type="button"
        >
          ✗ Faux
        </button>
      </div>
    </div>
  );
}
