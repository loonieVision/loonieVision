import { HelpCircle } from "lucide-react";

const KeyboardShortcutsHelp = () => (
  <div className="group relative">
    <button className="p-1 text-slate-400 transition-colors hover:text-white">
      <HelpCircle className="h-5 w-5" />
    </button>
    <div className="absolute right-0 top-full z-50 mt-2 hidden w-72 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-xl group-hover:block">
      <h4 className="mb-3 font-semibold text-white">Keyboard Shortcuts</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-white">1-4</kbd>
          </span>
          <span className="text-slate-300">Focus audio on viewport</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-white">F</kbd>
          </span>
          <span className="text-slate-300">Toggle fullscreen</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-white">M</kbd>
          </span>
          <span className="text-slate-300">Mute/unmute</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-white">S</kbd>
          </span>
          <span className="text-slate-300">Toggle sidebar</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-white">↑↓</kbd>
          </span>
          <span className="text-slate-300">Volume control</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-white">Del</kbd>
          </span>
          <span className="text-slate-300">Remove stream</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-white">Esc</kbd>
          </span>
          <span className="text-slate-300">Exit fullscreen</span>
        </div>
      </div>
    </div>
  </div>
);

export { KeyboardShortcutsHelp };
