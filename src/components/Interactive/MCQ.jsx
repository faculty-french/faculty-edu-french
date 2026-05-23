export default function MCQ({ question, value, onChange }) {
  const stopEvent = (e) => e.stopPropagation();

  return (
    <div className="question-block" id={`question-${question.id}`}>
      <p className="question-block__text">{question.text}</p>
      <div className="mcq-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            className={`mcq-option ${value === option.id ? 'mcq-option--selected' : ''}`}
            onClick={() => onChange(question.id, option.id)}
            onPointerDown={stopEvent}
            onMouseDown={stopEvent}
            onTouchStart={stopEvent}
            type="button"
          >
            <span className="mcq-option__label">{option.label}</span>
            <span className="mcq-option__text">{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
