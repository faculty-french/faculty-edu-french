import ReadingPassage from '../Content/ReadingPassage';
import ObjectivesBox from '../Content/ObjectivesBox';
import VideoPlayer from '../Content/VideoPlayer';
import PhaseBanner from '../Content/PhaseBanner';
import Consigne from '../Content/Consigne';
import Microtask from '../Content/Microtask';
import Keywords from '../Content/Keywords';
import InfoBox from '../Content/InfoBox';
import QuestionRenderer from '../Interactive/QuestionRenderer';
import IndexPage from '../Content/IndexPage';
import SubmitButton from '../Interactive/SubmitButton';
import BookCover from '../Content/BookCover';
import React from 'react';

const PHASE_LABELS = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3', 4: 'Phase 4' };

const PageContent = React.forwardRef(({ page, questions, getAnswer, setAnswer, answers, validateAnswers, markSubmitted, isSubmitted }, ref) => {
  const studentName = React.useMemo(() => {
    try {
      const profile = localStorage.getItem('book_student_profile');
      return profile ? JSON.parse(profile).name : 'Étudiant';
    } catch { return 'Étudiant'; }
  }, []);

  const contentRef = React.useRef(null);
  const [overflowing, setOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!import.meta.env.DEV) return;
    const el = contentRef.current;
    if (!el) return;
    const isOverflowing = el.scrollHeight - el.clientHeight > 2;
    setOverflowing(isOverflowing);
    if (isOverflowing) {
      // eslint-disable-next-line no-console
      console.warn('OVERFLOW page', page.id);
    }
  });

  const formatText = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/{name}/g, studentName);
  };

  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading': {
        const Tag = `h${block.level || 2}`;
        return <Tag key={index} className={`page__heading page__heading--${block.level || 2}`} dangerouslySetInnerHTML={{ __html: formatText(block.text) }} />;
      }
      case 'paragraph':
        return <ReadingPassage key={index} text={formatText(block.text)} />;
      case 'quote':
        return <blockquote key={index} className="page__quote" dangerouslySetInnerHTML={{ __html: formatText(block.text) }} />;
      case 'objectives':
        return (
          <ObjectivesBox
            key={index}
            title={formatText(block.title || block.text)}
            items={block.items || []}
          />
        );
      case 'instruction':
        return <p key={index} className="page__instruction" dangerouslySetInnerHTML={{ __html: formatText(block.text) }} />;
      case 'consigne':
        return <Consigne key={index} text={formatText(block.text)} />;
      case 'microtask':
        return <Microtask key={index} number={block.number} text={formatText(block.text)} duration={block.duration} />;
      case 'phase-banner':
        return <PhaseBanner key={index} phase={block.phase} title={formatText(block.title)} duration={block.duration} />;
      case 'keywords':
        return <Keywords key={index} title={formatText(block.title)} items={(block.items || []).map(formatText)} />;
      case 'info-box':
        return <InfoBox key={index} title={formatText(block.title)} sections={block.sections || []} />;
      case 'image':
        return (
          <figure key={index} className="page__image">
            <img src={block.imageUrl} alt={block.caption || ''} loading="lazy" />
            {block.caption && <figcaption className="page__image-caption">{formatText(block.caption)}</figcaption>}
          </figure>
        );
      case 'images-row':
        return (
          <div key={index} className="page__images-row">
            {(block.images || []).map((img, idx) => (
              <figure key={idx} className="page__image page__image--row-item">
                <img src={img.imageUrl} alt={img.caption || ''} loading="lazy" />
                {img.caption && <figcaption className="page__image-caption">{formatText(img.caption)}</figcaption>}
              </figure>
            ))}
          </div>
        );
      case 'video':
        return <VideoPlayer key={index} videoUrl={block.videoUrl} caption={formatText(block.caption)} />;
      case 'question': {
        const question = questions?.find(q => q.id === block.questionId);
        if (!question) return null;
        return (
          <QuestionRenderer
            key={index}
            question={question}
            value={getAnswer(question.id)}
            onChange={setAnswer}
          />
        );
      }
      case 'cover':
        return (
          <BookCover
            key={index}
            eyebrow={formatText(block.eyebrow)}
            title={formatText(block.title)}
            subtitle={formatText(block.subtitle)}
            modules={block.modules || []}
            author={formatText(block.author)}
            credential={formatText(block.credential)}
            year={block.year}
            welcome={formatText(block.welcome)}
          />
        );
      case 'index':
        return <IndexPage key={index} units={block.units} onNavigate={block.onNavigate} />;
      case 'divider':
        return <hr key={index} className="page__divider" />;
      case 'submit':
        return (
          <SubmitButton
            key={index}
            lessonId={block.lessonId}
            lessonTitle={block.lessonTitle}
            questions={questions}
            answers={answers}
            validateAnswers={validateAnswers}
            markSubmitted={markSubmitted}
            isSubmitted={isSubmitted}
          />
        );
      default:
        return null;
    }
  };

  const isEven = page.pageNumber ? page.pageNumber % 2 === 0 : false;
  const pageClass = [
    'page',
    isEven ? 'page--left' : 'page--right',
    page.layout ? `page--layout-${page.layout}` : '',
    page.phase ? `page--phase-${page.phase}` : '',
    overflowing ? 'page--overflow' : ''
  ].filter(Boolean).join(' ');
  const pageNumberClass = `page__number ${isEven ? 'page__number--left' : 'page__number--right'}`;

  return (
    <div className={pageClass} data-page-id={page.id} ref={ref}>
      {page.phase > 0 && (
        <span className={`page__phase-tab page__phase-tab--${page.phase}`}>{PHASE_LABELS[page.phase]}</span>
      )}
      <div className="page__content-wrapper" ref={contentRef}>
        {page.content.map((block, i) => renderBlock(block, i))}
      </div>
      {page.pageNumber && (
        <span className={pageNumberClass}>{page.pageNumber}</span>
      )}
    </div>
  );
});

PageContent.displayName = 'PageContent';
export default PageContent;
