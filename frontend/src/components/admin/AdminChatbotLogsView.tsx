import { useEffect, useState } from "react";
import { getChatbotLogs, getChatbotSessionLogs, type ChatbotLog } from "../../api/chatbotApi";

export default function AdminChatbotLogsView() {
  const [logs, setLogs] = useState<ChatbotLog[]>([]);
  const [sessionLogs, setSessionLogs] = useState<ChatbotLog[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await getChatbotLogs();
        setLogs(data);
      } catch (error) {
        console.error("Failed to load chatbot logs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSessionLoading(true);

    try {
      const data = await getChatbotSessionLogs(sessionId);
      setSessionLogs(data);
    } catch (error) {
      console.error("Failed to load session logs:", error);
    } finally {
      setSessionLoading(false);
    }
  };

  const uniqueSessions = Array.from(new Map(logs.map((log) => [log.sessionId, log])).values());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[#2c3968] mb-2">Chatbot Session Logs</h1>
        <p className="text-[#666]">View stored chatbot sessions and decision traces.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-4">
          <h2 className="text-[#2c3968] mb-4">Sessions</h2>

          {loading ? (
            <p className="text-[#666]">Loading sessions...</p>
          ) : uniqueSessions.length === 0 ? (
            <p className="text-[#666]">No chatbot sessions found.</p>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {uniqueSessions.map((log) => (
                <button
                  key={log._id}
                  onClick={() => handleSelectSession(log.sessionId)}
                  className={`w-full text-left border rounded-lg p-3 transition ${
                    selectedSessionId === log.sessionId
                      ? "border-[#2c3968] bg-[#f5f7fc]"
                      : "border-[#e5e5e5] hover:bg-[#f9f9f9]"
                  }`}
                >
                  <div className="font-medium text-[#1e1e1e] break-all">{log.sessionId}</div>
                  <div className="text-sm text-[#666] mt-1 line-clamp-2">{log.message}</div>
                  <div className="text-xs text-[#999] mt-2">{new Date(log.createdAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-4">
          <h2 className="text-[#2c3968] mb-4">Session Detail</h2>

          {!selectedSessionId ? (
            <p className="text-[#666]">Select a session to inspect it.</p>
          ) : sessionLoading ? (
            <p className="text-[#666]">Loading session logs...</p>
          ) : (
            <div className="space-y-6">
              {sessionLogs.map((log) => (
                <div key={log._id} className="border rounded-xl border-[#e5e5e5] overflow-hidden">
                  <div className="bg-[#f7f7f7] px-4 py-3 border-b border-[#e5e5e5]">
                    <div className="text-sm text-[#666]">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                    <div>
                      <h3 className="text-[#2c3968] mb-2">User / AI View</h3>
                      <div className="bg-[#f5f7fc] border border-[#dbe3f1] rounded-lg p-3 mb-3">
                        <strong>User message:</strong>
                        <div className="mt-1">{log.message}</div>
                      </div>

                      <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-lg p-3">
                        <div className="font-medium mb-2">{log.response?.summary || "No summary"}</div>

                        {(log.response?.recommendations || []).length > 0 && (
                          <div className="space-y-2">
                            {log.response?.recommendations?.map((rec, idx) => (
                              <div key={idx} className="border rounded p-2 bg-white">
                                <div className="font-medium">
                                  #{rec.rank} {rec.brand} — {rec.model}
                                </div>
                                <div className="text-sm text-[#666]">Score: {rec.score ?? "N/A"}</div>
                                {rec.why?.length ? <div className="text-sm mt-1">{rec.why.join(", ")}</div> : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-white mb-2">Developer Trace</h3>
                      <pre className="bg-[#0f172a] text-white text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.developerTrace || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
