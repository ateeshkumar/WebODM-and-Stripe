const SUPPORTED_MAP_TYPES = ["orthophoto", "plant", "dsm", "dtm"] as const;

type SupportedMapType = (typeof SUPPORTED_MAP_TYPES)[number];

type RawTile = {
  type?: string;
  url?: string;
};

type RawTask = {
  id?: string;
  project?: number;
  public?: boolean;
  public_edit?: boolean;
  camera_shots?: string;
  ground_control_points?: string;
  epsg?: number;
  srs?: {
    name?: string;
    units?: string;
  } | null;
  orthophoto_bands?: Array<{
    name?: string;
    description?: string | null;
  }>;
  crop?: boolean;
  extent?: number[];
};

type RawMapItem = {
  tiles?: RawTile[];
  meta?: {
    task?: RawTask;
  };
};

export type WebOdmMapType = SupportedMapType;

export type WebOdmPublicTaskData = {
  sourceUrl: string;
  title: string;
  taskId: string | null;
  projectId: number | null;
  providerHost: string;
  availableMapTypes: WebOdmMapType[];
  defaultMapType: WebOdmMapType;
  public: boolean;
  publicEdit: boolean;
  shareButtons: boolean;
  epsg: number | null;
  srsName: string | null;
  units: string | null;
  extent: [number, number, number, number] | null;
  center: {
    lat: number;
    lng: number;
  } | null;
  coverageMeters: {
    width: number;
    height: number;
  } | null;
  bandLabels: string[];
  cameraShotsUrl: string | null;
  groundControlPointsUrl: string | null;
  thumbnailUrl: string | null;
  cropApplied: boolean;
};

export function normalizeWebOdmPublicTaskUrl(input: string) {
  const trimmedInput = input.trim();
  let url: URL;

  if (!trimmedInput) {
    throw new Error("Paste a public WebODM map URL to load the viewer.");
  }

  try {
    url = new URL(trimmedInput);
  } catch {
    throw new Error("Paste a full public WebODM URL that starts with https://");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname !== "webodm.net" &&
    !hostname.endsWith(".webodm.net")
  ) {
    throw new Error(
      "This feature currently supports public WebODM Lightning links on webodm.net.",
    );
  }

  const pathSegments = url.pathname.split("/").filter(Boolean);

  if (
    pathSegments.length < 3 ||
    pathSegments[0] !== "public" ||
    pathSegments[1] !== "task"
  ) {
    throw new Error(
      "Use a public WebODM task link in the form /public/task/<task-id>/map/.",
    );
  }

  url.pathname = `/public/task/${pathSegments[2]}/map/`;

  const requestedType = url.searchParams.get("t");
  if (!isSupportedMapType(requestedType)) {
    url.searchParams.set("t", "orthophoto");
  }

  url.hash = "";

  return url;
}

export async function fetchWebOdmPublicTaskData(input: string) {
  const normalizedUrl = normalizeWebOdmPublicTaskUrl(input);
  const response = await fetch(normalizedUrl, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; WebODM-Hub/0.1; +https://webodm.net)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `WebODM returned ${response.status} while loading the public task.`,
    );
  }

  const html = await response.text();
  const rawMapItems = readAttribute(html, "data-map-items");

  if (!rawMapItems) {
    throw new Error(
      "This page did not expose a public map payload that can be embedded.",
    );
  }

  const mapItems = JSON.parse(
    decodeHtmlEntities(rawMapItems),
  ) as RawMapItem[];
  const task = mapItems.find((item) => item.meta?.task)?.meta?.task;
  const availableMapTypes = SUPPORTED_MAP_TYPES.filter((mapType) =>
    mapItems.some((item) =>
      (item.tiles ?? []).some((tile) => tile.type === mapType),
    ),
  );
  const requestedType = normalizedUrl.searchParams.get("t");
  const defaultMapType =
    availableMapTypes.find((mapType) => mapType === requestedType) ??
    availableMapTypes[0] ??
    "orthophoto";
  const shareButtons = readAttribute(html, "data-share-buttons") === "true";
  const extent = parseExtent(task?.extent);
  const title =
    decodeHtmlEntities(readAttribute(html, "data-title") ?? "") ||
    decodeHtmlEntities(readMetaProperty(html, "og:title") ?? "") ||
    "WebODM public task";

  return {
    sourceUrl: normalizedUrl.toString(),
    title,
    taskId: task?.id ?? null,
    projectId: typeof task?.project === "number" ? task.project : null,
    providerHost: normalizedUrl.hostname,
    availableMapTypes,
    defaultMapType,
    public: task?.public ?? true,
    publicEdit: task?.public_edit ?? false,
    shareButtons,
    epsg: typeof task?.epsg === "number" ? task.epsg : null,
    srsName: task?.srs?.name ?? null,
    units: task?.srs?.units ?? null,
    extent,
    center: extent
      ? {
          lng: roundCoordinate((extent[0] + extent[2]) / 2),
          lat: roundCoordinate((extent[1] + extent[3]) / 2),
        }
      : null,
    coverageMeters: extent ? measureExtent(extent) : null,
    bandLabels: (task?.orthophoto_bands ?? [])
      .map((band) => band.description ?? band.name ?? "")
      .map((band) => band.trim())
      .filter(Boolean),
    cameraShotsUrl: makeAbsoluteUrl(task?.camera_shots, normalizedUrl),
    groundControlPointsUrl: makeAbsoluteUrl(
      task?.ground_control_points,
      normalizedUrl,
    ),
    thumbnailUrl: makeAbsoluteUrl(
      readMetaProperty(html, "og:image"),
      normalizedUrl,
    ),
    cropApplied: task?.crop ?? false,
  } satisfies WebOdmPublicTaskData;
}

function isSupportedMapType(value: string | null): value is SupportedMapType {
  return value !== null && SUPPORTED_MAP_TYPES.includes(value as SupportedMapType);
}

function readAttribute(html: string, name: string) {
  const escapedName = escapeForRegex(name);
  const match = html.match(new RegExp(`${escapedName}="([^"]*)"`, "i"));
  return match?.[1] ?? null;
}

function readMetaProperty(html: string, property: string) {
  const escapedProperty = escapeForRegex(property);
  const metaPattern = new RegExp(
    `<meta\\s+property="${escapedProperty}"\\s+content="([^"]*)"`,
    "i",
  );

  return html.match(metaPattern)?.[1] ?? null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeAbsoluteUrl(value: string | undefined | null, baseUrl: URL) {
  if (!value) {
    return null;
  }

  return new URL(value, baseUrl.origin).toString();
}

function parseExtent(value: number[] | undefined) {
  if (!value || value.length !== 4) {
    return null;
  }

  const [west, south, east, north] = value;

  if ([west, south, east, north].some((coordinate) => !Number.isFinite(coordinate))) {
    return null;
  }

  return [west, south, east, north] as [number, number, number, number];
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function measureExtent([west, south, east, north]: [
  number,
  number,
  number,
  number,
]) {
  return {
    width: haversineDistance(south, west, south, east),
    height: haversineDistance(south, west, north, west),
  };
}

function haversineDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(endLat - startLat);
  const longitudeDelta = toRadians(endLng - startLng);
  const latitudeOne = toRadians(startLat);
  const latitudeTwo = toRadians(endLat);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) *
      Math.cos(latitudeTwo) *
      Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
