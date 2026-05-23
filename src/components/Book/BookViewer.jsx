import { useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import PageContent from './PageContent';

const BookViewer = forwardRef(({ pages, questions, getAnswer, setAnswer, answers, validateAnswers, markSubmitted, isSubmitted, onPageChange, initialPage = 0 }, ref) => {
  const bookRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 550 });
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    const updateDimensions = () => {
      const w = window.innerWidth;
      if (w < 768) {
        setDimensions({ width: Math.min(w - 32, 500), height: Math.min(window.innerHeight - 160, 700) });
      } else if (w < 1024) {
        setDimensions({ width: Math.min(w - 64, 550), height: Math.min(window.innerHeight - 160, 750) });
      } else {
        setDimensions({ width: 500, height: 680 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const isMobile = window.innerWidth < 768;

  useImperativeHandle(ref, () => ({
    flipNext: () => {
      const pageFlip = bookRef.current?.pageFlip();
      if (pageFlip) {
        const originalSetting = pageFlip.getSettings().disableFlipByClick;
        pageFlip.getSettings().disableFlipByClick = false;
        if (isMobile) {
          const next = currentPage + 1;
          if (next < pages.length) pageFlip.flip(next);
        } else {
          pageFlip.flipNext();
        }
        pageFlip.getSettings().disableFlipByClick = originalSetting;
      }
    },
    flipPrev: () => {
      const pageFlip = bookRef.current?.pageFlip();
      if (pageFlip) {
        const originalSetting = pageFlip.getSettings().disableFlipByClick;
        pageFlip.getSettings().disableFlipByClick = false;
        if (isMobile) {
          const prev = currentPage - 1;
          if (prev >= 0) pageFlip.flip(prev);
        } else {
          pageFlip.flipPrev();
        }
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
    <div className="book-viewer">
      <HTMLFlipBook
        ref={bookRef}
        width={dimensions.width}
        height={dimensions.height}
        showCover={true}
        clickEventForward={true}
        useMouseEvents={!isMobile}
        disableFlipByClick={true}
        swipeDistance={60}
        mobileScrollSupport={false}
        maxShadowOpacity={0.3}
        flippingTime={600}
        usePortrait={isMobile}
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
  );
});

BookViewer.displayName = 'BookViewer';
export default BookViewer;
