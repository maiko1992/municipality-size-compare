// 起動処理・モード切替・検索UIの配線
let currentMode = null;
let pendingSelection = null;

function showToast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-message').textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

function showLoading(v) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !v);
}

function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;

  document.getElementById('tab-overlay').classList.toggle('is-active', mode === 'overlay');
  document.getElementById('tab-compare').classList.toggle('is-active', mode === 'compare');
  document.getElementById('mode-desc').textContent = mode === 'overlay'
    ? '地図をドラッグすると、選んだ市区町村の形がついてきます。実際の場所での見た目の大きさを体感できます。'
    : '市区町村を選ぶとすぐに地図に追加されます（最大5個）。実際の面積比のまま自由に動かして見比べられます。';

  pendingSelection = null;
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').classList.add('hidden');

  if (mode === 'overlay') {
    CompareMode.deactivate();
    OverlayMode.activate();
  } else {
    OverlayMode.deactivate();
    CompareMode.activate();
  }
}

async function selectForOverlay(item) {
  showLoading(true);
  try {
    const feature = await DataStore.getFeature(item.code, item.prefCode);
    OverlayMode.selectFeature(feature);
  } catch (e) {
    showToast(e.message);
  }
  showLoading(false);
}

async function selectForCompare(item) {
  if (CompareMode.isFull()) {
    showToast('比較できるのは最大5個までです');
    return;
  }
  showLoading(true);
  try {
    const feature = await DataStore.getFeature(item.code, item.prefCode);
    const added = CompareMode.addFeature(feature, item.displayName, item.code);
    if (!added) showToast('すでに追加されているか、上限に達しています');
  } catch (e) {
    showToast(e.message);
  }
  showLoading(false);
}

function setPendingSelection(item) {
  pendingSelection = item;
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').classList.add('hidden');

  if (currentMode === 'overlay') {
    selectForOverlay(item);
  } else {
    selectForCompare(item);
  }
}

function buildPrefSelect() {
  const sel = document.getElementById('pref-select');
  DataStore.getPrefList().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.code;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function wirePrefCitySelect() {
  document.getElementById('pref-select').addEventListener('change', (e) => {
    const prefCode = e.target.value;
    const citySel = document.getElementById('city-select');
    citySel.innerHTML = '<option value="">市区町村...</option>';
    if (!prefCode) {
      citySel.disabled = true;
      return;
    }
    citySel.disabled = false;
    DataStore.getCitiesByPref(prefCode).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.displayName;
      citySel.appendChild(opt);
    });
  });

  document.getElementById('city-select').addEventListener('change', (e) => {
    const code = e.target.value;
    if (!code) return;
    const item = DataStore.findByCode(code);
    if (item) setPendingSelection(item);
    e.target.value = '';
  });
}

function wireSearchUI() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  // 親パネルがoverflow-y-autoでクリップされるため、fixed配置にして画面基準の座標を都度計算する
  function positionSearchResults() {
    const rect = searchInput.getBoundingClientRect();
    searchResults.style.left = rect.left + 'px';
    searchResults.style.top = (rect.bottom + 4) + 'px';
    searchResults.style.width = rect.width + 'px';
  }

  searchInput.addEventListener('input', () => {
    const kw = searchInput.value.trim();
    if (!kw) {
      searchResults.classList.add('hidden');
      return;
    }
    const results = DataStore.search(kw);
    positionSearchResults();
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item text-gray-400">見つかりませんでした</div>';
      searchResults.classList.remove('hidden');
      return;
    }
    searchResults.innerHTML = results.map(item =>
      `<div class="search-result-item" data-code="${item.code}">${item.displayName}<span class="pref-name">${item.prefName}</span></div>`
    ).join('');
    searchResults.classList.remove('hidden');
    searchResults.querySelectorAll('.search-result-item[data-code]').forEach(el => {
      el.addEventListener('click', () => {
        const item = DataStore.findByCode(el.dataset.code);
        if (item) setPendingSelection(item);
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-input') && !e.target.closest('#search-results')) {
      searchResults.classList.add('hidden');
    }
  });
}

window.onload = async function () {
  lucide.createIcons();

  const map = L.map('map', { center: [35.681, 139.767], zoom: 6, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  OverlayMode.init(map);
  CompareMode.init(map);

  map.on('move', OverlayMode.onMapMove);

  document.getElementById('btn-home').addEventListener('click', () => OverlayMode.goHome());
  document.getElementById('tab-overlay').addEventListener('click', () => switchMode('overlay'));
  document.getElementById('tab-compare').addEventListener('click', () => switchMode('compare'));

  HelpModal.wire();

  switchMode('overlay');

  showLoading(true);
  try {
    await DataStore.loadIndex();
    buildPrefSelect();
  } catch (e) {
    showToast('データの読み込みに失敗しました: ' + e.message);
  }
  showLoading(false);

  wireSearchUI();
  wirePrefCitySelect();
};
