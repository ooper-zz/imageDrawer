import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Plus, Trash2, Save, X, FolderPlus } from "lucide-react";

interface ToolCreatorProps {
  onClose: () => void;
  onSaved: () => void;
}

interface ArgDraft {
  key: string;
  type: string;
  label: string;
  required: boolean;
  default_value: string;
  values: string; // comma-separated for enum
  min: string;
  max: string;
  placeholder: string;
}

interface EnvDraft {
  key: string;
  value: string;
}

const EMPTY_ARG: ArgDraft = {
  key: "",
  type: "text",
  label: "",
  required: false,
  default_value: "",
  values: "",
  min: "",
  max: "",
  placeholder: "",
};

export default function ToolCreator({ onClose, onSaved }: ToolCreatorProps) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [bin, setBin] = useState("");
  const [commandTemplate, setCommandTemplate] = useState("{bin}");
  const [cwd, setCwd] = useState("");
  const [group, setGroup] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [args, setArgs] = useState<ArgDraft[]>([]);
  const [envVars, setEnvVars] = useState<EnvDraft[]>([]);
  const [brewPackage, setBrewPackage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yamlPreview, setYamlPreview] = useState("");

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    setYamlPreview(buildYaml());
  }, [id, label, description, bin, commandTemplate, cwd, group, newGroup, args, envVars, brewPackage]);

  const loadGroups = async () => {
    try {
      const groups = await invoke<string[]>("list_tool_groups");
      setExistingGroups(groups);
    } catch {
      // ignore
    }
  };

  const addArg = () => {
    setArgs([...args, { ...EMPTY_ARG }]);
  };

  const updateArg = (index: number, field: keyof ArgDraft, value: any) => {
    const updated = [...args];
    (updated[index] as any)[field] = value;
    setArgs(updated);
  };

  const removeArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const buildYaml = (): string => {
    const lines: string[] = [];
    lines.push(`id: ${id || "my_tool"}`);
    lines.push(`label: "${label || "My Tool"}"`);
    if (description) lines.push(`description: "${description}"`);
    lines.push(`bin: ${bin || "echo"}`);

    if (cwd) {
      lines.push(`cwd: "${cwd}"`);
    }

    const validEnvVars = envVars.filter((e) => e.key.trim());
    if (validEnvVars.length > 0) {
      lines.push(`env:`);
      for (const ev of validEnvVars) {
        lines.push(`  ${ev.key}: "${ev.value}"`);
      }
    }

    if (brewPackage) {
      lines.push(`install:`);
      lines.push(`  brew: ${brewPackage}`);
    }

    if (args.length > 0) {
      lines.push(`args:`);
      for (const arg of args) {
        if (!arg.key) continue;
        lines.push(`  - key: ${arg.key}`);
        lines.push(`    type: ${arg.type}`);
        if (arg.label) lines.push(`    label: "${arg.label}"`);
        if (arg.required) lines.push(`    required: true`);
        if (arg.default_value) {
          if (arg.type === "int" || arg.type === "float") {
            lines.push(`    default: ${arg.default_value}`);
          } else if (arg.type === "bool") {
            lines.push(`    default: ${arg.default_value === "true"}`);
          } else {
            lines.push(`    default: "${arg.default_value}"`);
          }
        }
        if (arg.type === "enum" && arg.values) {
          const vals = arg.values.split(",").map((v) => v.trim()).filter(Boolean);
          lines.push(`    values: [${vals.join(", ")}]`);
        }
        if ((arg.type === "int" || arg.type === "float") && arg.min) {
          lines.push(`    min: ${arg.min}`);
        }
        if ((arg.type === "int" || arg.type === "float") && arg.max) {
          lines.push(`    max: ${arg.max}`);
        }
        if (arg.type === "text" && arg.placeholder) {
          lines.push(`    placeholder: "${arg.placeholder}"`);
        }
      }
    }

    const cmdParts = commandTemplate
      .split(/\s+/)
      .filter(Boolean);
    if (cmdParts.length > 0) {
      lines.push(`command:`);
      for (const part of cmdParts) {
        lines.push(`  - "${part}"`);
      }
    }

    return lines.join("\n") + "\n";
  };

  const handleSave = async () => {
    if (!id.trim()) {
      setError("Tool ID is required");
      return;
    }
    if (!label.trim()) {
      setError("Tool label is required");
      return;
    }
    if (!bin.trim()) {
      setError("Binary name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const yaml = buildYaml();
    const filename = `${id}.yaml`;
    const subfolder = showNewGroup && newGroup.trim()
      ? newGroup.trim()
      : group || null;

    try {
      await invoke("save_tool", {
        yamlContent: yaml,
        filename,
        subfolder,
      });
      await invoke<any[]>("reload_tools");
      onSaved();
    } catch (err) {
      setError(`Failed to save: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const effectiveGroup = showNewGroup && newGroup.trim() ? newGroup.trim() : group;

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Tool</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Basic Info
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tool ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) =>
                setId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase())
              }
              placeholder="my_project_build"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Unique identifier (lowercase, underscores)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Project: Build"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Build the project for production"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Binary / Command <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bin}
              onChange={(e) => setBin(e.target.value)}
              placeholder="npm, cargo, docker, python..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Working Directory
            </label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/Users/you/projects/my-project"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Absolute path to run the command from. Leave empty for default.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Command Template
            </label>
            <input
              type="text"
              value={commandTemplate}
              onChange={(e) => setCommandTemplate(e.target.value)}
              placeholder='{bin} run build --env {env}'
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use {"{bin}"} for the binary and {"{argKey}"} for argument
              placeholders. Space-separated tokens become command array items.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Homebrew Package (optional)
            </label>
            <input
              type="text"
              value={brewPackage}
              onChange={(e) => setBrewPackage(e.target.value)}
              placeholder="package-name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Group / Folder */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2">
            Folder / Group
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Save to folder
            </label>
            {!showNewGroup ? (
              <div className="flex gap-2">
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">(root — no folder)</option>
                  {existingGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewGroup(true)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  title="Create new folder"
                >
                  <FolderPlus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="my-project"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewGroup(false);
                    setNewGroup("");
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
            {effectiveGroup && (
              <p className="text-xs text-gray-400 mt-1">
                Will be saved to: tools/{effectiveGroup}/{id || "my_tool"}.yaml
              </p>
            )}
          </div>

          {/* Environment Variables */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2">
            Environment Variables
          </h3>

          {envVars.map((ev, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={ev.key}
                onChange={(e) => {
                  const updated = [...envVars];
                  updated[i].key = e.target.value;
                  setEnvVars(updated);
                }}
                placeholder="VAR_NAME"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
              />
              <span className="text-gray-400">=</span>
              <input
                type="text"
                value={ev.value}
                onChange={(e) => {
                  const updated = [...envVars];
                  updated[i].value = e.target.value;
                  setEnvVars(updated);
                }}
                placeholder="value or {arg_ref}"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setEnvVars(envVars.filter((_, j) => j !== i))}
                className="p-1 hover:bg-red-100 rounded text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setEnvVars([...envVars, { key: "", value: "" }])}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm text-gray-700 w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Env Variable
          </button>

          {/* Arguments */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2">
            Arguments
          </h3>

          {args.map((arg, i) => (
            <div
              key={i}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  Arg #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeArg(i)}
                  className="p-1 hover:bg-red-100 rounded text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={arg.key}
                  onChange={(e) => updateArg(i, "key", e.target.value)}
                  placeholder="key"
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
                <select
                  value={arg.type}
                  onChange={(e) => updateArg(i, "type", e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="text">Text</option>
                  <option value="int">Integer</option>
                  <option value="float">Float</option>
                  <option value="bool">Boolean</option>
                  <option value="enum">Enum</option>
                  <option value="file">File</option>
                </select>
              </div>
              <input
                type="text"
                value={arg.label}
                onChange={(e) => updateArg(i, "label", e.target.value)}
                placeholder="Display label"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
              <div className="flex gap-2 items-center">
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={arg.required}
                    onChange={(e) => updateArg(i, "required", e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  Required
                </label>
                <input
                  type="text"
                  value={arg.default_value}
                  onChange={(e) => updateArg(i, "default_value", e.target.value)}
                  placeholder="Default value"
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              {arg.type === "enum" && (
                <input
                  type="text"
                  value={arg.values}
                  onChange={(e) => updateArg(i, "values", e.target.value)}
                  placeholder="value1, value2, value3"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              )}
              {(arg.type === "int" || arg.type === "float") && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={arg.min}
                    onChange={(e) => updateArg(i, "min", e.target.value)}
                    placeholder="Min"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={arg.max}
                    onChange={(e) => updateArg(i, "max", e.target.value)}
                    placeholder="Max"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addArg}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm text-gray-700 w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Argument
          </button>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Tool"}
            </button>
          </div>
        </div>

        {/* Right: YAML Preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            YAML Preview
          </h3>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[calc(100vh-200px)] whitespace-pre-wrap">
            {yamlPreview}
          </pre>
        </div>
      </div>
    </div>
  );
}
