import { useState, useRef, useMemo } from "react";
import { RefreshCw, Terminal, Search, X, Plus, HelpCircle, ChevronRight, ChevronDown, Folder } from "lucide-react";
import { Tool } from "../types";

interface ToolListProps {
  tools: Tool[];
  selectedTool: Tool | null;
  onSelectTool: (tool: Tool) => void;
  onReload: () => void;
  onNewTool: () => void;
  onHelp: () => void;
}

interface GroupedTools {
  [group: string]: Tool[];
}

export default function ToolList({
  tools,
  selectedTool,
  onSelectTool,
  onReload,
  onNewTool,
  onHelp,
}: ToolListProps) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return tools;
    const q = search.toLowerCase();
    return tools.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.bin.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.group && t.group.toLowerCase().includes(q))
    );
  }, [tools, search]);

  const grouped = useMemo(() => {
    const groups: GroupedTools = {};
    const ungrouped: Tool[] = [];

    for (const tool of filtered) {
      if (tool.group) {
        if (!groups[tool.group]) groups[tool.group] = [];
        groups[tool.group].push(tool);
      } else {
        ungrouped.push(tool);
      }
    }

    return { groups, ungrouped };
  }, [filtered]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const sortedGroupNames = useMemo(
    () => Object.keys(grouped.groups).sort(),
    [grouped.groups]
  );

  const renderToolButton = (tool: Tool) => (
    <button
      key={tool.id}
      onClick={() => onSelectTool(tool)}
      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-l-2 ${
        selectedTool?.id === tool.id
          ? "border-blue-500 bg-blue-50"
          : "border-transparent"
      }`}
    >
      <div className="flex items-start gap-2">
        <Terminal className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {tool.label}
          </p>
          {tool.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {tool.description}
            </p>
          )}
        </div>
      </div>
    </button>
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">CliDeck</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onHelp}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="Help"
            >
              <HelpCircle className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onReload}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="Reload tools"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools…"
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            {filtered.length === tools.length
              ? `${tools.length} ${tools.length === 1 ? "tool" : "tools"}`
              : `${filtered.length} of ${tools.length} tools`}
          </p>
          <button
            onClick={onNewTool}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            title="Create new tool"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {search ? "No matching tools" : "No tools found"}
          </div>
        ) : (
          <div className="py-1">
            {/* Ungrouped tools first */}
            {grouped.ungrouped.map((tool) => renderToolButton(tool))}

            {/* Grouped tools */}
            {sortedGroupNames.map((groupName) => {
              const isCollapsed = collapsedGroups.has(groupName);
              const groupTools = grouped.groups[groupName];
              return (
                <div key={groupName}>
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                    <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">
                      {groupName}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {groupTools.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="pl-3">
                      {groupTools.map((tool) => renderToolButton(tool))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
