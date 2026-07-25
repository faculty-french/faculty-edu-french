// data-block-index sits on the text element, not the wrapper: highlight offsets are
// measured against the block's textContent, and the wrapper also contains the
// "Consigne" label, which would shift every offset.
export default function Consigne({ text, 'data-block-index': blockIndex }) {
  return (
    <div className="consigne">
      <span className="consigne__label">Consigne</span>
      <p className="consigne__text" data-block-index={blockIndex} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}
