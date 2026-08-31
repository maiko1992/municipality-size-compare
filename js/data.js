// 市区町村インデックスの読み込みと、都道府県別GeoJSONの遅延fetch＋キャッシュを担当する
const DataStore = (() => {
  let index = [];
  const prefFileCache = {};
  const featureCache = {};

  async function loadIndex() {
    const res = await fetch('data/muni-index.json');
    if (!res.ok) throw new Error('市区町村インデックスの読み込みに失敗しました');
    index = await res.json();
    return index;
  }

  function getIndex() {
    return index;
  }

  function getPrefList() {
    const seen = new Map();
    index.forEach(item => {
      if (!seen.has(item.prefCode)) seen.set(item.prefCode, item.prefName);
    });
    return [...seen.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  function getCitiesByPref(prefCode) {
    return index
      .filter(item => item.prefCode === prefCode)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'));
  }

  function findByCode(code) {
    return index.find(item => item.code === code);
  }

  function search(keyword) {
    const kw = keyword.trim();
    if (!kw) return [];
    return index
      .filter(item => item.displayName.includes(kw) || item.prefName.includes(kw))
      .slice(0, 30);
  }

  async function loadPrefFile(prefCode) {
    if (prefFileCache[prefCode]) return prefFileCache[prefCode];
    const res = await fetch(`data/municipality/s0010/N03-21_${prefCode}_210101.json`);
    if (!res.ok) throw new Error(`都道府県データの読み込みに失敗しました (${prefCode})`);
    const geojson = await res.json();
    prefFileCache[prefCode] = geojson;
    return geojson;
  }

  async function getFeature(code, prefCode) {
    if (featureCache[code]) return featureCache[code];
    const geojson = await loadPrefFile(prefCode);
    const feature = geojson.features.find(f => f.properties.N03_007 === code);
    if (!feature) throw new Error(`市区町村データが見つかりません (${code})`);
    featureCache[code] = feature;
    return feature;
  }

  return { loadIndex, getIndex, getPrefList, getCitiesByPref, findByCode, search, getFeature };
})();
