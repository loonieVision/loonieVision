import { Play } from "lucide-react";
import { useRef } from "react";

import { OlympicStream } from "../../types";
import { StreamThumbnail } from "./StreamThumbnail";

interface StreamCardProps {
  stream: OlympicStream;
  onClick: () => void;
}

const StreamCard = ({ stream, onClick }: StreamCardProps) => {
  const isLive = stream.status === "live";
  const isUpcoming = stream.status === "upcoming";
  const isEnded = stream.status === "ended";
  const isReplay = stream.status === "replay";

  const cardRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      disabled={isEnded || isUpcoming}
      className="group w-full rounded-lg bg-slate-800 p-3 text-left transition-colors hover:bg-slate-700"
    >
      <div className="flex items-start space-x-3">
        <StreamThumbnail stream={stream} cardRef={cardRef} />
        <div className="min-w-0 flex-1">
          <h5
            className="truncate text-sm font-medium text-white group-hover:text-red-400"
            title={stream.title}
          >
            {stream.title}
          </h5>
          <p className="text-xs text-slate-400">{stream.sport}</p>
          {isLive && <span className="text-xs font-medium text-green-400">● Live</span>}
          {isReplay && <span className="text-xs font-medium text-blue-400">Replay</span>}
        </div>
        <Play className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-white" />
      </div>
    </button>
  );
};

export { StreamCard };
