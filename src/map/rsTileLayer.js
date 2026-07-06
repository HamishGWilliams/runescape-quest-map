import L from "leaflet";

export const RsTileLayer = L.TileLayer.extend({
  initialize(url, options = {}) {
    L.TileLayer.prototype.initialize.call(this, url, options);
  },

  getTileUrl(coords) {
    return L.Util.template(this._url, {
      ...this.options,
      z: coords.z,
      x: coords.x,
      y: coords.y,
      rsY: -(coords.y + 1),
    });
  },

  setMapId(mapId) {
    this.options.mapId = mapId;
    this.redraw();
    return this;
  },

  setPlane(plane) {
    this.options.plane = plane;
    this.redraw();
    return this;
  },

  createTile(coords, done) {
    const tile = L.TileLayer.prototype.createTile.call(this, coords, done);
    tile.onerror = (event) => {
      event.preventDefault();
      tile.style.visibility = "hidden";
      done(null, tile);
    };
    return tile;
  },
});
