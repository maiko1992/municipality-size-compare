// 左上パネル・ステータスパネルの折りたたみ開閉（状態はlocalStorageに保存し次回訪問時も維持）
// アイコン要素はクリックのたびに取得し直す（lucide.createIcons()がページ内の
// アイコンを全て再生成するタイミングがあり、参照をキャッシュすると古い要素を指してしまうため）
const PanelToggle = (() => {
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function wireToggle(btnId, bodyId, storageKey) {
    const btn = document.getElementById(btnId);
    const body = document.getElementById(bodyId);

    function apply(collapsed) {
      body.classList.toggle('hidden', collapsed);
      const icon = btn.querySelector('svg, i');
      if (icon) icon.classList.toggle('rotate-180', collapsed);
    }

    apply(safeGet(storageKey) === '1');

    btn.addEventListener('click', () => {
      const collapsed = !body.classList.contains('hidden');
      apply(collapsed);
      safeSet(storageKey, collapsed ? '1' : '0');
    });
  }

  function wire() {
    wireToggle('btn-panel-collapse', 'search-panel-body', 'panelCollapsed:search');
    wireToggle('btn-status-collapse', 'overlay-status-body', 'panelCollapsed:status');
  }

  return { wire };
})();
