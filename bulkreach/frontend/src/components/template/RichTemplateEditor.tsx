import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  Heading2, Code2, Type, Code,
} from "lucide-react";
import { cn } from "@/utils/helpers";
import { HtmlCodeEditor } from "./HtmlCodeEditor";

interface RichTemplateEditorProps {
  value: string;
  onChange: (html: string) => void;
  variables?: string[];
}

type EditorMode = "visual" | "html";

const TOOLBAR_BTN =
  "w-8 h-8 rounded-none border flex items-center justify-center transition-all text-xs font-bold";

export function RichTemplateEditor({
  value,
  onChange,
  variables = [],
}: RichTemplateEditorProps) {
  const [mode, setMode] = useState<EditorMode>("visual");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Start writing your email template…" }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (mode === "visual") {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] p-6 text-rose-text text-sm leading-relaxed focus:outline-none prose prose-neutral prose-sm max-w-none bg-rose-surface",
      },
    },
  });

  // Detect complex HTML that TipTap would destroy
  const isComplexHtml = (html: string) => html.includes("<table") || html.includes("<html") || html.includes("<body");

  // Sync from HTML mode → visual editor when switching back
  const handleModeSwitch = (newMode: EditorMode) => {
    if (newMode === "visual") {
      if (isComplexHtml(value)) {
        toast.error("Visual editor does not support complex HTML layouts. Please use the HTML editor.");
        return;
      }
      if (mode === "html") {
        // Push current raw HTML into TipTap
        editor?.commands.setContent(value, false);
      }
    }
    if (newMode === "html" && mode === "visual") {
      // Export TipTap HTML to raw textarea
      let html = editor?.getHTML() ?? "";
      
      // Basic formatting to prevent single-line minified HTML
      html = html
        .replace(/><\/p>/g, ">\n</p>")
        .replace(/><p/g, ">\n\n<p")
        .replace(/><div/g, ">\n<div")
        .replace(/><\/div>/g, ">\n</div>")
        .replace(/><h/g, ">\n\n<h")
        .replace(/><ul/g, ">\n<ul")
        .replace(/><\/ul>/g, ">\n</ul>")
        .replace(/><li/g, ">\n  <li")
        .replace(/><\/li>/g, ">\n  </li>\n")
        .replace(/><table/g, ">\n<table")
        .replace(/><tr/g, ">\n  <tr")
        .replace(/><td/g, ">\n    <td")
        .replace(/^\s*[\r\n]/gm, "") // remove completely empty lines
        .trim();

      onChange(html);
    }
    setMode(newMode);
  };

  // Keep visual editor in sync when value changes externally (e.g. loading a starter template)
  useEffect(() => {
    if (isComplexHtml(value) && mode === "visual") {
      setMode("html");
      return;
    }

    if (mode === "visual" && editor) {
      const current = editor.getHTML();
      // Only set content if the editor is NOT focused, to prevent cursor jumps
      if (current !== value && !editor.isFocused) {
        editor.commands.setContent(value, false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, editor]);

  const insertVariable = (varName: string) => {
    if (mode === "visual") {
      editor?.chain().focus().insertContent(`{{ ${varName} }}`).run();
    } else {
      // Insert at end in HTML mode (textarea)
      onChange(value + ` {{ ${varName} }}`);
    }
  };

  if (!editor) return null;

  return (
    <div className="rounded-none flex flex-col border-2 border-rose-border bg-rose-surface shadow-[4px_4px_0px_0px_var(--color-hl-high)]">
      {/* ── Row 1: Mode Segmented Toggle ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-rose-overlay border-b-2 border-rose-border flex-shrink-0">
        {/* Flat & Sharp Segmented toggle */}
        <div className="flex rounded-none p-1 bg-rose-overlay border-2 border-rose-border gap-1 shadow-[2px_2px_0px_0px_var(--color-hl-low)]">
          <button
            type="button"
            onClick={() => handleModeSwitch("visual")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-bold transition-all duration-150 border-2",
              mode === "visual"
                ? "bg-rose-surface border-rose-border text-rose-text shadow-[2px_2px_0px_0px_var(--color-shadow)] -translate-x-[1px] -translate-y-[1px]"
                : "border-transparent text-rose-subtle hover:text-rose-text"
            )}
          >
            <Type size={11} />
            Visual
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("html")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-bold transition-all duration-150 border-2",
              mode === "html"
                ? "bg-rose-surface border-rose-border text-rose-text shadow-[2px_2px_0px_0px_var(--color-shadow)] -translate-x-[1px] -translate-y-[1px]"
                : "border-transparent text-rose-subtle hover:text-rose-text"
            )}
          >
            <Code size={11} />
            HTML
          </button>
        </div>

        <span className="text-[10px] font-bold text-rose-muted uppercase tracking-wider font-mono mr-1">
          {mode === "visual" ? "WYSIWYG Editor" : "Raw Source"}
        </span>
      </div>

      {/* ── Row 2: Formatting controls (only in Visual mode) ── */}
      {mode === "visual" && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-rose-overlay/40 border-b-2 border-rose-border flex-shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              TOOLBAR_BTN,
              editor.isActive("bold")
                ? "text-rose-love border-rose-border bg-rose-love/15 shadow-[1px_1px_0px_0px_var(--color-shadow)] -translate-x-[0.5px] -translate-y-[0.5px]"
                : "text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/50 border-transparent"
            )}
            title="Bold"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              TOOLBAR_BTN,
              editor.isActive("italic")
                ? "text-rose-love border-rose-border bg-rose-love/15 shadow-[1px_1px_0px_0px_var(--color-shadow)] -translate-x-[0.5px] -translate-y-[0.5px]"
                : "text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/50 border-transparent"
            )}
            title="Italic"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              TOOLBAR_BTN,
              editor.isActive("underline")
                ? "text-rose-love border-rose-border bg-rose-love/15 shadow-[1px_1px_0px_0px_var(--color-shadow)] -translate-x-[0.5px] -translate-y-[0.5px]"
                : "text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/50 border-transparent"
            )}
            title="Underline"
          >
            <UnderlineIcon size={13} />
          </button>
          <div className="w-px h-4 mx-1.5 bg-rose-hl-med" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              TOOLBAR_BTN,
              editor.isActive("heading", { level: 2 })
                ? "text-rose-love border-rose-border bg-rose-love/15 shadow-[1px_1px_0px_0px_var(--color-shadow)] -translate-x-[0.5px] -translate-y-[0.5px]"
                : "text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/50 border-transparent"
            )}
            title="Heading"
          >
            <Heading2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              TOOLBAR_BTN,
              editor.isActive("bulletList")
                ? "text-rose-love border-rose-border bg-rose-love/15 shadow-[1px_1px_0px_0px_var(--color-shadow)] -translate-x-[0.5px] -translate-y-[0.5px]"
                : "text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/50 border-transparent"
            )}
            title="Bullet list"
          >
            <List size={13} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              TOOLBAR_BTN,
              editor.isActive("orderedList")
                ? "text-rose-love border-rose-border bg-rose-love/15 shadow-[1px_1px_0px_0px_var(--color-shadow)] -translate-x-[0.5px] -translate-y-[0.5px]"
                : "text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/50 border-transparent"
            )}
            title="Ordered list"
          >
            <ListOrdered size={13} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(
              TOOLBAR_BTN,
              editor.isActive("code")
                ? "text-rose-love border-rose-border bg-rose-love/15 shadow-[1px_1px_0px_0px_var(--color-shadow)] -translate-x-[0.5px] -translate-y-[0.5px]"
                : "text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/50 border-transparent"
            )}
            title="Inline code"
          >
            <Code2 size={13} />
          </button>
        </div>
      )}

      {/* ── Row 3: Variable quick-insert pills (scrollable bar) ── */}
      {variables.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-rose-surface border-b-2 border-rose-border overflow-x-auto flex-shrink-0 scrollbar-thin">
          <span className="text-[10px] font-bold text-rose-subtle uppercase tracking-wider whitespace-nowrap">Insert:</span>
          <div className="flex gap-1.5">
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="px-2.5 py-1 rounded-none text-[11px] font-mono font-bold transition-all border-2 bg-rose-surface border-rose-border text-rose-pine hover:bg-rose-hl-low hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--color-shadow)] active:translate-x-0 active:translate-y-0 active:shadow-none whitespace-nowrap"
                title={`Insert {{ ${v} }}`}
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Editor Content ── */}
      {mode === "visual" ? (
        <div className="bg-rose-surface border-t-2 border-rose-border rounded-none overflow-hidden">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <HtmlCodeEditor value={value} onChange={onChange} minHeight={320} />
      )}
    </div>
  );
}
