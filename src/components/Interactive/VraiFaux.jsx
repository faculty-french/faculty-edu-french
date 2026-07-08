export default function VraiFaux({ question, value, onChange }) {
  const stopEvent = (e) => e.stopPropagation();

  const hasAnswer = question.answer !== undefined && question.answer !== null;
  const hasSelected = value !== undefined && value !== null && value !== '';

  let vraiClass = '';
  let fauxClass = '';
  let feedbackLabel = null;

  if (hasAnswer && hasSelected) {
    const isCorrect = value === question.answer;
    
    if (question.answer === 'vrai') {
      vraiClass = 'vrai-faux-btn--correct';
      fauxClass = value === 'faux' ? 'vrai-faux-btn--incorrect' : '';
    } else {
      fauxClass = 'vrai-faux-btn--correct';
      vraiClass = value === 'vrai' ? 'vrai-faux-btn--incorrect' : '';
    }

    if (isCorrect) {
      feedbackLabel = <span className="vrai-faux-feedback vrai-faux-feedback--correct">Correct ✓</span>;
    } else {
      feedbackLabel = <span className="vrai-faux-feedback vrai-faux-feedback--incorrect">Incorrect</span>;
    }
  } else {
    vraiClass = value === 'vrai' ? 'vrai-faux-btn--selected-vrai' : '';
    fauxClass = value === 'faux' ? 'vrai-faux-btn--selected-faux' : '';
  }

  return (
    <div className="question-block" id={`question-${question.id}`}>
      <p className="question-block__text">{question.text}</p>
      <div className="vrai-faux-options">
        <button
          className={`vrai-faux-btn ${vraiClass}`}
          onClick={() => onChange(question.id, 'vrai')}
          onPointerDown={stopEvent}
          onMouseDown={stopEvent}
          onTouchStart={stopEvent}
          type="button"
        >
          ✓ Vrai
        </button>
        <button
          className={`vrai-faux-btn ${fauxClass}`}
          onClick={() => onChange(question.id, 'faux')}
          onPointerDown={stopEvent}
          onMouseDown={stopEvent}
          onTouchStart={stopEvent}
          type="button"
        >
          ✗ Faux
        </button>
        {feedbackLabel}
      </div>
    </div>
  );
}
