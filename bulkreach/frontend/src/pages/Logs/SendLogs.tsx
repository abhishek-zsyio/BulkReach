import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useGetLogsQuery } from "@/api/logApi";
import { LogTable } from "@/components/logs/LogTable";

export function SendLogs() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");

  const { data, isLoading } = useGetLogsQuery({
    campaignId,
    event_type: filter || undefined,
  });

  const logs = data?.results ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/campaigns/${id}`)} className="btn-secondary p-2">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-rose-text">Send Logs</h1>
          <p className="text-rose-subtle mt-1 font-medium">{data?.count ?? 0} total log entries</p>
        </div>
      </div>

      <LogTable
        logs={logs}
        isLoading={isLoading}
        onFilterChange={setFilter}
        currentFilter={filter}
        campaignId={campaignId}
      />
    </div>
  );
}
