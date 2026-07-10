import { useState, useEffect } from "react";
import { ArrowRight, Info } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface ColumnMapperProps {
  columns: string[];
  preview: Record<string, string>[];
  requiredVariables?: string[];
  onMappingChange: (mapping: Record<string, string>) => void;
}

const COMMON_VARIABLES = [
  "email",
  "recipient_name",
  "company_name",
  "job_title",
  "linkedin_url",
  "phone",
  "location",
];

export function ColumnMapper({
  columns,
  preview,
  requiredVariables = ["email"],
  onMappingChange,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    const autoMapping: Record<string, string> = {};
    const mappedVars = new Set<string>();

    columns.forEach((col) => {
      const cleanCol = col.toLowerCase().replace(/[\s_\-]+/g, "");

      // Find matched variable
      let matchedVar = "";
      if (["email", "emailaddress", "mail", "contactemail"].includes(cleanCol)) {
        matchedVar = "email";
      } else if (["name", "fullname", "recipientname", "contactname"].includes(cleanCol)) {
        matchedVar = "recipient_name";
      } else if (["company", "companyname", "organization", "employer", "firm"].includes(cleanCol)) {
        matchedVar = "company_name";
      } else if (["role", "jobtitle", "title", "position", "designation", "targetrole", "rolename"].includes(cleanCol)) {
        matchedVar = "job_title";
      } else if (["linkedin", "linkedinurl", "linkedinprofile"].includes(cleanCol)) {
        matchedVar = "linkedin_url";
      } else if (["phone", "phonenumber", "mobile"].includes(cleanCol)) {
        matchedVar = "phone";
      } else if (["location", "city", "address"].includes(cleanCol)) {
        matchedVar = "location";
      }

      if (matchedVar && !mappedVars.has(matchedVar)) {
        autoMapping[col] = matchedVar;
        mappedVars.add(matchedVar);
      }
    });

    // Check if autoMapping is different from current mapping
    const mappingKeys = Object.keys(mapping);
    const autoKeys = Object.keys(autoMapping);
    let isDifferent = mappingKeys.length !== autoKeys.length;
    if (!isDifferent) {
      for (const key of autoKeys) {
        if (mapping[key] !== autoMapping[key]) {
          isDifferent = true;
          break;
        }
      }
    }

    if (isDifferent || (mappingKeys.length === 0 && autoKeys.length > 0)) {
      setMapping(autoMapping);
      onMappingChange(autoMapping);
    }
  }, [columns]);

  const handleChange = (col: string, variable: string) => {
    const updated = { ...mapping, [col]: variable };
    // Remove empty mappings
    if (!variable) delete updated[col];
    setMapping(updated);
    onMappingChange(updated);
  };

  const isMapped = (varName: string) =>
    Object.values(mapping).includes(varName);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 glass p-3">
        <Info size={14} className="text-rose-muted mt-0.5 flex-shrink-0" />
        <p className="text-xs text-rose-subtle">
          Map each spreadsheet column to a template variable. The{" "}
          <code className="bg-rose-overlay px-1 rounded text-rose-pine font-mono">email</code> column is required.
        </p>
      </div>

      <div className="space-y-2">
        {columns.map((col) => (
          <div key={col} className="flex items-center gap-3 glass p-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-text">{col}</p>
              {preview[0]?.[col] && (
                <p className="text-xs text-rose-subtle mt-0.5">
                  e.g. &quot;{String(preview[0][col]).slice(0, 40)}&quot;
                </p>
              )}
            </div>
            <ArrowRight size={14} className="text-rose-subtle flex-shrink-0" />
            <CustomSelect
              value={mapping[col] ?? ""}
              onChange={(val) => handleChange(col, val.toString())}
              options={[
                { value: "", label: "— Skip —" },
                ...COMMON_VARIABLES.map((v) => ({
                  value: v,
                  label: `{{ ${v} }}`,
                  disabled: isMapped(v) && mapping[col] !== v,
                })),
              ]}
              placeholder="— Skip —"
              className="w-48"
            />
          </div>
        ))}
      </div>

      {/* Validation */}
      {requiredVariables.map((req) => (
        <div
          key={req}
          className={`text-xs px-3 py-2 rounded-none border-2 border-rose-border ${
            isMapped(req)
              ? "bg-rose-foam/15 text-rose-text"
              : "bg-rose-love/15 text-rose-love font-bold"
          }`}
        >
          {isMapped(req) ? "✓" : "✗"} Required:{" "}
          <code className="bg-rose-surface px-1 rounded font-mono">{"{{ " + req + " }}"}</code>{" "}
          {isMapped(req) ? "is mapped" : "must be mapped"}
        </div>
      ))}
    </div>
  );
}
