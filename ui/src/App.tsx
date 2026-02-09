import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import ToolList from "./components/ToolList";
import ToolForm from "./components/ToolForm";
import ExecutionLog from "./components/ExecutionLog";
import CommandPalette from "./components/CommandPalette";
import ToolCreator from "./components/ToolCreator";
import HelpPanel from "./components/HelpPanel";
import { Tool, ExecutionOutput } from "./types";

type ViewMode = "tool" | "creator" | "help";

function App() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<ExecutionOutput[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("tool");
  const [toolsDir, setToolsDir] = useState("");

  useEffect(() => {
    loadTools();
    loadToolsDir();

    const unlisten = listen("reload-tools", () => {
      reloadTools();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "3") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!executionId) return;

    const unlisten = listen(`execution-output-${executionId}`, (event: any) => {
      const output = event.payload as ExecutionOutput;
      setOutputs((prev) => [...prev, output]);

      if (output.type === "exit" || output.type === "error") {
        setIsExecuting(false);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [executionId]);

  const loadTools = async () => {
    try {
      const toolsList = await invoke<Tool[]>("get_tools");
      setTools(toolsList);
      if (toolsList.length > 0 && !selectedTool) {
        setSelectedTool(toolsList[0]);
      }
    } catch (err) {
      setError(`Failed to load tools: ${err}`);
    }
  };

  const reloadTools = async () => {
    try {
      const toolsList = await invoke<Tool[]>("reload_tools");
      setTools(toolsList);
      setError(null);
    } catch (err) {
      setError(`Failed to reload tools: ${err}`);
    }
  };

  const loadToolsDir = async () => {
    try {
      const dir = await invoke<string>("get_tools_directory");
      setToolsDir(dir);
    } catch {
      // ignore
    }
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setOutputs([]);
    setExecutionId(null);
    setIsExecuting(false);
    setError(null);
    setViewMode("tool");
  };

  const handleExecute = async (params: Record<string, any>) => {
    if (!selectedTool) return;

    setOutputs([]);
    setIsExecuting(true);
    setError(null);

    try {
      const execId = await invoke<string>("execute_tool", {
        toolId: selectedTool.id,
        params,
      });
      setExecutionId(execId);
    } catch (err) {
      setError(`Execution failed: ${err}`);
      setIsExecuting(false);
    }
  };

  const handleCancel = async () => {
    if (!executionId) return;

    try {
      await invoke("cancel_execution", { executionId });
      setIsExecuting(false);
      setOutputs((prev) => [
        ...prev,
        { type: "info", data: "Execution cancelled by user" },
      ]);
    } catch (err) {
      setError(`Failed to cancel: ${err}`);
    }
  };

  const handleToolSaved = async () => {
    await reloadTools();
    setViewMode("tool");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <CommandPalette
        tools={tools}
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectTool={handleToolSelect}
      />

      <ToolList
        tools={tools}
        selectedTool={viewMode === "tool" ? selectedTool : null}
        onSelectTool={handleToolSelect}
        onReload={reloadTools}
        onNewTool={() => setViewMode("creator")}
        onHelp={() => setViewMode("help")}
      />
      
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {viewMode === "creator" ? (
          <div className="flex-1 overflow-auto">
            <ToolCreator
              onClose={() => setViewMode("tool")}
              onSaved={handleToolSaved}
            />
          </div>
        ) : viewMode === "help" ? (
          <div className="flex-1 overflow-auto">
            <HelpPanel
              onClose={() => setViewMode("tool")}
              toolsDir={toolsDir}
            />
          </div>
        ) : selectedTool ? (
          <>
            <div className="flex-1 overflow-auto">
              <ToolForm
                tool={selectedTool}
                onExecute={handleExecute}
                onCancel={handleCancel}
                isExecuting={isExecuting}
              />
            </div>
            
            {outputs.length > 0 && (
              <ExecutionLog outputs={outputs} />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No tools available</p>
              <p className="text-sm mb-4">
                Add YAML files to ~/Library/Application Support/CliDeck/tools/
              </p>
              <button
                onClick={() => setViewMode("creator")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
              >
                Create Your First Tool
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
