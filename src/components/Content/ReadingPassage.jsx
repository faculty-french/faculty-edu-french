export default function ReadingPassage({ text, 'data-block-index': blockIndex }) {
  return <p className="page__paragraph" data-block-index={blockIndex} dangerouslySetInnerHTML={{ __html: text }} />;
}

