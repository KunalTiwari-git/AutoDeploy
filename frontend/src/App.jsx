import { useState, useRef, useEffect } from "react";

const BACKEND_URL = "http://localhost:4000";
const WS_URL = "ws://localhost:4000";

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  async function handleDeploy() {
    if (!repoUrl.trim()) return;

    setLogs([]);
    setError("");
    setStatus("deploying");

    let buildId;

    try {
      const response = await fetch(`${BACKEND_URL}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Server error");
        setStatus("error");
        return;
      }

      const data = await response.json();
      buildId = data.buildId;
      // eslint-disable-next-line no-unused-vars
    } catch (_err) {
      setError("Could not reach the backend. Is it running?");
      setStatus("error");
      return;
    }

    const ws = new WebSocket(`${WS_URL}/${buildId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message = event.data;

      if (message === "BUILD_COMPLETE") {
        setStatus("done");
        ws.close();
        return;
      }

      if (message.startsWith("ERROR:")) {
        setError(message.replace("ERROR: ", ""));
        setStatus("error");
        ws.close();
        return;
      }

      setLogs((prev) => [...prev, message]);
    };

    ws.onerror = () => {
      setError("WebSocket connection failed.");
      setStatus("error");
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>AutoDeploy.live</h1>
        <p style={styles.subtitle}>
          Paste a public GitHub URL. Your app builds automatically.
        </p>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="https://github.com/username/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDeploy()}
            disabled={status === "deploying"}
          />
          <button
            style={{
              ...styles.button,
              opacity: status === "deploying" ? 0.6 : 1,
              cursor: status === "deploying" ? "not-allowed" : "pointer",
            }}
            onClick={handleDeploy}
            disabled={status === "deploying"}
          >
            {status === "deploying" ? "Building..." : "Deploy"}
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {logs.length > 0 && (
          <div style={styles.terminal}>
            {logs.map((line, i) => (
              <div key={i} style={styles.logLine}>
                <span style={styles.prompt}>$</span> {line}
              </div>
            ))}
            {status === "deploying" && (
              <div style={styles.logLine}>
                <span style={styles.cursor}>█</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        )}

        {status === "done" && (
          <div style={styles.successBox}>
            Docker image built successfully! Week 2 will run it as a live
            container.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0d1117",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "60px",
    fontFamily: "'Courier New', monospace",
  },
  container: {
    width: "100%",
    maxWidth: "700px",
    padding: "0 20px",
  },
  title: {
    color: "#e6edf3",
    fontSize: "28px",
    fontWeight: "600",
    marginBottom: "8px",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: "14px",
    marginBottom: "28px",
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  input: {
    flex: 1,
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "6px",
    padding: "10px 14px",
    color: "#e6edf3",
    fontSize: "14px",
    outline: "none",
    fontFamily: "'Courier New', monospace",
  },
  button: {
    background: "#238636",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
  },
  terminal: {
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: "8px",
    padding: "16px",
    marginTop: "16px",
    maxHeight: "400px",
    overflowY: "auto",
  },
  logLine: {
    color: "#3fb950",
    fontSize: "13px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  prompt: {
    color: "#58a6ff",
    marginRight: "8px",
  },
  cursor: {
    color: "#3fb950",
  },
  errorBox: {
    background: "#2d1b1b",
    border: "1px solid #f85149",
    borderRadius: "6px",
    padding: "12px 16px",
    color: "#f85149",
    fontSize: "13px",
    marginTop: "8px",
  },
  successBox: {
    background: "#1a2f1a",
    border: "1px solid #3fb950",
    borderRadius: "6px",
    padding: "12px 16px",
    color: "#3fb950",
    fontSize: "13px",
    marginTop: "16px",
  },
};

export default App;
