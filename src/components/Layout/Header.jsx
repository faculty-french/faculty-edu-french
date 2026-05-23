export default function Header({ lessonTitle, pageNumber, totalPages }) {
  return (
    <header className="book-header">
      <span className="book-header__title">{lessonTitle}</span>
      <span className="book-header__page-info">{pageNumber} / {totalPages}</span>
    </header>
  );
}
