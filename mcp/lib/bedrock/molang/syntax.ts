import { inspectMolangQuery } from "./queryCatalog";

export type MolangSyntaxDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  offset?: number;
};

export type MolangSyntaxAnalysis = {
  valid_structure: boolean;
  diagnostics: MolangSyntaxDiagnostic[];
  features: string[];
  queries: {
    used: string[];
    unknown: string[];
    internal_or_deprecated: string[];
    client_only: string[];
    version_sensitive: Array<{ name: string; min_format_version: string }>;
  };
};

const LIMIT = 16;
const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

function stripStrings(expression: string, diagnostics: MolangSyntaxDiagnostic[]): string {
  let out = "";
  let inSingle = false;
  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i];
    if (ch === '"' && !inSingle && diagnostics.length < LIMIT) {
      diagnostics.push({ severity: "error", code: "double_quoted_string", message: "Molang strings use single quotes; double-quoted string syntax is not supported.", offset: i });
    }
    if (ch === "'") {
      inSingle = !inSingle;
      out += " ";
      continue;
    }
    out += inSingle ? " " : ch;
  }
  if (inSingle && diagnostics.length < LIMIT) {
    diagnostics.push({ severity: "error", code: "unclosed_string", message: "Molang single-quoted string is not closed." });
  }
  return out;
}

function checkDelimiters(expression: string, diagnostics: MolangSyntaxDiagnostic[]): void {
  const stack: Array<{ ch: string; offset: number }> = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i];
    if (ch === "(" || ch === "[" || ch === "{") stack.push({ ch, offset: i });
    else if (ch === ")" || ch === "]" || ch === "}") {
      const top = stack.pop();
      if (!top || top.ch !== pairs[ch]) {
        if (diagnostics.length < LIMIT) diagnostics.push({ severity: "error", code: "mismatched_delimiter", message: `Unexpected ${ch} delimiter.`, offset: i });
        return;
      }
    }
  }
  if (stack.length && diagnostics.length < LIMIT) {
    const top = stack[stack.length - 1];
    diagnostics.push({ severity: "error", code: "unclosed_delimiter", message: `Unclosed ${top.ch} delimiter.`, offset: top.offset });
  }
}

function queryUsage(expression: string, diagnostics: MolangSyntaxDiagnostic[]) {
  const used: string[] = [], unknown: string[] = [], internal: string[] = [], clientOnly: string[] = [];
  const versionSensitive = new Map<string, string>();
  const rx = /\b(q|query)\.([a-z_][a-z0-9_]*)(\s*\()?/gi;
  for (const match of expression.matchAll(rx)) {
    const name = `query.${match[2].toLowerCase()}`;
    used.push(name);
    const info = inspectMolangQuery(name);
    if (info.status === "unknown") unknown.push(name);
    if (info.status === "internal_or_deprecated") internal.push(name);
    if (info.context === "client_only") clientOnly.push(name);
    if (info.min_format_version) versionSensitive.set(name, info.min_format_version);
    const called = Boolean(match[3]?.includes("("));
    if (info.argument_style === "none" && called && diagnostics.length < LIMIT) diagnostics.push({ severity: "warning", code: "query_parentheses_unexpected", message: `${name} takes no arguments; official Molang syntax uses it without parentheses.`, ...(match.index === undefined ? {} : { offset: match.index }) });
    if (info.argument_style === "required" && !called && diagnostics.length < LIMIT) diagnostics.push({ severity: "error", code: "query_arguments_required", message: `${name} requires arguments.`, ...(match.index === undefined ? {} : { offset: match.index }) });
  }
  for (const name of sorted(internal)) if (diagnostics.length < LIMIT) diagnostics.push({ severity: "error", code: "internal_or_deprecated_query", message: `${name} is documented as internal/deprecated and is not valid custom-content query surface.` });
  for (const name of sorted(unknown)) if (diagnostics.length < LIMIT) diagnostics.push({ severity: "warning", code: "unknown_query", message: `${name} is not in the current stable official Query Functions catalog; preserve for forward compatibility but review target version.` });
  return { used: sorted(used), unknown: sorted(unknown), internal_or_deprecated: sorted(internal), client_only: sorted(clientOnly), version_sensitive: [...versionSensitive].sort(([a],[b]) => a.localeCompare(b)).map(([name,min_format_version]) => ({ name, min_format_version })) };
}

export function lintMolangExpression(expression: string): MolangSyntaxAnalysis {
  const diagnostics: MolangSyntaxDiagnostic[] = [];
  const stripped = stripStrings(expression, diagnostics);
  checkDelimiters(stripped, diagnostics);
  if (/\b(?:query|q|context|c)\.[a-z_][a-z0-9_]*\s*=/i.test(stripped) && diagnostics.length < LIMIT) diagnostics.push({ severity: "error", code: "readonly_scope_assignment", message: "query.* and context.* scopes are read-only and cannot be assignment targets." });
  if (/\b(?:break|continue)\b/i.test(stripped) && !/\b(?:loop|for_each)\s*\(/i.test(stripped) && diagnostics.length < LIMIT) diagnostics.push({ severity: "warning", code: "loop_control_without_loop", message: "break/continue appears without a loop/for_each call in the same expression." });
  const features: string[] = [];
  const tests: Array<[RegExp,string]> = [
    [/\?\?/, "null_coalescing"], [/->/, "actor_reference"], [/\bloop\s*\(/i, "loop"], [/\bfor_each\s*\(/i, "for_each"], [/\bbreak\b/i, "break"], [/\bcontinue\b/i, "continue"], [/\breturn\b/i, "return"], [/\bthis\b/i, "this"], [/\?/, "conditional"], [/\[[^\]]*\]/, "array_access"], [/\{/, "brace_scope"],
  ];
  for (const [rx,name] of tests) if (rx.test(stripped)) features.push(name);
  const queries = queryUsage(stripped, diagnostics);
  return { valid_structure: !diagnostics.some((d) => d.severity === "error"), diagnostics, features: sorted(features), queries };
}
