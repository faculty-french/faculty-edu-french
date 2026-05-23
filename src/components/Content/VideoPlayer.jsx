export default function VideoPlayer({ videoUrl, caption }) {
  if (!videoUrl) {
    return (
      <div className="video-player">
        <div className="video-player__fallback">
          🎬 Vidéo temporairement indisponible
        </div>
      </div>
    );
  }

  return (
    <div className="video-player">
      <iframe
        className="video-player__iframe"
        src={videoUrl}
        title={caption || 'Vidéo de la leçon'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
      {caption && <p className="video-player__caption">{caption}</p>}
    </div>
  );
}
