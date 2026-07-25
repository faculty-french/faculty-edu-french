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
import ModuleDivider from '../Content/ModuleDivider';
import LessonIntro from '../Content/LessonIntro';
import React from 'react';
import { useHighlighter } from '../../context/HighlighterContext';
import { highlightHtml, getTextOffsetInBlock } from '../../utils/highlightUtils';

const PHASE_LABELS = { 1: 'Phase 1', 2: 'Phase 2', 3: 'Phase 3', 4: 'Phase 4' };

// Decorative pages — covers, lesson "pages de garde", module dividers, the Sommaire.
// They are designed compositions rather than study text, and their blocks are rendered
// by components that do not carry highlightable text nodes, so a highlight stored
// against them would be saved but never painted.
const NON_HIGHLIGHTABLE_LAYOUTS = new Set(['cover', 'academic-cover', 'lesson-intro', 'divider', 'index']);

const PageContent = React.forwardRef(({ page, questions, getAnswer, setAnswer, answers, validateAnswers, markSubmitted, isSubmitted }, ref) => {
  const { isHighlightMode, highlights, addHighlights, removeHighlight } = useHighlighter();

  const studentName = React.useMemo(() => {
    try {
      const profile = localStorage.getItem('book_student_profile');
      return profile ? JSON.parse(profile).name : 'Étudiant';
    } catch { return 'Étudiant'; }
  }, []);

  const contentRef = React.useRef(null);
  const [overflowing, setOverflowing] = React.useState(false);
  const canHighlight = !NON_HIGHLIGHTABLE_LAYOUTS.has(page.layout);

  React.useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (import.meta.env.DEV) {
      const isOverflowing = el.scrollHeight - el.clientHeight > 2;
      setOverflowing(isOverflowing);
      if (isOverflowing) {
        // eslint-disable-next-line no-console
        console.warn('OVERFLOW page', page.id);
      }
    }
  }, [page.id, page.content, highlights, canHighlight]);

  // Highlights for this page, resolved during render so they are part of React's output.
  // Keys are strings so composite boxes can address each of their text leaves separately.
  const pageRanges = canHighlight ? (highlights[page.id] || []) : [];
  const withHighlights = (key, html) =>
    highlightHtml(html, pageRanges.filter(r => String(r.block) === String(key)), page.id, key);

  const handlePointerUp = React.useCallback((e) => {
    if (!isHighlightMode || !canHighlight) return;

    const mark = e.target.closest?.('mark.hl');
    if (mark && mark.dataset.pageId && mark.dataset.blockIndex != null) {
      const pId = mark.dataset.pageId;
      const bIdx = mark.dataset.blockIndex;
      const hlStart = Number(mark.dataset.hlStart);
      const hlEnd = Number(mark.dataset.hlEnd);
      removeHighlight(pId, bIdx, hlStart, hlEnd);
      window.getSelection()?.removeAllRanges();
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      if (!selectedText) return;

      const pageWrapper = contentRef.current;
      if (!pageWrapper) return;

      const blockElements = Array.from(pageWrapper.querySelectorAll('[data-block-index]'));
      const newRanges = [];

      for (const blockEl of blockElements) {
        if (!range.intersectsNode(blockEl)) continue;

        const blockKey = blockEl.dataset.blockIndex;
        const textLen = blockEl.textContent.length;
        if (textLen === 0) continue;

        let startOffset = 0;
        let endOffset = textLen;

        if (blockEl.contains(range.startContainer)) {
          startOffset = getTextOffsetInBlock(blockEl, range.startContainer, range.startOffset);
        }
        if (blockEl.contains(range.endContainer)) {
          endOffset = getTextOffsetInBlock(blockEl, range.endContainer, range.endOffset);
        }

        startOffset = Math.max(0, Math.min(textLen, startOffset));
        endOffset = Math.max(0, Math.min(textLen, endOffset));

        if (startOffset > endOffset) {
          const temp = startOffset;
          startOffset = endOffset;
          endOffset = temp;
        }

        if (startOffset < endOffset) {
          newRanges.push({ block: blockKey, start: startOffset, end: endOffset });
        }
      }

      if (newRanges.length > 0) {
        addHighlights(page.id, newRanges);
        selection.removeAllRanges();
      }
    }, 20);
  }, [isHighlightMode, canHighlight, page.id, addHighlights, removeHighlight]);

  const formatText = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/{name}/g, studentName);
  };

  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading': {
        const Tag = `h${block.level || 2}`;
        const isContinuation = typeof block.text === 'string' && block.text.trimEnd().endsWith('(suite)');
        const cls = `page__heading page__heading--${block.level || 2}${isContinuation ? ' page__heading--continuation' : ''}`;
        return <Tag key={index} data-block-index={index} className={cls} dangerouslySetInnerHTML={{ __html: withHighlights(index, formatText(block.text)) }} />;
      }
      case 'paragraph':
        return <ReadingPassage key={index} data-block-index={index} text={withHighlights(index, formatText(block.text))} />;
      case 'quote':
        return <blockquote key={index} data-block-index={index} className="page__quote" dangerouslySetInnerHTML={{ __html: withHighlights(index, formatText(block.text)) }} />;
      case 'objectives':
        return (
          <ObjectivesBox
            key={index}
            blockKey={index}
            hl={withHighlights}
            title={formatText(block.title || block.text)}
            items={block.items || []}
          />
        );
      case 'instruction': {
        if (typeof block.text === 'string' && !/[\p{L}\p{N}]/u.test(block.text)) return null;
        return <p key={index} data-block-index={index} className="page__instruction" dangerouslySetInnerHTML={{ __html: withHighlights(index, formatText(block.text)) }} />;
      }
      case 'consigne':
        return <Consigne key={index} data-block-index={index} text={withHighlights(index, formatText(block.text))} />;
      case 'microtask':
        return <Microtask key={index} data-block-index={index} number={block.number} text={withHighlights(index, formatText(block.text))} duration={block.duration} />;
      case 'phase-banner':
        return <PhaseBanner key={index} phase={block.phase} title={formatText(block.title)} duration={block.duration} />;
      case 'keywords':
        return <Keywords key={index} blockKey={index} hl={withHighlights} title={formatText(block.title)} items={(block.items || []).map(formatText)} />;
      case 'info-box': {
        const prev = page.content[index - 1];
        const hideTitle = !!prev && prev.type === 'heading'
          && typeof prev.text === 'string' && typeof block.title === 'string'
          && prev.text.trim() === block.title.trim();
        return <InfoBox key={index} blockKey={index} hl={withHighlights} title={formatText(block.title)} sections={block.sections || []} hideTitle={hideTitle} />;
      }
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
        const prev = page.content[index - 1];
        const hideText = !!prev && (prev.type === 'microtask' || prev.type === 'consigne')
          && typeof prev.text === 'string' && typeof question.text === 'string'
          && prev.text.trim() === question.text.trim();
        return (
          <QuestionRenderer
            key={index}
            question={question}
            value={getAnswer(question.id)}
            onChange={setAnswer}
            hideText={hideText}
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
      case 'module-divider':
        return <ModuleDivider key={index} module={block.module} title={formatText(block.title)} lessons={block.lessons || []} />;
      case 'lesson-intro':
        return <LessonIntro key={index} {...block} />;
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
            questions={(questions || []).filter(q => q.lessonId === block.lessonId)}
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
    page.module ? `page--module-${page.module}` : '',
    overflowing ? 'page--overflow' : ''
  ].filter(Boolean).join(' ');
  const pageNumberClass = `page__number ${isEven ? 'page__number--left' : 'page__number--right'}`;

  return (
    <div className={pageClass} data-page-id={page.id} ref={ref}>
      {page.phase > 0 && (
        <span className={`page__phase-tab page__phase-tab--${page.phase}`}>{PHASE_LABELS[page.phase]}</span>
      )}
      <div
        className="page__content-wrapper"
        ref={contentRef}
        onPointerUp={handlePointerUp}
      >
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
