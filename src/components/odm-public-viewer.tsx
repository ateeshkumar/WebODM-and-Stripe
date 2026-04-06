"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import type { WebOdmMapType, WebOdmPublicTaskData } from "@/lib/webodm";

type OdmPublicViewerProps = {
  initialError: string;
  initialTask: WebOdmPublicTaskData | null;
  initialUrl: string;
};

const mapTypeLabels: Record<WebOdmMapType, string> = {
  orthophoto: "Orthophoto",
  plant: "Plant health",
  dsm: "Surface model",
  dtm: "Terrain model",
};

export function OdmPublicViewer({
  initialError,
  initialTask,
  initialUrl,
}: OdmPublicViewerProps) {
  const [inputValue, setInputValue] = useState(
    initialTask?.sourceUrl ?? initialUrl,
  );
  const [task, setTask] = useState<WebOdmPublicTaskData | null>(initialTask);
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedMapType, setSelectedMapType] = useState<WebOdmMapType>(
    initialTask?.defaultMapType ?? "orthophoto",
  );

  const availableMapTypes: WebOdmMapType[] = task?.availableMapTypes.length
    ? task.availableMapTypes
    : ["orthophoto"];
  const activeMapType = availableMapTypes.includes(selectedMapType)
    ? selectedMapType
    : (task?.defaultMapType ?? "orthophoto");
  const viewerUrl = task ? buildViewerUrl(task.sourceUrl, activeMapType) : null;
  const isBusy = isLoading || isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/webodm/public-task?url=${encodeURIComponent(inputValue)}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as
        | WebOdmPublicTaskData
        | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "The WebODM task could not be loaded.",
        );
      }

      const nextTask = payload as WebOdmPublicTaskData;

      startTransition(() => {
        setTask(nextTask);
        setInputValue(nextTask.sourceUrl);
        setSelectedMapType(
          nextTask.availableMapTypes.includes(activeMapType)
            ? activeMapType
            : nextTask.defaultMapType,
        );
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The WebODM task could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="viewer-app viewer-app-clean">
      <header className="panel viewer-topbar">
        <div className="viewer-brand">
          <div className="brand-mark">ODM</div>
          <div className="viewer-heading">
            <p className="eyebrow">Public Map Viewer</p>
            <h1>ODM Viewer</h1>
            <p className="viewer-heading-copy">
              {task?.title ?? "Load a public WebODM task URL."}
            </p>
          </div>
        </div>

        <div className="viewer-header-actions">
          <a
            className="secondary-button"
            href={viewerUrl ?? initialUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open source
          </a>

          <Link className="secondary-button" href="/stripe-payment">
            Payment
          </Link>
        </div>
      </header>

      <section className="panel viewer-controls-clean">
        <form className="url-form viewer-search-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="odm-public-url">
            Public task URL
          </label>
          <input
            className="url-input"
            id="odm-public-url"
            name="odm-public-url"
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Paste a public WebODM map URL"
            type="url"
            value={inputValue}
          />

          <button className="primary-button" disabled={isBusy} type="submit">
            {isBusy ? "Loading..." : "Load"}
          </button>
        </form>

        <div className="viewer-meta-row" aria-label="Task summary">
          <span className="meta-pill">
            {task?.epsg ? `EPSG:${task.epsg}` : "Public task"}
          </span>
          {task?.coverageMeters ? (
            <span className="meta-pill">
              {formatDistance(task.coverageMeters.width)} x{" "}
              {formatDistance(task.coverageMeters.height)}
            </span>
          ) : null}
          {task?.providerHost ? (
            <span className="meta-pill">{task.providerHost}</span>
          ) : null}
        </div>

        {availableMapTypes.length > 1 ? (
          <div className="viewer-tabs" aria-label="Available map layers">
            {availableMapTypes.map((mapType) => (
              <button
                className={`viewer-tab ${
                  mapType === activeMapType ? "active" : ""
                }`}
                key={mapType}
                onClick={() => setSelectedMapType(mapType)}
                type="button"
              >
                {mapTypeLabels[mapType]}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="status-card error-card" role="alert">
            <strong>Task load issue</strong>
            <p>{error}</p>
          </div>
        ) : null}
      </section>

      <section className="panel viewer-panel viewer-panel-clean">
        <div className="viewer-stage">
          {viewerUrl ? (
            <>
              <iframe
                allowFullScreen
                key={viewerUrl}
                loading="eager"
                src={viewerUrl}
                title={`${task?.title ?? "WebODM task"} ${mapTypeLabels[activeMapType]} viewer`}
              />

              {isBusy ? (
                <div className="loading-badge">Refreshing map...</div>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <strong>Load a public task to start the viewer.</strong>
              <p>The map will appear here.</p>
            </div>
          )}
        </div>

        <div className="viewer-footer viewer-footer-clean">
          <span>
            Layer: <strong>{mapTypeLabels[activeMapType]}</strong>
          </span>
          {task?.center ? (
            <span>
              Center:{" "}
              <strong>
                {formatCoordinate(task.center.lat)},{" "}
                {formatCoordinate(task.center.lng)}
              </strong>
            </span>
          ) : null}
          <span>
            Access:{" "}
            <strong>
              {task?.publicEdit ? "Public edit enabled" : "Public view only"}
            </strong>
          </span>
        </div>
      </section>
    </div>
  );
}

function buildViewerUrl(sourceUrl: string, mapType: WebOdmMapType) {
  const viewerUrl = new URL(sourceUrl);
  viewerUrl.searchParams.set("t", mapType);
  return viewerUrl.toString();
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10_000 ? 0 : 1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}
