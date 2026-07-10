import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  className = "",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-none text-sm transition-all duration-150 cursor-pointer bg-rose-overlay border-2 border-rose-border text-rose-text hover:bg-rose-surface focus:outline-none focus:border-rose-pine shadow-[2px_2px_0px_0px_var(--color-shadow)] focus:shadow-[3px_3px_0px_0px_var(--color-foam)] text-left"
      >
        <span className={selectedOption ? "font-bold text-rose-text" : "text-rose-muted"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-rose-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Options Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute z-[999] left-0 right-0 mt-2 bg-rose-surface border-2 border-rose-border shadow-[4px_4px_0px_0px_var(--color-shadow)] max-h-60 overflow-y-auto"
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-rose-muted font-semibold">No options available</div>
            ) : (
              <div className="py-1">
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left font-bold transition-colors ${
                        opt.disabled
                          ? "opacity-40 cursor-not-allowed text-rose-muted"
                          : isSelected
                          ? "bg-rose-pine text-white"
                          : "text-rose-text hover:bg-rose-hl-low hover:text-rose-pine"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={12} className="shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
