import { useEffect, useRef } from "react";
import { Terminal, AlertCircle, Info, CheckCircle } from "lucide-react";
import { ExecutionOutput } from "../types";

interface ExecutionLogProps {
  outputs: ExecutionOutput[];
}

export default function ExecutionLog({ outputs }: ExecutionLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputs]);

  const getIcon = (type: string) => {
    switch (type) {
      case "stdout":
        return <Terminal className="w-4 h-4 text-green-600" />;
      case "stderr":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "exit":
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case "stdout":
        return "text-green-800";
      case "stderr":
        return "text-red-800";
      case "error":
        return "text-red-800";
      case "exit":
        return "text-blue-800";
      default:
        return "text-gray-800";
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "stdout":
        return "bg-green-50";
      case "stderr":
        return "bg-red-50";
      case "error":
        return "bg-red-50";
      case "exit":
        return "bg-blue-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="h-64 border-t border-gray-200 bg-gray-900 overflow-hidden flex flex-col">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Execution Log
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {outputs.map((output, index) => (
          <div
            key={index}
            className={`mb-1 p-2 rounded ${getBgColor(output.type)}`}
          >
            <div className="flex items-start gap-2">
              {getIcon(output.type)}
              <span className={`flex-1 ${getTextColor(output.type)} break-all`}>
                {output.data}
              </span>
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
