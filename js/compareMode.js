// 並べて配置型：2〜5個の市区町村の形を、実面積比を保ったまま自由にドラッグ配置して見比べる
const CompareMode = (() => {
  let map = null;
  let shapes = [];
  let active = false;
  let draggingShape = null;
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
  const MAX_SHAPES = 5;

  function init(leafletMap) {
    map = leafletMap;
    map.on('mousemove', onMapMouseMove);
    map.on('mouseup', onMapMouseUp);
  }

  function activate() {
    active = true;
    document.getElementById('compare-list').classList.remove('hidden');
  }

  function deactivate() {
    active = false;
    document.getElementById('compare-list').classList.add('hidden');
    clearAll();
  }

  function clearAll() {
    shapes.forEach(s => {
      if (s.layer) map.removeLayer(s.layer);
      if (s.labelMarker) map.removeLayer(s.labelMarker);
    });
    shapes = [];
    updateList();
  }

  function isFull() {
    return shapes.length >= MAX_SHAPES;
  }

  function nextColor() {
    const used = new Set(shapes.map(s => s.color));
    return COLORS.find(c => !used.has(c)) || COLORS[shapes.length % COLORS.length];
  }

  function initialAnchor(index) {
    const center = map.getCenter();
    const bounds = map.getBounds();
    const spanKm = turf.distance(
      turf.point([bounds.getWest(), center.lat]),
      turf.point([bounds.getEast(), center.lat]),
      { units: 'kilometers' }
    );
    const radius = Math.max(spanKm * 0.18, 3);
    const angle = (index * (360 / MAX_SHAPES)) % 360;
    const dest = turf.destination(turf.point([center.lng, center.lat]), radius, angle, { units: 'kilometers' });
    const [lng, lat] = dest.geometry.coordinates;
    return { lat, lng };
  }

  function addFeature(feature, displayName, code) {
    if (isFull()) return false;
    if (shapes.some(s => s.code === code)) return false;

    const centroid = GeoUtil.bboxCenter(feature);
    const anchor = initialAnchor(shapes.length);
    const shape = {
      code, displayName, feature, centroid, anchor,
      color: nextColor(),
      layer: null,
      labelMarker: null
    };
    shapes.push(shape);
    render(shape);
    updateList();
    return true;
  }

  function removeShape(code) {
    const idx = shapes.findIndex(s => s.code === code);
    if (idx === -1) return;
    const [s] = shapes.splice(idx, 1);
    if (s.layer) map.removeLayer(s.layer);
    if (s.labelMarker) map.removeLayer(s.labelMarker);
    updateList();
  }

  function render(shape) {
    const moved = GeoUtil.translateFeature(shape.feature, shape.centroid, shape.anchor);
    const factor = GeoUtil.mercatorScaleFactor(shape.centroid.lat, shape.anchor.lat);
    const scaled = GeoUtil.scaleFeature(moved, factor, shape.anchor);

    if (!shape.layer) {
      // FeatureGroup（L.geoJSON）は子レイヤーのmousedown等を既定では自身に伝播しないため、
      // onEachFeatureで個々のレイヤーに直接バインドする（addDataで再描画されるレイヤーにも毎回適用される）
      shape.layer = L.geoJSON(scaled, {
        style: { color: shape.color, weight: 2, fillColor: shape.color, fillOpacity: 0.4 },
        onEachFeature: (f, layer) => {
          layer.on('mousedown', (e) => {
            draggingShape = shape;
            map.dragging.disable();
            map.getContainer().style.cursor = 'grabbing';
            L.DomEvent.stop(e);
          });
        }
      }).addTo(map);
    } else {
      shape.layer.clearLayers();
      shape.layer.addData(scaled);
    }

    if (!shape.labelMarker) {
      shape.labelMarker = L.marker([shape.anchor.lat, shape.anchor.lng], {
        icon: L.divIcon({
          className: '',
          html: `<span class="compare-shape-label">${shape.displayName}</span>`,
          iconSize: [0, 0]
        }),
        interactive: false
      }).addTo(map);
    } else {
      shape.labelMarker.setLatLng([shape.anchor.lat, shape.anchor.lng]);
    }
  }

  function onMapMouseMove(e) {
    if (!draggingShape) return;
    draggingShape.anchor = { lat: e.latlng.lat, lng: e.latlng.lng };
    render(draggingShape);
  }

  function onMapMouseUp() {
    if (!draggingShape) return;
    draggingShape = null;
    map.dragging.enable();
    map.getContainer().style.cursor = '';
  }

  function updateList() {
    const container = document.getElementById('compare-list');
    container.innerHTML = '';
    shapes.forEach(s => {
      const area = GeoUtil.areaKm2(s.feature);
      const row = document.createElement('div');
      row.className = 'compare-item';
      row.innerHTML = `
        <span class="swatch" style="background:${s.color}"></span>
        <span class="name">${s.displayName}</span>
        <span class="area">${area.toFixed(1)} km²</span>
        <i data-lucide="x" class="w-3.5 h-3.5 btn-remove" data-code="${s.code}"></i>
      `;
      container.appendChild(row);
    });
    if (window.lucide) lucide.createIcons();
    container.querySelectorAll('.btn-remove').forEach(el => {
      el.addEventListener('click', () => removeShape(el.dataset.code));
    });
  }

  return {
    init, activate, deactivate, addFeature, removeShape,
    isActive: () => active,
    isFull,
    count: () => shapes.length
  };
})();
