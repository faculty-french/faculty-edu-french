export default function ReadingPassage({ text }) {
  return <p className="page__paragraph" dangerouslySetInnerHTML={{ __html: text }} />;
}
