import { useAudioStore } from "../../store/audioStore";
import { useViewportStore } from "../../store/viewportStore";
import { Viewport } from "../Viewport";
import { getVideoGridClass } from "./getVideoGridClass";

const VideoGrid = () => {
  const { viewports, removeStream, selectedViewport, setSelectedViewport, viewportCount } =
    useViewportStore();
  const { viewportWithAudioActive, masterVolume } = useAudioStore();

  return (
    <div className="flex-1 bg-black p-1">
      <div
        className={`grid h-full w-full ${getVideoGridClass(viewportCount)} place-items-center gap-1`}
      >
        {viewports.slice(0, viewportCount).map((viewport, index) => (
          <Viewport
            key={viewport.stream?.id || index}
            index={index}
            stream={viewport.stream}
            isAudioActive={viewportWithAudioActive === index}
            isSelected={selectedViewport === index}
            volume={masterVolume}
            // Add back mute/unmute control such that it works with native video player controls
            error={viewport.error}
            onClick={() => setSelectedViewport(index)}
            onRemoveStream={() => removeStream(index)}
          />
        ))}
      </div>
    </div>
  );
};

export { VideoGrid };
