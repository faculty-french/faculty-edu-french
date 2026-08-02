import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PageContent from '../Book/PageContent';
import { PrintProvider } from '../../context/PrintContext';

// The flip-book pages live inside 3D-transformed, clipped .stf__ containers, so they
// cannot be printed where they are. This is a second, plain rendering of the same
// pages: one <div class="print-sheet"> per A4 sheet, each holding the untouched
// 420x640 logical page scaled up by print.css to fill the paper. Geometry lives in
// the stylesheet — see the comment there for why the sheet is deliberately smaller
// than the printable area.

const FONT_TIMEOUT_MS = 5000;
const IMAGE_TIMEOUT_MS = 10000;
// Firefox and iOS Safari do not reliably fire `afterprint`; without a fallback the
// print tree would stay mounted forever and the overlay never close.
const AFTER_PRINT_FALLBACK_MS = 1500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const noop = () => {};

// Every page is authored with loading="lazy", and 300+ of them are outside the
// viewport — printing them as-is yields empty image frames. Flipping them to eager
// starts the fetch; we then wait for the whole set (bounded, so one dead URL cannot
// block the print).
function waitForImages(root) {
  if (!root) return Promise.resolve();
  const images = Array.from(root.querySelectorAll('img'));
  const pending = [];
  for (const img of images) {
    img.loading = 'eager';
    if (img.complete && img.naturalWidth > 0) continue;
    pending.push(new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    }));
  }
  if (pending.length === 0) return Promise.resolve();
  return Promise.race([Promise.all(pending), delay(IMAGE_TIMEOUT_MS)]);
}

export default function PrintBook({
  pages,
  questions,
  includeAnswers = false,
  getAnswer,
  onReady,
  onDone,
}) {
  const rootRef = useRef(null);
  // The print run is a single, uninterruptible sequence: it must start exactly once,
  // so the callbacks are read through a ref rather than becoming effect dependencies.
  const callbacksRef = useRef({ onReady, onDone });
  useEffect(() => {
    callbacksRef.current = { onReady, onDone };
  });

  useEffect(() => {
    const html = document.documentElement;
    // The print stylesheet only takes over while this flag is set, so a plain Ctrl+P
    // outside print mode still prints whatever is on screen instead of a blank page.
    html.setAttribute('data-printing', 'true');
    // Dark mode on paper is a page of ink. Force the light palette for the duration;
    // the preparing overlay hides the swap from the reader.
    const previousTheme = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'light');

    let cancelled = false;
    let finished = false;
    let fallbackTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener('afterprint', finish);
      clearTimeout(fallbackTimer);
      if (!cancelled) callbacksRef.current.onDone?.();
    };

    (async () => {
      // Two frames: the first commits the 300+ pages to the DOM, the second lets the
      // browser lay them out before we start measuring/awaiting anything.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (cancelled) return;
      await Promise.race([document.fonts?.ready ?? Promise.resolve(), delay(FONT_TIMEOUT_MS)]);
      if (cancelled) return;
      await waitForImages(rootRef.current);
      if (cancelled) return;

      callbacksRef.current.onReady?.();
      window.addEventListener('afterprint', finish);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (cancelled) return;
      window.print();
      fallbackTimer = setTimeout(finish, AFTER_PRINT_FALLBACK_MS);
    })();

    return () => {
      cancelled = true;
      finished = true;
      clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', finish);
      html.removeAttribute('data-printing');
      if (previousTheme) html.setAttribute('data-theme', previousTheme);
      else html.removeAttribute('data-theme');
    };
  }, []);

  // Answers are read-only here: OpenEnded flushes its buffer through onChange when it
  // unmounts, so a live setAnswer would let the throw-away print tree overwrite the
  // student's real work as soon as the print finishes.
  const readAnswer = includeAnswers && getAnswer ? getAnswer : () => '';

  return createPortal(
    <PrintProvider value={true}>
      <div className="print-root" ref={rootRef} aria-hidden="true">
        {pages.map((page) => (
          <div className="print-sheet" key={page.id}>
            <div className="print-sheet__scaler">
              <PageContent
                page={page}
                questions={questions}
                getAnswer={readAnswer}
                setAnswer={noop}
                answers={{}}
                validateAnswers={noop}
                markSubmitted={noop}
                isSubmitted={() => false}
              />
            </div>
          </div>
        ))}
      </div>
    </PrintProvider>,
    document.body
  );
}
