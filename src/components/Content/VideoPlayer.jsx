import { usePrintMode } from '../../context/PrintContext';

// youtube-nocookie.com/embed/<id> -> youtu.be/<id>: the embed URL is not something
// a reader can type off a printed page, the short watch URL is.
function watchUrl(embedUrl) {
  const match = /\/embed\/([A-Za-z0-9_-]+)/.exec(embedUrl || '');
  return match ? `https://youtu.be/${match[1]}` : embedUrl;
}

export default function VideoPlayer({ videoUrl, caption }) {
  const printMode = usePrintMode();

  if (!videoUrl) {
    return (
      <div className="video-player">
        <div className="video-player__fallback">
          🎬 Vidéo temporairement indisponible
        </div>
      </div>
    );
  }

  const embedUrl = videoUrl.replace('www.youtube.com/embed/', 'www.youtube-nocookie.com/embed/');
  // A direct media file inside an iframe becomes a top-level media document,
  // which Chrome auto-plays once the page mounts during a flip — render a
  // native player instead so playback only ever starts from the controls.
  const isMediaFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl);

  // An iframe prints as an empty grey rectangle. On paper the video becomes a card
  // carrying its title and the address the reader can open.
  if (printMode) {
    return (
      <div className="print-video">
        <span className="print-video__label">🎬 Vidéo</span>
        {caption && <span className="print-video__caption">{caption}</span>}
        <span className="print-video__url">{watchUrl(embedUrl)}</span>
      </div>
    );
  }

  if (isMediaFile) {
    return (
      <div className="video-player">
        <video
          className="video-player__iframe"
          src={videoUrl}
          controls
          preload="metadata"
          playsInline
        />
        {caption && <p className="video-player__caption">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="video-player">
      <iframe
        className="video-player__iframe"
        src={embedUrl}
        title={caption || 'Vidéo de la leçon'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {caption && <p className="video-player__caption">{caption}</p>}
    </div>
  );
}
