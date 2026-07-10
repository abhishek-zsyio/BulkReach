import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { cn, formatBytes } from "@/utils/helpers";
import { MAX_SPREADSHEET_SIZE_MB } from "@/utils/constants";

interface DropzoneUploadProps {
  onFileAccepted: (file: File) => void;
  isLoading?: boolean;
  label?: string;
  accept?: Record<string, string[]>;
  maxSizeMb?: number;
}

export function DropzoneUpload({
  onFileAccepted,
  isLoading = false,
  label = "spreadsheet",
  accept = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-excel": [".xls"],
    "text/csv": [".csv"],
  },
  maxSizeMb = MAX_SPREADSHEET_SIZE_MB,
}: DropzoneUploadProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) {
        setFile(accepted[0]);
        onFileAccepted(accepted[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: false,
    disabled: isLoading,
  });

  const acceptedExts = Object.values(accept).flat().join(", ");

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-none p-10 text-center cursor-pointer transition-all duration-200 border-rose-border bg-rose-surface",
          isDragActive
            ? "bg-rose-love/5 shadow-[4px_4px_0px_0px_var(--color-love)] -translate-x-[2px] -translate-y-[2px]"
            : "hover:bg-rose-overlay/40 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)]",
          isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} id="dropzone-input" />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-none bg-rose-overlay border-2 border-rose-border flex items-center justify-center shadow-[3px_3px_0px_0px_var(--color-shadow)]">
            <Upload size={24} className="text-rose-love" />
          </div>
          {isDragActive ? (
            <p className="text-rose-text font-bold">Drop it here!</p>
          ) : (
            <>
              <p className="text-rose-text font-bold">
                Drag & drop your {label}
              </p>
              <p className="text-rose-subtle text-sm">
                or{" "}
                <span className="text-rose-love font-bold underline underline-offset-2">
                  browse files
                </span>
              </p>
            </>
          )}
          <p className="text-xs text-rose-muted font-medium">
            Supports {acceptedExts} — max {maxSizeMb} MB
          </p>
        </div>
      </div>

      {file && (
        <div className="mt-3 flex items-center gap-3 bg-rose-surface border-2 border-rose-border rounded-none p-3 shadow-[3px_3px_0px_0px_var(--color-shadow)]">
          <FileSpreadsheet size={18} className="text-rose-pine flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose-text font-bold truncate">{file.name}</p>
            <p className="text-xs text-rose-subtle">{formatBytes(file.size)}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFile(null);
            }}
            className="text-rose-muted hover:text-rose-love transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
