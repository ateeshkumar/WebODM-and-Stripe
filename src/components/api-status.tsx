"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  success: boolean;
  message: string;
  appName: string;
  version: string;
  timestamp: string;
};

type FetchState = "loading" | "ready" | "error";

export function ApiStatus() {
  const [status, setStatus] = useState<FetchState>("loading");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        const payload = (await response.json()) as HealthResponse;

        if (!isMounted) {
          return;
        }

        setData(payload);
        setStatus("ready");
      } catch {
        if (!isMounted) {
          return;
        }

        setError("The homepage could not reach the workflow health endpoint.");
        setStatus("error");
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="status-card">
      <div className="status-header">
        <div>
          <span className="status-kicker">Live check</span>
          <h2>Workflow heartbeat</h2>
          <p className="status-copy">
            This panel calls <code>/api/health</code> so the WebODM homepage can
            confirm its backend connection before real queues, storage, and job
            data are wired in.
          </p>
        </div>

        <span className={`status-pill ${status}`}>
          {status === "loading" && "Loading"}
          {status === "ready" && "Connected"}
          {status === "error" && "Offline"}
        </span>
      </div>

      {status === "error" ? (
        <p>{error}</p>
      ) : (
        <div className="status-grid">
          <div className="status-item">
            <span>Message</span>
            <strong>{data?.message ?? "Waiting for backend response..."}</strong>
          </div>
          <div className="status-item">
            <span>App Name</span>
            <strong>{data?.appName ?? "Loading..."}</strong>
          </div>
          <div className="status-item">
            <span>Version</span>
            <strong>{data?.version ?? "Loading..."}</strong>
          </div>
          <div className="status-item">
            <span>Timestamp</span>
            <strong>{data?.timestamp ?? "Loading..."}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
