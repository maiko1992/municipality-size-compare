// 重ね合わせ型：選んだ市区町村の形を地図中心に追従させ、緯度による見た目歪みをそのまま体感させる
const OverlayMode = (() => {
  let map = null;
  let currentFeature = null;
  let originCenter = null;
  let polygonLayer = null;
  let moveRaf = null;
  let active = false;

  function init(leafletMap) {
    map = leafletMap;
  }

  function activate() {
    active = true;
    const reticle = document.getElementById('reticle');
    reticle.classList.remove('hidden');
    reticle.classList.add('flex');
    document.getElementById('overlay-status').classList.remove('hidden');
    document.getElementById('overlay-controls').classList.remove('hidden');
  }

  function deactivate() {
    active = false;
    const reticle = document.getElementById('reticle');
    reticle.classList.add('hidden');
    reticle.classList.remove('flex');
    document.getElementById('overlay-status').classList.add('hidden');
    document.getElementById('overlay-controls').classList.add('hidden');
    clearShape();
  }

  function clearShape() {
    if (polygonLayer) {
      map.removeLayer(polygonLayer);
      polygonLayer = null;
    }
    currentFeature = null;
    originCenter = null;
    document.getElementById('overlay-name').textContent = '';
    document.getElementById('overlay-population-row').classList.add('hidden');
  }

  function selectFeature(feature, displayName, population) {
    clearShape();
    currentFeature = feature;
    originCenter = GeoUtil.bboxCenter(feature);
    // 地図は動かさず、今表示している場所・縮尺のままその場に図形を置く
    // （実際の位置originCenterはスケール計算と「元の位置」ボタンのために保持する）
    render();

    document.getElementById('overlay-name').textContent = displayName || '';
    const popRow = document.getElementById('overlay-population-row');
    if (population != null) {
      document.getElementById('overlay-population').textContent = population.toLocaleString('ja-JP');
      popRow.classList.remove('hidden');
    } else {
      popRow.classList.add('hidden');
    }
  }

  function render() {
    if (!active || !currentFeature) return;
    const c = map.getCenter();
    const moved = GeoUtil.translateFeature(currentFeature, originCenter, { lat: c.lat, lng: c.lng });
    if (!polygonLayer) {
      polygonLayer = L.geoJSON(moved, {
        style: { color: '#ef4444', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.45 },
        interactive: false
      }).addTo(map);
    } else {
      polygonLayer.clearLayers();
      polygonLayer.addData(moved);
    }
    updateStatus(c);
  }

  function updateStatus(c) {
    let lng = ((c.lng + 540) % 360) - 180;
    const latText = c.lat >= 0 ? 'N' : 'S';
    const lngText = lng >= 0 ? 'E' : 'W';
    document.getElementById('coords-display').innerHTML =
      `${latText} ${Math.abs(c.lat).toFixed(3)}°<br/>${lngText} ${Math.abs(lng).toFixed(3)}°`;

    const clampedLat = Math.max(-85, Math.min(85, c.lat));
    const ratio = Math.cos(originCenter.lat * Math.PI / 180) / Math.cos(clampedLat * Math.PI / 180);
    const scale = Math.pow(ratio, 2) * 100;
    document.getElementById('scale-display').innerText = scale.toFixed(1);
  }

  function goHome() {
    if (!originCenter) return;
    map.flyTo([originCenter.lat, originCenter.lng], 7, { duration: 1.2 });
  }

  function onMapMove() {
    if (!active) return;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(() => {
      render();
      moveRaf = null;
    });
  }

  return { init, activate, deactivate, selectFeature, onMapMove, goHome, isActive: () => active };
})();
