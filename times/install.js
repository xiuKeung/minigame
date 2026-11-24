let installPrompt;

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function syncInstallButton() {
  const button = document.querySelector('#install-app');
  if (!button) return;
  button.hidden = isStandalone() || (!installPrompt && !isIos());
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  syncInstallButton();
});

window.addEventListener('times-render', syncInstallButton);

document.addEventListener('click', async event => {
  if (!event.target.closest('#install-app')) return;
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    syncInstallButton();
    return;
  }
  alert(isIos() ? '请在 Safari 中点“分享”，再选择“添加到主屏幕”。' : '请使用浏览器菜单中的“安装应用”或“添加到主屏幕”。');
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
