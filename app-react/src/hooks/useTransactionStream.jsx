import { useEffect, useRef, useState } from "react";

export default function useTransactionStream(
  url = "http://127.0.0.1:8000/transactions/v2"
) {
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState("idle"); // 'idle'|'loading'|'error'|'done'
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    controllerRef.current = new AbortController();
    const signal = controllerRef.current.signal;
    let reader = null;
    const decoder = new TextDecoder();
    let buffer = "";

    async function start() {
      setStatus("loading");
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // If response is JSON array (fallback), read it all
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (!ct.includes("ndjson") && ct.includes("application/json")) {
          const all = await res.json();
          setTransactions(all);
          setStatus("done");
          return;
        }

        reader = res.body.getReader();
        const itemsToAppend = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // last line may be partial
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              itemsToAppend.push(obj);
            } catch (err) {
              // skip malformed line (optionally set error)
              console.error("JSON parse error for line:", line, err);
            }
          }
          if (itemsToAppend.length) {
            // batch updates to avoid excessive re-renders
            setTransactions((prev) => prev.concat(itemsToAppend.splice(0)));
          }
          // continue reading
        }

        // handle leftover buffer
        if (buffer.trim()) {
          try {
            const obj = JSON.parse(buffer);
            setTransactions((prev) => prev.concat(obj));
          } catch (err) {
            console.error("Final JSON parse error", err);
          }
        }

        setStatus("done");
      } catch (err) {
        if (err.name === "AbortError") {
          setStatus("idle");
        } else {
          console.error("Stream error", err);
          setError(err);
          setStatus("error");
        }
      } finally {
        if (reader) {
          try {
            reader.releaseLock();
          } catch {}
        }
      }
    }

    start();

    return () => {
      // cleanup / stop the stream
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [url]);

  const stop = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setStatus("idle");
  };

  return { transactions, status, error, stop };
}
