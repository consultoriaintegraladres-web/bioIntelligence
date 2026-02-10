"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Code, Copy, Check, AlertCircle } from "lucide-react";
import type { ThemeMode } from "@/contexts/app-context";

export interface DebugQuery {
  label: string;
  sql: string;
}

export interface DebugError {
  message: string;
  hint?: string;
  detail?: string;
}

export interface DebugData {
  queries: DebugQuery[];
  error?: DebugError;
}

interface SqlDebuggerProps {
  debug?: DebugData;
  themeMode?: ThemeMode;
}

/* ── Lightweight SQL syntax highlighter (regex-based, no dependencies) ── */
function highlightSql(sql: string, isLight: boolean): string {
  const kw = isLight ? "#7c3aed" : "#c678dd";
  const fn = isLight ? "#0369a1" : "#61afef";
  const str = isLight ? "#16a34a" : "#98c379";
  const num = isLight ? "#c2410c" : "#d19a66";
  const comment = isLight ? "#9ca3af" : "#5c6370";

  // 1. Escape HTML
  let r = sql.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 2. Extract strings into placeholders to avoid inner-highlighting conflicts
  const strings: string[] = [];
  r = r.replace(/'([^']*)'/g, (_, inner) => {
    strings.push(inner);
    return `__STR_${strings.length - 1}__`;
  });

  // 3. Highlight comments
  r = r.replace(/(--[^\n]*)/g, `<span style="color:${comment};font-style:italic">$1</span>`);

  // 4. Highlight numbers
  r = r.replace(/\b(\d+\.?\d*)\b/g, `<span style="color:${num}">$1</span>`);

  // 5. Highlight keywords
  r = r.replace(
    /\b(SELECT|FROM|WHERE|AND|OR|IN|NOT|NULL|LEFT|RIGHT|INNER|OUTER|JOIN|ON|AS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|DISTINCT|CASE|WHEN|THEN|ELSE|END|WITH|LIKE|ILIKE|BETWEEN|EXISTS|UNION|ALL|IS|TRUE|FALSE|DESC|ASC|CAST|COALESCE|LEAST|GREATEST|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|VIEW|TABLE|OVER|PARTITION)\b/gi,
    (m) => `<span style="color:${kw};font-weight:600">${m.toUpperCase()}</span>`,
  );

  // 6. Highlight functions (followed by parenthesis)
  r = r.replace(
    /\b(COUNT|SUM|AVG|MAX|MIN|UPPER|LOWER|TRIM|INITCAP|CONCAT|REPLACE|SUBSTRING|LENGTH|ROUND|NOW|DATE|EXTRACT|TO_CHAR)\b(?=\s*\()/gi,
    (m) => `<span style="color:${fn};font-weight:600">${m.toUpperCase()}</span>`,
  );

  // 7. Restore strings with coloring
  r = r.replace(/__STR_(\d+)__/g, (_, idx) => {
    return `<span style="color:${str}">'${strings[Number(idx)]}'</span>`;
  });

  return r;
}

export function SqlDebugger({ debug, themeMode = "dark" }: SqlDebuggerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLight = themeMode === "light";

  const handleCopy = useCallback(() => {
    if (!debug?.queries) return;
    let text = "## SQL Debugger Output\n\n";
    debug.queries.forEach((q) => {
      text += `### ${q.label}\n\`\`\`sql\n${q.sql.trim()}\n\`\`\`\n\n`;
    });
    if (debug.error) {
      text += `### Error de Postgres\n\`\`\`\n${debug.error.message}\n`;
      if (debug.error.hint) text += `HINT: ${debug.error.hint}\n`;
      if (debug.error.detail) text += `DETAIL: ${debug.error.detail}\n`;
      text += `\`\`\`\n`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [debug]);

  if (!debug || !debug.queries || debug.queries.length === 0) return null;

  return (
    <>
      {/* Small </> button */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`absolute top-3 right-3 z-20 p-1.5 rounded-lg transition-all duration-200 opacity-30 hover:opacity-100 ${
          isLight
            ? "bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700"
            : "bg-white/5 hover:bg-purple-500/20 text-gray-500 hover:text-purple-400"
        }`}
        title="SQL Debugger"
      >
        <Code className="w-4 h-4" />
      </button>

      {/* SQL Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`${isLight ? "bg-white border-gray-200" : "bg-[#0d0d1a] border-white/10"} border max-w-3xl w-[90vw]`}
          style={{ maxHeight: "85vh" }}
        >
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isLight ? "text-gray-900" : "text-gray-100"}`}>
              <Code className="w-5 h-5 text-purple-500" />
              SQL Debugger
              <span className={`text-xs font-normal ${isLight ? "text-gray-400" : "text-gray-500"} ml-2`}>
                {debug.queries.length} {debug.queries.length === 1 ? "consulta" : "consultas"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-auto space-y-4" style={{ maxHeight: "calc(85vh - 120px)" }}>
            {/* Error banner */}
            {debug.error && (
              <div className={`p-3 rounded-lg border ${
                isLight ? "bg-red-50 border-red-200" : "bg-red-950/30 border-red-500/30"
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className={`text-sm font-semibold ${isLight ? "text-red-800" : "text-red-400"}`}>
                      {debug.error.message}
                    </p>
                    {debug.error.hint && (
                      <p className={`text-xs mt-1 ${isLight ? "text-red-600" : "text-red-400/70"}`}>
                        <b>HINT:</b> {debug.error.hint}
                      </p>
                    )}
                    {debug.error.detail && (
                      <p className={`text-xs mt-1 ${isLight ? "text-red-600" : "text-red-400/70"}`}>
                        <b>DETAIL:</b> {debug.error.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Query blocks */}
            {debug.queries.map((q, i) => (
              <div key={i}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  {q.label}
                </div>
                <div className={`rounded-lg p-4 overflow-x-auto font-mono text-[11px] leading-relaxed ${
                  isLight ? "bg-gray-50 border border-gray-200" : "bg-[#1a1a2e] border border-white/5"
                }`}>
                  <pre
                    style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    dangerouslySetInnerHTML={{ __html: highlightSql(q.sql.trim(), isLight) }}
                  />
                </div>
              </div>
            ))}

            {/* Copy button */}
            <div className="flex justify-end pt-2 pb-1">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  copied
                    ? (isLight ? "bg-green-100 text-green-700" : "bg-green-500/20 text-green-400")
                    : (isLight ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30")
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar para Claude Code"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
