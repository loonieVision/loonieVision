import { RefObject, useEffect, useState } from "react";

import { OlympicStream } from "../../types";

interface StreamThumbnailProps {
  stream: OlympicStream;
  cardRef: RefObject<HTMLButtonElement | null>;
}

const StreamThumbnail = ({ stream, cardRef }: StreamThumbnailProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isVisible, setIsVisible] = useState(false);

  // Use Intersection Observer to only load images when card is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      {
        rootMargin: "50px", // Start loading slightly before visible
        threshold: 0.1,
      },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible, cardRef]);

  useEffect(() => {
    if (isVisible && !imageSrc) {
      const img = new Image();
      img.onload = () => setImageSrc(stream.thumbnail_url);
      img.onerror = () => setImageSrc(undefined);
      img.src = stream.thumbnail_url;
    }
  }, [isVisible, stream.thumbnail_url, imageSrc]);

  return (
    <img
      src={imageSrc}
      alt={stream.title}
      className="h-16 w-24 flex-shrink-0 rounded bg-slate-700 object-cover"
      loading="lazy"
    />
  );
};

export { StreamThumbnail };
