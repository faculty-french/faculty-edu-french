import { useState, useEffect, useRef } from 'react';

export default function OpenEnded({ question, value, onChange }) {
  const stopEvent = (e) => e.stopPropagation();

  const lineCount = Math.max(question.lines || 0, 4);

  const [localLines, setLocalLines] = useState(() => {
    const initialLines = value ? value.split('\n') : [];
    while (initialLines.length < lineCount) {
      initialLines.push('');
    }
    return initialLines;
  });

  const localLinesRef = useRef(localLines);
  localLinesRef.current = localLines;

  const questionIdRef = useRef(question.id);
  questionIdRef.current = question.id;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const hasFocusedInput = useRef(false);
  const lastSyncedValue = useRef(value || '');

  // Keep local state in sync with external value changes (e.g. from storage/reset)
  useEffect(() => {
    const lines = value ? value.split('\n') : [];
    while (lines.length < lineCount) {
      lines.push('');
    }
    const isDifferent = lines.some((val, idx) => val !== localLines[idx]);
    if (isDifferent && !hasFocusedInput.current) {
      setLocalLines(lines);
      lastSyncedValue.current = value || '';
    }
  }, [value, lineCount]);

  // Sync on unmount
  useEffect(() => {
    return () => {
      const currentValue = localLinesRef.current.join('\n');
      if (currentValue !== lastSyncedValue.current) {
        onChangeRef.current(questionIdRef.current, currentValue);
      }
    };
  }, []);

  const handleLineChange = (index, newValue) => {
    const newLines = [...localLines];
    newLines[index] = newValue;
    setLocalLines(newLines);
  };

  const handleFocus = () => {
    hasFocusedInput.current = true;
  };

  const handleBlur = (e) => {
    // Only call onChange if focus leaves the container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      hasFocusedInput.current = false;
      const currentValue = localLines.join('\n');
      if (currentValue !== lastSyncedValue.current) {
        lastSyncedValue.current = currentValue;
        onChange(question.id, currentValue);
      }
    }
  };

  const isAnswered = localLines.some(line => line.trim().length > 0);

  return (
    <div className="question-block" id={`question-${question.id}`}>
      <p className="question-block__text">{question.text}</p>
      <div 
        className={`open-ended__lines ${isAnswered ? 'open-ended__lines--answered' : ''}`}
        onPointerDown={stopEvent}
        onMouseDown={stopEvent}
        onTouchStart={stopEvent}
        onBlur={handleBlur}
      >
        {Array.from({ length: lineCount }).map((_, idx) => (
          <input
            key={idx}
            type="text"
            className="open-ended__line"
            value={localLines[idx] || ''}
            onChange={(e) => handleLineChange(idx, e.target.value)}
            onFocus={handleFocus}
            onClick={(e) => {
              e.stopPropagation();
              e.target.focus();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.target.focus();
            }}
            placeholder={idx === 0 ? "Votre réponse ici…" : ""}
          />
        ))}
      </div>
    </div>
  );
}
