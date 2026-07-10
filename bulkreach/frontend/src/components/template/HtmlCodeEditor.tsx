import { useRef, useCallback } from "react";

interface HtmlCodeEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

export function HtmlCodeEditor({ value, onChange, minHeight = 420 }: HtmlCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle Tab key — insert 2 spaces instead of losing focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.substring(0, start) + "  " + value.substring(end);
      onChange(newVal);
      // Restore cursor after state update
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [value, onChange]);

  // Count variables in the HTML
  const variables = Array.from(
    new Set((value.match(/\{\{\s*(\w+)\s*\}\}/g) ?? []).map((v) => v.replace(/[{}]/g, "").trim()))
  );

  const lineCount = value.split("\n").length;

  return (
    <div className="flex flex-col flex-1 bg-rose-surface">
      {/* Editor area — line numbers + textarea side by side */}
      <div className="flex flex-1 overflow-hidden font-mono text-sm leading-6 bg-rose-surface">
        {/* Line numbers */}
        <div
          className="select-none text-right pr-3 pt-4 pb-4 pl-3 flex-shrink-0 overflow-hidden bg-rose-overlay/40 border-r border-rose-hl-low text-rose-muted font-mono"
          style={{
            minWidth: "3.5rem",
            fontSize: "12px",
            lineHeight: "1.5rem",
          }}
          aria-hidden
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="html-code-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 resize-none focus:outline-none p-4 bg-rose-surface"
          style={{
            minHeight,
            color: "#575279",
            fontSize: "13px",
            lineHeight: "1.5rem",
            caretColor: "#b4637a",
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
          }}
          placeholder={`<!DOCTYPE html>\n<html>\n<body>\n  <p>Dear {{ recipient_name }},</p>\n  <p>Your message here...</p>\n  <p>Best, {{ sender_name }}</p>\n</body>\n</html>`}
        />
      </div>

      {/* Footer: detected variables */}
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap flex-shrink-0 bg-rose-overlay border-t border-rose-hl-low">
        <span className="text-xs font-bold text-rose-subtle uppercase tracking-wider">Variables detected:</span>
        {variables.length === 0 ? (
          <span className="text-xs text-rose-muted italic font-medium">none — use {"{{ variable_name }}"}</span>
        ) : (
          variables.map((v) => (
            <span
              key={v}
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-none border-2 bg-rose-love/5 border-rose-border text-rose-love"
            >
              {`{{${v}}}`}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
