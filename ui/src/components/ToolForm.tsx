import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/api/dialog";
import { Play, Square, Save, FolderOpen, Download, CheckCircle, AlertTriangle, Loader2, Link, Variable } from "lucide-react";
import { Tool, Argument, Preset, ExecutionOutput } from "../types";

interface ToolFormProps {
  tool: Tool;
  onExecute: (params: Record<string, any>) => void;
  onCancel: () => void;
  isExecuting: boolean;
}

export default function ToolForm({
  tool,
  onExecute,
  onCancel,
  isExecuting,
}: ToolFormProps) {
  const [params, setParams] = useState<Record<string, any>>({});
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [binaryAvailable, setBinaryAvailable] = useState<boolean | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLogs, setInstallLogs] = useState<ExecutionOutput[]>([]);
  const [installExecId, setInstallExecId] = useState<string | null>(null);

  useEffect(() => {
    const initialParams: Record<string, any> = {};
    tool.args.forEach((arg) => {
      const key = getArgKey(arg);
      if ("default" in arg && arg.default !== undefined) {
        initialParams[key] = arg.default;
      }
    });
    setParams(initialParams);
    loadPresets();
    checkBinary();
  }, [tool]);

  useEffect(() => {
    if (!installExecId) return;

    const unlisten = listen(`execution-output-${installExecId}`, (event: any) => {
      const output = event.payload as ExecutionOutput;
      setInstallLogs((prev) => [...prev, output]);

      if (output.type === "exit" || output.type === "error") {
        setIsInstalling(false);
        // Re-check binary availability after install finishes
        setTimeout(() => checkBinary(), 500);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [installExecId]);

  const checkBinary = async () => {
    try {
      const available = await invoke<boolean>("check_binary", {
        binName: tool.bin,
      });
      setBinaryAvailable(available);
    } catch {
      setBinaryAvailable(false);
    }
  };

  const handleInstall = async () => {
    if (!tool.install?.brew) return;

    setIsInstalling(true);
    setInstallLogs([]);

    try {
      const execId = await invoke<string>("install_binary", {
        brewPackage: tool.install.brew,
        isCask: tool.install.cask ?? false,
        downloadUrl: tool.install.url ?? null,
        binName: tool.bin,
      });
      setInstallExecId(execId);
    } catch (err) {
      setInstallLogs([{ type: "error", data: `Install failed: ${err}` }]);
      setIsInstalling(false);
    }
  };

  const loadPresets = async () => {
    try {
      const presetsList = await invoke<Preset[]>("get_presets", {
        toolId: tool.id,
      });
      setPresets(presetsList);
    } catch (err) {
      console.error("Failed to load presets:", err);
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;

    try {
      await invoke("save_preset", {
        toolId: tool.id,
        presetName: newPresetName,
        params,
      });
      await loadPresets();
      setNewPresetName("");
      setShowPresetInput(false);
    } catch (err) {
      console.error("Failed to save preset:", err);
    }
  };

  const handleLoadPreset = (presetName: string) => {
    const preset = presets.find((p) => p.name === presetName);
    if (preset) {
      setParams(preset.params);
      setSelectedPreset(presetName);
    }
  };

  const handleDeletePreset = async (presetName: string) => {
    try {
      await invoke("delete_preset", {
        toolId: tool.id,
        presetName,
      });
      await loadPresets();
      if (selectedPreset === presetName) {
        setSelectedPreset("");
      }
    } catch (err) {
      console.error("Failed to delete preset:", err);
    }
  };

  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setSelectedPreset("");
  };

  const handleFileSelect = async (key: string) => {
    const selected = await open({
      multiple: false,
    });
    if (selected && typeof selected === "string") {
      handleParamChange(key, selected);
    }
  };

  const handleSaveFileSelect = async (key: string) => {
    const selected = await save({});
    if (selected) {
      handleParamChange(key, selected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute(params);
  };

  const getArgKey = (arg: Argument): string => {
    return arg.key;
  };

  const renderArgument = (arg: Argument) => {
    const key = getArgKey(arg);
    const label = "label" in arg && arg.label ? arg.label : key;
    const required = "required" in arg ? arg.required : false;

    switch (arg.type) {
      case "text":
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={params[key] || ""}
              onChange={(e) => handleParamChange(key, e.target.value)}
              placeholder={arg.placeholder}
              required={required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case "int":
      case "float":
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={params[key] ?? ""}
              onChange={(e) =>
                handleParamChange(
                  key,
                  arg.type === "int"
                    ? parseInt(e.target.value)
                    : parseFloat(e.target.value)
                )
              }
              min={arg.min}
              max={arg.max}
              step={arg.type === "float" ? "0.01" : "1"}
              required={required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case "bool":
        return (
          <div key={key} className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={params[key] || false}
                onChange={(e) => handleParamChange(key, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                {label}
              </span>
            </label>
          </div>
        );

      case "enum":
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={params[key] || ""}
              onChange={(e) => handleParamChange(key, e.target.value)}
              required={required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {arg.values.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>
        );

      case "file":
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={params[key] || ""}
                onChange={(e) => handleParamChange(key, e.target.value)}
                required={required}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select a file..."
              />
              <button
                type="button"
                onClick={() => handleFileSelect(key)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderOutputs = () => {
    if (tool.outputs.length === 0) return null;

    return tool.outputs.map((output) => (
      <div key={output.key} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {output.key}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={params[output.key] || ""}
            onChange={(e) => handleParamChange(output.key, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={output.default_template || "Output path..."}
          />
          {output.output_type === "save_file" && (
            <button
              type="button"
              onClick={() => handleSaveFileSelect(output.key)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{tool.label}</h2>
        {tool.description && (
          <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-400 font-mono">Binary: {tool.bin}</span>
          {binaryAvailable === true && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" /> Installed
            </span>
          )}
          {binaryAvailable === false && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" /> Not found
            </span>
          )}
          {binaryAvailable === null && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking…
            </span>
          )}
        </div>
        {tool.cwd && (
          <div className="flex items-center gap-1 mt-1">
            <FolderOpen className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 font-mono truncate" title={tool.cwd}>
              cwd: {tool.cwd}
            </span>
          </div>
        )}
        {tool.env && Object.keys(tool.env).length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Variable className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 font-mono truncate">
              env: {Object.keys(tool.env).join(", ")}
            </span>
          </div>
        )}
        {tool.chain && tool.chain.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Link className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">
              Chain: {tool.chain.length} steps ({tool.chain.map(s => s.label).join(" → ")})
            </span>
          </div>
        )}
      </div>

      {binaryAvailable === false && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Binary "{tool.bin}" is not installed
              </p>
              {tool.install?.brew ? (
                <div className="mt-2">
                  <p className="text-xs text-amber-700 mb-2">
                    Install via Homebrew: <code className="bg-amber-100 px-1 rounded">brew install {tool.install.cask ? "--cask " : ""}{tool.install.brew}</code>
                  </p>
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-md transition-colors text-sm font-medium"
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Installing…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Install {tool.install.brew}
                      </>
                    )}
                  </button>
                  {tool.install.notes && (
                    <p className="text-xs text-amber-600 mt-2">{tool.install.notes}</p>
                  )}
                </div>
              ) : tool.install?.url ? (
                <p className="text-xs text-amber-700 mt-1">
                  Download from: <a href={tool.install.url} className="underline">{tool.install.url}</a>
                </p>
              ) : (
                <p className="text-xs text-amber-700 mt-1">
                  Please install "{tool.bin}" manually and ensure it is on your PATH.
                </p>
              )}
            </div>
          </div>

          {installLogs.length > 0 && (
            <div className="mt-3 bg-gray-900 rounded-md p-3 max-h-48 overflow-y-auto font-mono text-xs">
              {installLogs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "stderr"
                      ? "text-yellow-400"
                      : log.type === "exit"
                      ? "text-green-400"
                      : log.type === "info"
                      ? "text-blue-400"
                      : "text-gray-300"
                  }
                >
                  {log.data}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {presets.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Load Preset
          </label>
          <div className="flex gap-2">
            <select
              value={selectedPreset}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a preset...</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
            {selectedPreset && (
              <button
                type="button"
                onClick={() => handleDeletePreset(selectedPreset)}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors text-sm"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {tool.args.map((arg) => renderArgument(arg))}
        {renderOutputs()}

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={isExecuting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors font-medium"
          >
            {isExecuting ? (
              <>
                <Square className="w-4 h-4" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </button>

          {isExecuting && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {!isExecuting && (
            <button
              type="button"
              onClick={() => setShowPresetInput(!showPresetInput)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              title="Save as preset"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>

        {showPresetInput && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Save Current Parameters as Preset
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPresetInput(false);
                  setNewPresetName("");
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
