import { useState } from "react";
import { Tag, X } from "lucide-react";

interface JobTitlesEditorProps {
  titles: string[];
  onChange: (t: string[]) => void;
}

export function JobTitlesEditor({ titles, onChange }: JobTitlesEditorProps) {
  const [input, setInput] = useState("");

  const addTitle = () => {
    const trimmed = input.trim();
    if (trimmed && !titles.includes(trimmed)) {
      onChange([...titles, trimmed]);
    }
    setInput("");
  };

  const removeTitle = (t: string) => onChange(titles.filter((x) => x !== t));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTitle();
            }
          }}
          placeholder="e.g. HR Manager, Talent Acquisition"
          className="input flex-1 text-sm border-[3px] focus:shadow-[3px_3px_0px_0px_var(--color-shadow)] focus:-translate-x-[1px] focus:-translate-y-[1px] transition-all"
        />
        <button
          type="button"
          onClick={addTitle}
          className="btn-secondary px-4 py-2 text-xs border-[3px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {titles.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border-2 border-rose-border bg-rose-hl-low text-rose-text shadow-[1px_1px_0px_0px_var(--color-shadow)]"
          >
            <Tag size={10} className="stroke-[2.5]" />
            {t}
            <button
              type="button"
              onClick={() => removeTitle(t)}
              className="hover:text-rose-love transition-colors"
            >
              <X size={10} className="stroke-[3]" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
