/**
 * Utility functions for text highlighting.
 */

/**
 * Merges overlapping or adjacent range objects: [{ block, start, end }, ...]
 */
export function mergeRanges(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) return [];
  const valid = ranges
    .filter(r => typeof r.start === 'number' && typeof r.end === 'number' && r.start < r.end)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  if (valid.length === 0) return [];

  const merged = [{ block: valid[0].block, start: valid[0].start, end: valid[0].end }];
  for (let i = 1; i < valid.length; i++) {
    const last = merged[merged.length - 1];
    const curr = valid[i];
    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push({ block: curr.block, start: curr.start, end: curr.end });
    }
  }
  return merged;
}

/**
 * Calculates character offset in blockEl.textContent for a container + offset node target.
 */
export function getTextOffsetInBlock(blockEl, container, offset) {
  try {
    const tempRange = document.createRange();
    tempRange.selectNodeContents(blockEl);
    tempRange.setEnd(container, offset);
    return tempRange.toString().length;
  } catch (err) {
    return 0;
  }
}

/**
 * Returns `html` with the given ranges wrapped in <mark class="hl">, as a string.
 *
 * Highlights are produced during render and handed to React rather than painted onto
 * the DOM afterwards. Mutating React-owned markup (these blocks are rendered with
 * dangerouslySetInnerHTML) works until any later commit rewrites the block, which
 * silently erases the marks and cannot be detected from an effect whose dependencies
 * have not changed. Deriving the HTML makes the highlights part of the render output,
 * so they can never fall out of sync.
 */
export function highlightHtml(html, ranges, pageId, blockIndex) {
  const source = html == null ? '' : String(html);
  if (!Array.isArray(ranges) || ranges.length === 0) return source;
  if (typeof document === 'undefined') return source;

  const template = document.createElement('template');
  template.innerHTML = source;
  applyHighlightsToElement(template.content, ranges, pageId, blockIndex);
  return template.innerHTML;
}

/**
 * Applies highlight ranges onto a block DOM element by wrapping matching text nodes in <mark class="hl">.
 */
export function applyHighlightsToElement(blockEl, ranges, pageId, blockIndex) {
  if (!blockEl) return;

  // 1. Remove existing mark.hl tags from this block to restore clean DOM text nodes
  const existingMarks = blockEl.querySelectorAll('mark.hl');
  existingMarks.forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
  blockEl.normalize();

  if (!Array.isArray(ranges) || ranges.length === 0) return;

  const merged = mergeRanges(ranges);
  if (merged.length === 0) return;

  // 2. Collect text nodes and their character start/end bounds relative to blockEl
  const textNodes = [];
  const walk = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT, null);
  let curr;
  let charOffset = 0;
  while ((curr = walk.nextNode())) {
    const len = curr.nodeValue.length;
    textNodes.push({
      node: curr,
      start: charOffset,
      end: charOffset + len
    });
    charOffset += len;
  }

  const totalLen = charOffset;
  if (totalLen === 0) return;

  // 3. For each text node, find overlapping highlight ranges and slice right-to-left
  textNodes.forEach(info => {
    const nodeSlices = [];
    merged.forEach(r => {
      const rStart = Math.max(0, r.start);
      const rEnd = Math.min(totalLen, r.end);
      if (rStart >= rEnd) return;

      if (rEnd > info.start && rStart < info.end) {
        const localStart = Math.max(0, rStart - info.start);
        const localEnd = Math.min(info.node.nodeValue.length, rEnd - info.start);
        if (localStart < localEnd) {
          nodeSlices.push({ localStart, localEnd, r });
        }
      }
    });

    if (nodeSlices.length === 0) return;

    // Sort right to left
    nodeSlices.sort((a, b) => b.localStart - a.localStart);

    nodeSlices.forEach(({ localStart, localEnd, r }) => {
      let target = info.node.splitText(localStart);
      const targetLen = localEnd - localStart;
      if (targetLen < target.nodeValue.length) {
        target.splitText(targetLen);
      }

      const mark = document.createElement('mark');
      mark.className = 'hl';
      mark.dataset.pageId = pageId;
      mark.dataset.blockIndex = String(blockIndex);
      mark.dataset.hlStart = String(r.start);
      mark.dataset.hlEnd = String(r.end);

      target.parentNode.replaceChild(mark, target);
      mark.appendChild(target);
    });
  });
}
