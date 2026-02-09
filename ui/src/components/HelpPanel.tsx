import { X, Folder, FileText, Terminal, Plus, Command } from "lucide-react";

interface HelpPanelProps {
  onClose: () => void;
  toolsDir: string;
}

export default function HelpPanel({ onClose, toolsDir }: HelpPanelProps) {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">CliDeck Help</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* What is CliDeck */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            What is CliDeck?
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            CliDeck wraps command-line tools into a visual interface. Each tool is
            defined by a simple YAML file that describes the binary to run, its
            arguments, and how to build the command. You can create tools for
            any CLI workflow — project builds, deployments, media conversion,
            git operations, and more.
          </p>
        </section>

        {/* Creating Tools */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-500" />
            Creating a New Tool
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            There are two ways to add tools:
          </p>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-1">
                Option 1: Use the built-in wizard
              </p>
              <p className="text-xs text-blue-700">
                Click the <strong>+ New</strong> button in the sidebar to open the
                interactive tool creator. Fill in the fields, preview the YAML,
                and save — no manual file editing needed.
              </p>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Option 2: Write YAML manually
              </p>
              <p className="text-xs text-gray-700">
                Create a <code className="bg-gray-200 px-1 rounded">.yaml</code> file
                in the tools directory:
              </p>
              <code className="block text-xs bg-gray-200 px-2 py-1 rounded mt-1 break-all">
                {toolsDir}
              </code>
            </div>
          </div>
        </section>

        {/* YAML Format */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            YAML Tool Format
          </h3>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`id: my_project_build
label: "My Project: Build"
description: "Build the project for production"
bin: npm
install:
  brew: node
args:
  - key: env
    type: enum
    values: [development, production, staging]
    default: production
    label: "Environment"
  - key: verbose
    type: bool
    default: false
    label: "Verbose output"
command:
  - "{bin}"
  - "run"
  - "build"
  - "--env"
  - "{env}"`}
          </pre>
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">
              <strong>id</strong> — Unique identifier (lowercase, underscores)
            </p>
            <p className="text-xs text-gray-500">
              <strong>label</strong> — Display name shown in the sidebar
            </p>
            <p className="text-xs text-gray-500">
              <strong>bin</strong> — The CLI binary to execute (e.g. npm, cargo, docker)
            </p>
            <p className="text-xs text-gray-500">
              <strong>args</strong> — Input fields shown in the form. Types: text, int, float, bool, enum, file
            </p>
            <p className="text-xs text-gray-500">
              <strong>command</strong> — Template array. Use <code className="bg-gray-200 px-1 rounded">{"{bin}"}</code> for
              the binary and <code className="bg-gray-200 px-1 rounded">{"{argKey}"}</code> for argument values
            </p>
            <p className="text-xs text-gray-500">
              <strong>install</strong> — Optional. Specify <code className="bg-gray-200 px-1 rounded">brew: package-name</code> to
              enable one-click install
            </p>
          </div>
        </section>

        {/* Organizing with Folders */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-500" />
            Organizing Tools with Folders
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Create subfolders inside the tools directory to group related tools.
            The folder name becomes the group header in the sidebar.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono">
{`tools/
├── ffmpeg_audio.yaml          ← ungrouped
├── imagemagick_resize.yaml    ← ungrouped
├── my-webapp/                 ← group: "my-webapp"
│   ├── build.yaml
│   ├── start.yaml
│   ├── deploy.yaml
│   └── test.yaml
├── api-server/                ← group: "api-server"
│   ├── start.yaml
│   ├── stop.yaml
│   └── migrate.yaml
└── devops/                    ← group: "devops"
    ├── docker_build.yaml
    └── k8s_deploy.yaml`}
          </pre>
          <p className="text-sm text-gray-600 mt-3">
            You can also set <code className="bg-gray-100 px-1 rounded">group: "my-group"</code> directly
            in the YAML file to override the folder-based grouping.
          </p>
        </section>

        {/* Project Lifecycle Example */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-teal-500" />
            Example: Project Lifecycle Commands
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Here's how to set up build/start/stop/deploy for a typical project:
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`# tools/my-app/build.yaml
id: my_app_build
label: "My App: Build"
description: "Build for production"
bin: npm
args:
  - key: mode
    type: enum
    values: [production, development]
    default: production
    label: "Build Mode"
command:
  - "{bin}"
  - "run"
  - "build"
  - "--mode"
  - "{mode}"

---
# tools/my-app/start.yaml
id: my_app_start
label: "My App: Start"
description: "Start the dev server"
bin: npm
command:
  - "{bin}"
  - "run"
  - "dev"

---
# tools/my-app/deploy.yaml
id: my_app_deploy
label: "My App: Deploy"
description: "Deploy to production"
bin: npm
command:
  - "{bin}"
  - "run"
  - "deploy"`}
          </pre>
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Command className="w-5 h-5 text-indigo-500" />
            Keyboard Shortcuts
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-700">Command Palette</span>
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">⌘ 3</kbd>
            </div>
          </div>
        </section>

        {/* Template Variables */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Available Template Variables
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2 font-semibold">Variable</th>
                  <th className="pb-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr><td className="py-1 font-mono">{"{bin}"}</td><td>The resolved binary path</td></tr>
                <tr><td className="py-1 font-mono">{"{argKey}"}</td><td>Value of any argument by its key</td></tr>
                <tr><td className="py-1 font-mono">{"{inputDir}"}</td><td>Directory of the input file</td></tr>
                <tr><td className="py-1 font-mono">{"{inputStem}"}</td><td>Input filename without extension</td></tr>
                <tr><td className="py-1 font-mono">{"{inputName}"}</td><td>Input filename with extension</td></tr>
                <tr><td className="py-1 font-mono">{"{inputExt}"}</td><td>Input file extension</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
