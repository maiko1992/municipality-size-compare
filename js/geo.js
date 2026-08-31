// Turf.jsを使った球面上の平行移動・メルカトル見た目補正・面積計算のラッパー
const GeoUtil = (() => {
  function toPoint(latLng) {
    return turf.point([latLng.lng, latLng.lat]);
  }

  // フィーチャのバウンディングボックス中心（緯度経度）
  function bboxCenter(feature) {
    const bbox = turf.bbox(feature);
    return { lat: (bbox[1] + bbox[3]) / 2, lng: (bbox[0] + bbox[2]) / 2 };
  }

  // fromLatLng -> toLatLng の方位角・距離だけ図形全体を剛体移動する
  function translateFeature(feature, fromLatLng, toLatLng) {
    const from = toPoint(fromLatLng);
    const to = toPoint(toLatLng);
    const dist = turf.distance(from, to, { units: 'kilometers' });
    if (dist < 1e-6) return feature;
    const bearing = turf.bearing(from, to);
    return turf.transformTranslate(feature, dist, bearing, { units: 'kilometers' });
  }

  // 図形は元の重心緯度(fromLat)での経緯度サイズをそのまま保持しているため、
  // 見た目面積は Δlon×Δlat×cos(fromLat)×sec(toLat) になり、置く場所(toLat)に応じて変わってしまう。
  // 見た目面積が置き場所に依存せず実面積(∝cos(fromLat))に一致するためには
  // factor^2 × sec(toLat) = cos(fromLat) を満たす必要があり、
  // factor = sqrt(cos(fromLat) × cos(toLat)) とすると toLat 依存が完全に相殺される。
  function mercatorScaleFactor(fromLat, toLat) {
    const clampedTo = Math.max(-85, Math.min(85, toLat));
    const clampedFrom = Math.max(-85, Math.min(85, fromLat));
    return Math.sqrt(Math.cos(clampedFrom * Math.PI / 180) * Math.cos(clampedTo * Math.PI / 180));
  }

  // originLatLngを基準点として図形を拡縮する
  function scaleFeature(feature, factor, originLatLng) {
    if (Math.abs(factor - 1) < 1e-9) return feature;
    return turf.transformScale(feature, factor, { origin: [originLatLng.lng, originLatLng.lat] });
  }

  function areaKm2(feature) {
    return turf.area(feature) / 1e6;
  }

  return { toPoint, bboxCenter, translateFeature, mercatorScaleFactor, scaleFeature, areaKm2 };
})();
