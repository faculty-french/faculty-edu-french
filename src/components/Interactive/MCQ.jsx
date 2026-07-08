export default function MCQ({ question, value, onChange }) {
  const stopEvent = (e) => e.stopPropagation();

  const hasAnswer = question.answer !== undefined && question.answer !== null;
  const hasSelected = value !== undefined && value !== null && value !== '';

  return (
    <div className="question-block" id={`question-${question.id}`}>
      <p className="question-block__text">{question.text}</p>
      <div className="mcq-options">
        {question.options.map((option) => {
          const isSelected = value === option.id;
          let stateClass = '';
          let feedbackLabel = null;

          if (hasAnswer && hasSelected) {
            const isCorrectOption = option.id === question.answer;
            if (isCorrectOption) {
              stateClass = 'mcq-option--correct';
              if (isSelected) {
                feedbackLabel = <span className="mcq-feedback mcq-feedback--correct">Correct ✓</span>;
              }
            } else if (isSelected) {
              stateClass = 'mcq-option--incorrect';
              feedbackLabel = <span className="mcq-feedback mcq-feedback--incorrect">Incorrect</span>;
            }
          } else if (isSelected) {
            stateClass = 'mcq-option--selected';
          }

          return (
            <button
              key={option.id}
              className={`mcq-option ${stateClass}`}
              onClick={() => onChange(question.id, option.id)}
              onPointerDown={stopEvent}
              onMouseDown={stopEvent}
              onTouchStart={stopEvent}
              type="button"
            >
              <span className="mcq-option__label">{option.label}</span>
              <span className="mcq-option__text">{option.text}</span>
              {feedbackLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
