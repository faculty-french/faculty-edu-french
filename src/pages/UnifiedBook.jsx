import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { loadBook } from '../services/contentLoader';
import { useAnswers } from '../hooks/useAnswers';
import { useProgress } from '../hooks/useProgress';
import BookViewer from '../components/Book/BookViewer';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';

export default function UnifiedBook() {
  const [bookData, setBookData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // For now, we namespace all answers under "lesson1" since it's a mock unified book.
  // In a full implementation, you might need a different storage key strategy.
  const { answers, getAnswer, setAnswer, validateAnswers, markSubmitted, isSubmitted } = useAnswers('lesson1');
  const { getCurrentPage, setCurrentPage: saveCurrentPage } = useProgress();
  const viewerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Assemble the full book from book.json (front matter) + every lesson file.
    loadBook()
      .then(data => {
        setBookData(data);
        const savedPage = getCurrentPage('book');
        setCurrentPage(savedPage);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handlePageChange = (pageIndex) => {
    setCurrentPage(pageIndex);
    saveCurrentPage('book', pageIndex);
  };

  const handleNavigate = useCallback((pageIndex) => {
    viewerRef.current?.turnToPage(pageIndex);
  }, []);

  // Inject the navigation callback into the index page block
  const pagesWithNav = useMemo(() => {
    if (!bookData) return [];
    return bookData.pages.map(page => {
      return {
        ...page,
        content: page.content.map(block => {
          if (block.type === 'index') {
            return { ...block, onNavigate: handleNavigate };
          }
          return block;
        })
      };
    });
  }, [bookData, handleNavigate]);

  if (loading) {
    return (
      <div className="book-shell">
        <Header lessonTitle="Chargement..." pageNumber={0} totalPages={0} />
        <div className="book-viewer">
          <div className="skeleton skeleton--page" style={{ width: '100%', maxWidth: 500 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="book-shell">
        <Header lessonTitle="Erreur" pageNumber={0} totalPages={0} />
        <div className="book-viewer" style={{ flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-lg)' }}>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  const currentPageData = pagesWithNav[currentPage];
  // Find the title for the current page. If the page doesn't have a title, use the book title.
  // The header usually shows the lesson title.
  const headerTitle = currentPageData?.title || bookData.title;

  return (
    <div className="book-shell">
      <Header
        lessonTitle={headerTitle.toUpperCase()}
        pageNumber={currentPageData?.pageNumber || currentPage + 1}
        totalPages={pagesWithNav.length}
      />
      
      <BookViewer
        ref={viewerRef}
        pages={pagesWithNav}
        questions={bookData.questions}
        getAnswer={getAnswer}
        setAnswer={setAnswer}
        answers={answers}
        validateAnswers={validateAnswers}
        markSubmitted={markSubmitted}
        isSubmitted={isSubmitted}
        onPageChange={handlePageChange}
        initialPage={currentPage}
      />

      <Footer
        currentPage={currentPage}
        totalPages={pagesWithNav.length}
        phase={currentPageData?.phase || 0}
        onPrev={() => viewerRef.current?.flipPrev()}
        onNext={() => viewerRef.current?.flipNext()}
      />
    </div>
  );
}
