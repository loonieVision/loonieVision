import { ChevronLeft, ChevronRight, Clock, Loader2, Radio, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { useAuthStore } from "../../store/authStore";
import { useStreamStore } from "../../store/streamStore";
import { useUIStore } from "../../store/uiStore";
import { OlympicStream } from "../../types";
import { StreamCard } from "./StreamCard";

interface StreamSelectorProps {
  onSelectStream: (stream: OlympicStream, viewportIndex: number) => void;
  selectedViewport: number;
}

const StreamSelector = ({ onSelectStream, selectedViewport }: StreamSelectorProps) => {
  const { streams, isLoading, error, lastUpdated, fetchStreams } = useStreamStore();
  const { session } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  useEffect(() => {
    if (session?.cookies) {
      fetchStreams(session.cookies);

      const interval = setInterval(() => {
        fetchStreams(session.cookies);
      }, 120000);

      return () => clearInterval(interval);
    }
  }, [session, fetchStreams]);

  const liveStreams = streams.filter((s) => s.status === "live");
  const replayStreams = streams.filter((s) => s.status === "replay");
  const upcomingStreams = streams.filter((s) => s.status === "upcoming");

  if (isSidebarCollapsed) {
    return (
      <>
        <div className="h-full">
          <div className="min-h-[55px]" />
          <div className="group relative flex h-full w-2 cursor-pointer flex-col border-l border-slate-700 bg-slate-900 transition-all duration-300 hover:bg-slate-800">
            <button
              onClick={toggleSidebar}
              className="absolute left-0 top-1/2 flex h-12 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-l-md border border-slate-600 bg-slate-700 opacity-0 shadow-lg transition-opacity duration-200 hover:bg-slate-600 group-hover:opacity-100"
              title="Expand sidebar"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-slate-700 bg-slate-900 transition-all duration-300">
      <div className="flex min-h-[55px] items-center justify-between border-b border-slate-700">
        <div className="ml-3 flex flex-col">
          <h3 className="text-md font-semibold text-white">Olympic Streams</h3>
          <p className="text-sm text-slate-400">
            {lastUpdated && `Updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
      </div>

      <div className="group relative flex h-full">
        <button
          onClick={toggleSidebar}
          className="absolute -left-3 top-1/2 flex h-12 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-l-md border border-slate-600 bg-slate-700 opacity-0 shadow-lg transition-opacity duration-200 hover:bg-slate-600 group-hover:opacity-100"
          title="Collapse sidebar"
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isLoading && streams.length === 0 && (
            <div role="status" className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-700 bg-red-900/30 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <h4 className="mb-2 flex items-center text-sm font-medium text-green-400">
              <Radio className="mr-1 h-4 w-4" />
              Live Now ({liveStreams.length})
            </h4>
            <div className="space-y-2">
              {liveStreams.map((stream) => (
                <StreamCard
                  key={stream.id}
                  stream={stream}
                  onClick={() => onSelectStream(stream, selectedViewport)}
                />
              ))}
            </div>
          </div>

          {replayStreams.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center text-sm font-medium text-blue-400">
                <RotateCcw className="mr-1 h-4 w-4" />
                Replays ({replayStreams.length})
              </h4>
              <div className="space-y-2">
                {replayStreams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    onClick={() => onSelectStream(stream, selectedViewport)}
                  />
                ))}
              </div>
            </div>
          )}

          {upcomingStreams.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center text-sm font-medium text-yellow-400">
                <Clock className="mr-1 h-4 w-4" />
                Upcoming ({upcomingStreams.length})
              </h4>
              <div className="space-y-2">
                {upcomingStreams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    onClick={() => onSelectStream(stream, selectedViewport)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { StreamSelector };
