import ReadingPassage from '../Content/ReadingPassage';
import ObjectivesBox from '../Content/ObjectivesBox';
import VideoPlayer from '../Content/VideoPlayer';
import QuestionRenderer from '../Interactive/QuestionRenderer';
import IndexPage from '../Content/IndexPage';
import SubmitButton from '../Interactive/SubmitButton';
import React from 'react';

const PageContent = React.forwardRef(({ page, questions, getAnswer, setAnswer, answers, validateAnswers, markSubmitted, isSubmitted }, ref) => {
  const studentName = React.useMemo(() => {
    try {
      const profile = localStorage.getItem('book_student_profile');
      return profile ? JSON.parse(profile).name : 'Étudiant';
    } catch { return 'Étudiant'; }
  }, []);

  const formatText = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/{name}/g, studentName);
  };

  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading':
        const Tag = `h${block.level || 2}`;
        return <Tag key={index} className={`page__heading page__heading--${block.level || 2}`} dangerouslySetInnerHTML={{ __html: formatText(block.text) }} />;
      case 'paragraph':
        return <ReadingPassage key={index} text={formatText(block.text)} />;
      case 'quote':
        return <blockquote key={index} className="page__quote" dangerouslySetInnerHTML={{ __html: formatText(block.text) }} />;
      case 'objectives':
        return <ObjectivesBox key={index} title={formatText(block.text)} items={(block.items || []).map(formatText)} />;
      case 'instruction':
        return <p key={index} className="page__instruction" dangerouslySetInnerHTML={{ __html: formatText(block.text) }} />;
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
  const pageClass = `page ${isEven ? 'page--left' : 'page--right'} ${page.layout ? `page--layout-${page.layout}` : ''}`;
  const pageNumberClass = `page__number ${isEven ? 'page__number--left' : 'page__number--right'}`;

  return (
    <div className={pageClass} ref={ref}>
      <div className="page__content-wrapper">
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
