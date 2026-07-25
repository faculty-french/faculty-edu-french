import { useState, useEffect } from 'react';
import { sendToTelegram } from '../../services/telegram';

export default function SubmitButton({
  lessonId,
  lessonTitle,
  questions = [],
  answers = {},
  validateAnswers,
  markSubmitted,
  isSubmitted
}) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error' | 'invalid'
  const [missingQuestions, setMissingQuestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const stopEvent = (e) => e.stopPropagation();

  useEffect(() => {
    if (isSubmitted && isSubmitted(lessonId)) {
      setAlreadySubmitted(true);
      setStatus('success');
    }
  }, [isSubmitted, lessonId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadySubmitted) return;

    // 1. Validate answers
    const validation = validateAnswers(questions);
    if (!validation.isComplete) {
      setMissingQuestions(validation.missing);
      setStatus('invalid');
      return;
    }

    // 2. Submit to Telegram
    setStatus('loading');
    setErrorMessage('');
    
    try {
      const studentName = (() => {
        try {
          const profile = localStorage.getItem('book_student_profile');
          return profile ? JSON.parse(profile).name : 'Étudiant anonyme';
        } catch { return 'Étudiant anonyme'; }
      })();

      // Use the synchronous answers returned from validation if available
      const currentAnswers = validation.answers || answers;
      await sendToTelegram(studentName, lessonTitle, questions, currentAnswers);
      
      markSubmitted(lessonId);
      setAlreadySubmitted(true);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la soumission.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="submission-success" onPointerDown={stopEvent} onMouseDown={stopEvent} onTouchStart={stopEvent}>
        <div className="submission-success__icon">🎉</div>
        <h4 className="submission-success__title">Devoir soumis avec succès !</h4>
        <p className="page__paragraph" style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Vos réponses ont été envoyées à l'enseignant. Merci !
        </p>
      </div>
    );
  }

  // The button renders BEFORE any notification, and the missing-question list is
  // compact (numbers, not full texts) with a capped height. The page is a fixed
  // 420x640 sheet with overflow:hidden — a full-text list of 30+ missing questions
  // used to push the button below the clip edge, leaving no way to retry without
  // reloading the site.
  return (
    <div className="submit-container" onPointerDown={stopEvent} onMouseDown={stopEvent} onTouchStart={stopEvent}>
      <button
        className={`submit-btn ${status === 'loading' ? 'submit-btn--loading' : ''}`}
        onClick={handleSubmit}
        disabled={status === 'loading'}
        type="button"
        id={`submit-btn-${lessonId}`}
      >
        {status === 'loading' ? 'Envoi en cours...' : 'Soumettre mes réponses'}
      </button>

      {status === 'invalid' && (() => {
        // Every question of the lesson is shown: answered ones green, unanswered ones
        // in the warning colour — the student sees progress, not only what is missing.
        const missingIds = new Set(missingQuestions.map((q) => q.questionId));
        return (
          <div className="validation-notification">
            <h4 className="validation-notification__title">
              ⚠️ {missingQuestions.length} question(s) sans réponse
            </h4>
            <p className="page__paragraph" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
              Répondez aux questions suivantes, puis appuyez de nouveau sur le bouton :
            </p>
            <div className="validation-notification__chips">
              {questions.map((q, idx) => {
                const done = !missingIds.has(q.id);
                return (
                  <span
                    key={q.id}
                    className={`validation-notification__chip${done ? ' validation-notification__chip--done' : ''}`}
                    title={done ? `Répondu — ${q.text}` : q.text}
                  >
                    {idx + 1}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      {status === 'error' && (
        <div className="validation-notification" style={{ borderColor: 'var(--color-error)', background: 'var(--color-error-bg)' }}>
          <h4 className="validation-notification__title" style={{ color: 'var(--color-error)' }}>⚠️ Échec de l'envoi</h4>
          <p className="page__paragraph" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
            {errorMessage}. Veuillez vérifier votre connexion internet et réessayer.
          </p>
        </div>
      )}
    </div>
  );
}
