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
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const { isHighlightMode } = useHighlighter();

  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.25;
  const isZoomed = zoom > 1;
  const effectiveScale = scale * zoom;
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  const zoomOut = () => setZoom((z) => Math.max(1, Math.round((z - ZOOM_STEP) * 100) / 100));
  const zoomReset = () => setZoom(1);

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

    // Zoomed-in panning uses the same trick as highlight mode: swallow the
    // drag before page-flip sees it, so the scroll container pans instead.
    const stopFlipInHighlightMode = (e) => {
      if (isHighlightMode || isZoomed) {
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
  }, [isHighlightMode, isZoomed]);

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

  const stopAll = (e) => e.stopPropagation();

  return (
    <div className={`book-viewer${isZoomed ? ' book-viewer--zoomed' : ''}`} ref={frameRef}>
      <div className="book-viewer__scroll">
      <div
        className="book-sheet-frame"
        ref={sheetFrameRef}
        style={{ width: SHEET_WIDTH * effectiveScale, height: SHEET_HEIGHT * effectiveScale }}
      >
        <div
          className="book-sheet-scaler"
          style={{ width: SHEET_WIDTH, height: SHEET_HEIGHT, transform: `scale(${effectiveScale})` }}
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

      <div
        className="book-zoom"
        onPointerDown={stopAll}
        onMouseDown={stopAll}
        onTouchStart={stopAll}
      >
        <button
          type="button"
          className="book-zoom__btn"
          title="Zoom avant"
          aria-label="Zoom avant"
          disabled={zoom >= ZOOM_MAX}
          onClick={(e) => { stopAll(e); zoomIn(); }}
        >
          +
        </button>
        {isZoomed && (
          <button
            type="button"
            className="book-zoom__btn book-zoom__btn--level"
            title="Réinitialiser le zoom"
            aria-label="Réinitialiser le zoom"
            onClick={(e) => { stopAll(e); zoomReset(); }}
          >
            {Math.round(zoom * 100)}%
          </button>
        )}
        <button
          type="button"
          className="book-zoom__btn"
          title="Zoom arrière"
          aria-label="Zoom arrière"
          disabled={!isZoomed}
          onClick={(e) => { stopAll(e); zoomOut(); }}
        >
          −
        </button>
      </div>
    </div>
  );
});

BookViewer.displayName = 'BookViewer';
export default BookViewer;
