// 「使い方」モーダルの開閉・タブ切り替え
const HelpModal = (() => {
  function open() {
    document.getElementById('help-modal').classList.remove('hidden');
    document.getElementById('help-modal').classList.add('flex');
  }

  function close() {
    document.getElementById('help-modal').classList.add('hidden');
    document.getElementById('help-modal').classList.remove('flex');
  }

  function switchTab(tab) {
    document.getElementById('help-tab-usage').classList.toggle('is-active', tab === 'usage');
    document.getElementById('help-tab-story').classList.toggle('is-active', tab === 'story');
    document.getElementById('help-panel-usage').classList.toggle('hidden', tab !== 'usage');
    document.getElementById('help-panel-story').classList.toggle('hidden', tab !== 'story');
  }

  function wire() {
    document.getElementById('btn-help').addEventListener('click', open);
    document.getElementById('btn-help-close').addEventListener('click', close);
    document.getElementById('help-modal').addEventListener('click', (e) => {
      if (e.target.id === 'help-modal') close();
    });
    document.getElementById('help-tab-usage').addEventListener('click', () => switchTab('usage'));
    document.getElementById('help-tab-story').addEventListener('click', () => switchTab('story'));
  }

  return { wire };
})();
