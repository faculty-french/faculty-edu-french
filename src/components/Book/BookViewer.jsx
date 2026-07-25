import { useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import PageContent from './PageContent';
import { useHighlighter } from '../../context/HighlighterContext';

// Fixed logical "sheet" size. Every page is authored against this box; the
// whole book area is scaled with a CSS transform to fit whatever viewport
// space remains after the header/footer — this is what guarantees zero
// scrolling on any device.
export const SHEET_WIDTH = 420;
export const SHEET_HEIGHT = 640;

const BookViewer = forwardRef(({ pages, questions, getAnswer, setAnswer, answers, validateAnswers, markSubmitted, isSubmitted, onPageChange, initialPage = 0 }, ref) => {
  const bookRef = useRef(null);
  const frameRef = useRef(null);
  const sheetFrameRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const { isHighlightMode } = useHighlighter();

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const updateScale = () => {
      // clientWidth/Height include the viewer's padding — subtract it, or the
      // frame overflows the content box and the sheet gets clipped on phones.
      const cs = getComputedStyle(el);
      const availW = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const availH = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const nextScale = Math.min(availW / SHEET_WIDTH, availH / SHEET_HEIGHT);
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  useEffect(() => {
    const el = sheetFrameRef.current;
    if (!el) return;

    const stopFlipInHighlightMode = (e) => {
      if (isHighlightMode) {
        e.stopPropagation();
      }
    };

    const opts = { capture: true };
    el.addEventListener('pointerdown', stopFlipInHighlightMode, opts);
    el.addEventListener('touchstart', stopFlipInHighlightMode, opts);
    el.addEventListener('mousedown', stopFlipInHighlightMode, opts);

    return () => {
      el.removeEventListener('pointerdown', stopFlipInHighlightMode, opts);
      el.removeEventListener('touchstart', stopFlipInHighlightMode, opts);
      el.removeEventListener('mousedown', stopFlipInHighlightMode, opts);
    };
  }, [isHighlightMode]);

  useImperativeHandle(ref, () => ({
    flipNext: () => {
      const pageFlip = bookRef.current?.pageFlip();
      if (pageFlip) {
        const originalSetting = pageFlip.getSettings().disableFlipByClick;
        pageFlip.getSettings().disableFlipByClick = false;
        const next = currentPage + 1;
        if (next < pages.length) pageFlip.flip(next);
        pageFlip.getSettings().disableFlipByClick = originalSetting;
      }
    },
    flipPrev: () => {
      const pageFlip = bookRef.current?.pageFlip();
      if (pageFlip) {
        const originalSetting = pageFlip.getSettings().disableFlipByClick;
        pageFlip.getSettings().disableFlipByClick = false;
        const prev = currentPage - 1;
        if (prev >= 0) pageFlip.flip(prev);
        pageFlip.getSettings().disableFlipByClick = originalSetting;
      }
    },
    turnToPage: (pageIndex) => {
      bookRef.current?.pageFlip()?.turnToPage(pageIndex);
    },
    getCurrentPage: () => currentPage
  }));

  const handleFlip = useCallback((e) => {
    setCurrentPage(e.data);
    onPageChange?.(e.data);
  }, [onPageChange]);

  return (
    <div className="book-viewer" ref={frameRef}>
      <div
        className="book-sheet-frame"
        ref={sheetFrameRef}
        style={{ width: SHEET_WIDTH * scale, height: SHEET_HEIGHT * scale }}
      >
        <div
          className="book-sheet-scaler"
          style={{ width: SHEET_WIDTH, height: SHEET_HEIGHT, transform: `scale(${scale})` }}
        >
          <HTMLFlipBook
            ref={bookRef}
            width={SHEET_WIDTH}
            height={SHEET_HEIGHT}
            showCover={true}
            clickEventForward={true}
            useMouseEvents={true}
            disableFlipByClick={true}
            swipeDistance={60}
            mobileScrollSupport={false}
            maxShadowOpacity={0.3}
            flippingTime={600}
            usePortrait={true}
            startPage={initialPage}
            onFlip={handleFlip}
            className="book-viewer__flipbook"
          >
            {pages.map((page) => (
              <PageContent
                key={page.id}
                page={page}
                questions={questions}
                getAnswer={getAnswer}
                setAnswer={setAnswer}
                answers={answers}
                validateAnswers={validateAnswers}
                markSubmitted={markSubmitted}
                isSubmitted={isSubmitted}
              />
            ))}
          </HTMLFlipBook>
        </div>
      </div>
    </div>
  );
});

BookViewer.displayName = 'BookViewer';
export default BookViewer;
