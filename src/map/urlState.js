export function getInitialState(defaults) {
  const url = new URL(window.location.href);
  const params = [url.searchParams, new URLSearchParams(url.hash.replace(/^#/, ""))];
  return {
    mapId: readNumber(params, ["m", "mapId", "mapid"], defaults.mapId),
    zoom: readNumber(params, ["z", "zoom"], defaults.zoom),
    plane: readNumber(params, ["p", "plane"], defaults.plane),
    x: readNumber(params, ["x"], defaults.x),
    y: readNumber(params, ["y"], defaults.y),
  };
}

export function writeStateToUrl(state) {
  const url = new URL(window.location.href);
  const useHashState = url.hostname === "htmlpreview.github.io";
  const params = useHashState ? new URLSearchParams(url.hash.replace(/^#/, "")) : url.searchParams;

  params.set("m", state.mapId);
  params.set("z", state.zoom);
  params.set("p", state.plane);
  params.set("x", state.x);
  params.set("y", state.y);

  if (useHashState) {
    url.hash = params.toString();
  }

  window.history.replaceState({}, "", url);
  return url;
}

function readNumber(params, keys, fallback) {
  const paramSets = Array.isArray(params) ? params : [params];
  for (const paramSet of paramSets) {
    for (const key of keys) {
      const value = paramSet.get(key);
      if (value !== null && value !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return fallback;
}
