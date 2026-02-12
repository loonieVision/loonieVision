import { X } from "lucide-react";

import { OlympicStream } from "../types";
import { HlsPlayer } from "./HlsPlayer";

interface ViewportProps {
  index: number;
  stream: OlympicStream | null;
  isAudioActive: boolean;
  isSelected: boolean;
  volume: number;
  error: string | null;
  onClick: () => void;
  onRemoveStream: () => void;
}

const Viewport = ({
  index,
  stream,
  isAudioActive,
  isSelected,
  volume,
  error,
  onClick,
  onRemoveStream,
}: ViewportProps) => {
  const renderPlaceholderText = () => {
    let text = "Click to select, then choose a stream";

    if (isSelected) {
      return (
        <>
          <p className="text-lg font-medium text-slate-200">Viewport {index + 1}</p>
          <p className="mt-2 text-sm text-slate-200">Selected, choose a stream</p>
        </>
      );
    }

    return (
      <>
        <p className="text-lg font-medium text-slate-400">Viewport {index + 1}</p>
        <p className="mt-2 text-sm text-slate-400">{text}</p>
      </>
    );
  };

  if (!stream) {
    return (
      <div
        className={`${isSelected ? "ring-blue-500" : "ring-transparent hover:bg-slate-700"} relative flex h-full w-full cursor-pointer items-center justify-center border-2 border-transparent bg-slate-800 ring-1 transition-colors`}
        onClick={onClick}
      >
        <div className="text-center">{renderPlaceholderText()}</div>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full w-full items-center justify-center bg-black ring-1 ring-transparent">
      <div className="flex aspect-video max-h-full w-full items-center justify-center">
        <HlsPlayer
          stream={stream}
          isAudioActive={isAudioActive}
          volume={volume}
          onError={(err) => console.error("Player error:", err)}
          onLoad={() => console.log("Player loaded")}
        />
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <p className="text-center text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-3">
          <div className="max-w-[70%] truncate rounded bg-black/50 px-2 py-1 text-xs text-white">
            {stream.title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveStream();
            }}
            className="rounded bg-black/50 p-1 text-white transition-colors hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { Viewport };
