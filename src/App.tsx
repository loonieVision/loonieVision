import { Grid2X2, LogOut, Volume2, VolumeX } from "lucide-react";
import { useEffect } from "react";

import { KeyboardShortcutsHelp } from "./components/KeyboardShortcultsHelp";
import { LoginModal } from "./components/LoginModal";
import { StreamSelector } from "./components/StreamSelector/StreamSelector";
import { VideoGrid } from "./components/VideoGrid/VideoGrid";
import { useKeyboardShortcuts } from "./lib/keyboardShortcuts";
import { useAudioStore } from "./store/audioStore";
import { useAuthStore } from "./store/authStore";
import { useViewportStore, ViewportCount } from "./store/viewportStore";
import { OlympicStream } from "./types";

const App = () => {
  const { isAuthenticated, checkSession, logout } = useAuthStore();
  const { selectedViewport, assignStream, setViewportCount } = useViewportStore();
  const { viewportWithAudioActive, isMuted, toggleMute, masterVolume, setMasterVolume } =
    useAudioStore();
  const { viewportCount } = useViewportStore();

  useKeyboardShortcuts();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleSelectStream = (stream: OlympicStream, viewportIndex: number) => {
    assignStream(stream, viewportIndex);
  };

  const handleViewportCountChange = (count: ViewportCount) => {
    setViewportCount(count);
  };

  if (!isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white">LoonieVision</h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Viewport Count Selector */}
            <div className="flex items-center space-x-2">
              <div className="group relative">
                <button className="p-1 text-slate-400 transition-colors hover:text-white">
                  <Grid2X2 className="h-5 w-5 text-slate-400" />
                </button>
                <div className="absolute right-0 top-full z-50 mt-2 hidden w-36 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-xl group-hover:block">
                  <p className="inline-block space-y-2 text-sm text-white">Video Grid Size</p>
                </div>
              </div>
              <select
                value={viewportCount}
                onChange={(e) =>
                  handleViewportCountChange(parseInt(e.target.value) as ViewportCount)
                }
                className="rounded px-1 text-sm text-slate-800 focus:outline-none"
              >
                <option value={1}>1 Viewport</option>
                <option value={2}>2 Viewports</option>
                <option value={4}>4 Viewports</option>
              </select>
            </div>

            <span className="text-slate-600">|</span>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-slate-400 transition-colors hover:text-white"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="hidden w-24 accent-red-500 sm:block"
              />
            </div>

            <span className="text-slate-600">|</span>

            {/* Active Viewport Indicator */}
            <div className="text-sm text-slate-400">
              Audio:{" "}
              <span className="font-medium text-white">Viewport {viewportWithAudioActive + 1}</span>
            </div>

            <span className="text-slate-600">|</span>

            {/* Help & Logout */}
            <div className="flex items-center space-x-2">
              <KeyboardShortcutsHelp />
              <button
                onClick={() => logout()}
                className="flex items-center space-x-1 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <VideoGrid />
      </div>

      {/* Stream Selector Sidebar */}
      <StreamSelector onSelectStream={handleSelectStream} selectedViewport={selectedViewport} />
    </div>
  );
};

export default App;
