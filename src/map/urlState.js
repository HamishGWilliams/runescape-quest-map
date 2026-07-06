export function getInitialState(defaults) {
  const params = new URLSearchParams(window.location.search);
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
  url.searchParams.set("m", state.mapId);
  url.searchParams.set("z", state.zoom);
  url.searchParams.set("p", state.plane);
  url.searchParams.set("x", state.x);
  url.searchParams.set("y", state.y);
  window.history.replaceState({}, "", url);
  return url;
}

function readNumber(params, keys, fallback) {
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}
