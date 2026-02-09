export interface InstallHint {
  brew?: string;
  cask?: boolean;
  url?: string;
  notes?: string;
}

export interface Tool {
  id: string;
  label: string;
  bin: string;
  args: Argument[];
  command: string[];
  outputs: OutputSpec[];
  description?: string;
  install?: InstallHint;
  group?: string;
  cwd?: string;
  env?: Record<string, string>;
  chain?: ChainStep[];
}

export interface ChainStep {
  label: string;
  bin: string;
  command: string[];
  args?: Argument[];
  cwd?: string;
  env?: Record<string, string>;
  continueOnError?: boolean;
}

export type Argument =
  | TextArgument
  | IntArgument
  | FloatArgument
  | BoolArgument
  | EnumArgument
  | FileArgument;

export interface TextArgument {
  type: "text";
  key: string;
  required?: boolean;
  default?: string;
  label?: string;
  placeholder?: string;
}

export interface IntArgument {
  type: "int";
  key: string;
  required?: boolean;
  default?: number;
  label?: string;
  min?: number;
  max?: number;
}

export interface FloatArgument {
  type: "float";
  key: string;
  required?: boolean;
  default?: number;
  label?: string;
  min?: number;
  max?: number;
}

export interface BoolArgument {
  type: "bool";
  key: string;
  default?: boolean;
  label?: string;
}

export interface EnumArgument {
  type: "enum";
  key: string;
  values: string[];
  required?: boolean;
  default?: string;
  label?: string;
}

export interface FileArgument {
  type: "file";
  key: string;
  required?: boolean;
  label?: string;
  filters?: FileFilter[];
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OutputSpec {
  key: string;
  output_type: string;
  default_template?: string;
}

export interface ExecutionOutput {
  type: string;
  data: string;
}

export interface Preset {
  name: string;
  params: Record<string, any>;
}
