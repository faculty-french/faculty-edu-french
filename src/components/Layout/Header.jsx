import { CONFIG } from '../../config/config';

export default function Header({ lessonTitle, pageNumber, totalPages }) {
  return (
    <header className="book-header">
      <span className="book-header__brand">{CONFIG.BOOK_TITLE}</span>
      <span className="book-header__title">{lessonTitle}</span>
      <span className="book-header__page-info">{pageNumber} / {totalPages}</span>
    </header>
  );
}
