import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Terminal, ArrowRight, Command } from "lucide-react";
import { Tool } from "../types";

interface CommandPaletteProps {
  tools: Tool[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: Tool) => void;
}

export default function CommandPalette({
  tools,
  isOpen,
  onClose,
  onSelectTool,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return tools;
    const q = query.toLowerCase();
    return tools
      .map((tool) => {
        let score = 0;
        const label = tool.label.toLowerCase();
        const bin = tool.bin.toLowerCase();
        const id = tool.id.toLowerCase();
        const desc = (tool.description || "").toLowerCase();

        if (label === q) score += 100;
        else if (label.startsWith(q)) score += 80;
        else if (label.includes(q)) score += 60;

        if (bin === q) score += 70;
        else if (bin.startsWith(q)) score += 50;
        else if (bin.includes(q)) score += 30;

        if (id.includes(q)) score += 20;
        if (desc.includes(q)) score += 10;

        return { tool, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.tool);
  }, [tools, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (tool: Tool) => {
      onSelectTool(tool);
      onClose();
    },
    [onSelectTool, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-[560px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tools…"
            className="flex-1 text-base outline-none placeholder-gray-400"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[360px] overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              {query ? "No matching tools" : "No tools available"}
            </div>
          ) : (
            filtered.map((tool, index) => (
              <button
                key={tool.id}
                onClick={() => handleSelect(tool)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    index === selectedIndex
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      index === selectedIndex
                        ? "text-blue-900"
                        : "text-gray-900"
                    }`}
                  >
                    {tool.label}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {tool.description || tool.bin}
                  </p>
                </div>
                {index === selectedIndex && (
                  <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">esc</kbd>
              close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />3 to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
