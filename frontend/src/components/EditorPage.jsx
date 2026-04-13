import { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";

const STARTER = `print("Hello, world!")
`;

const PYODIDE_VERSION = "0.27.0";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;

export default function EditorPage() {
  const [code, setCode] = useState(STARTER);
  const [output, setOutput] = useState("");
  // "loading" | "ready" | "running" | "load-error"
  const [status, setStatus] = useState("loading");
  const pyodideRef = useRef(null);

  // Load Pyodide runtime once on mount
  useEffect(() => {
    let cancelled = false;

    // Avoid loading twice if the script is already present
    if (window.loadPyodide) {
      initPyodide();
      return;
    }

    const script = document.createElement("script");
    script.src = PYODIDE_CDN;
    script.async = true;
    script.onload = () => { if (!cancelled) initPyodide(); };
    script.onerror = () => { if (!cancelled) setStatus("load-error"); };
    document.head.appendChild(script);

    return () => { cancelled = true; };

    async function initPyodide() {
      try {
        const py = await window.loadPyodide({
          indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
        });
        if (!cancelled) {
          pyodideRef.current = py;
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("load-error");
      }
    }
  }, []);

  const runCode = useCallback(async () => {
    const py = pyodideRef.current;
    if (!py || status !== "ready") return;

    setStatus("running");
    setOutput("");

    let out = "";
    py.setStdout({ batched: (t) => { out += t + "\n"; } });
    py.setStderr({ batched: (t) => { out += "⚠ " + t + "\n"; } });

    try {
      await py.runPythonAsync(code);
      setOutput(out || "(no output)");
    } catch (err) {
      setOutput((out ? out + "\n" : "") + "✕ " + err.message);
    } finally {
      setStatus("ready");
    }
  }, [code, status]);

  // Always keep ref in sync so the Monaco keybinding closure never goes stale
  const runCodeRef = useRef(runCode);
  useEffect(() => { runCodeRef.current = runCode; });

  // onMount is called once — use the ref so it always invokes the latest runCode
  const handleEditorMount = useCallback((editor, monaco) => {
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => runCodeRef.current()
    );
  }, []);

  return (
    <div className="editor-page">
      <div className="editor-toolbar">
        <span className="section-label">PYTHON EDITOR</span>
        <div className="editor-toolbar-right">
          {status === "loading" && (
            <span className="editor-status editor-status--loading">
              Loading Python runtime…
            </span>
          )}
          {status === "load-error" && (
            <span className="editor-status editor-status--error">
              Failed to load Python runtime
            </span>
          )}
          {(status === "ready" || status === "running") && (
            <span className="editor-status editor-status--ready">
              Python {PYODIDE_VERSION}
            </span>
          )}
          <button
            className="editor-run-btn"
            onClick={runCode}
            disabled={status !== "ready"}
          >
            {status === "running" ? "Running…" : "▶ Run"}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-pane">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val ?? "")}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              fontFamily: "'SF Mono', ui-monospace, 'Menlo', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              lineNumbers: "on",
              renderLineHighlight: "all",
            }}
          />
        </div>

        <div className="editor-output-pane">
          <div className="editor-output-label">OUTPUT</div>
          <pre className="editor-output">
            {status === "loading"
              ? "Loading Python runtime (first load ~5 s)…"
              : status === "load-error"
              ? "Could not load the Python runtime.\nCheck your internet connection and reload."
              : status === "running"
              ? "Running…"
              : output || "Press ▶ Run"}
          </pre>
        </div>
      </div>
    </div>
  );
}
