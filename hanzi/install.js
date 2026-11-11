const installButton=document.querySelector('#install-app');
const isStandalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone;
const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);
let installPrompt;
if(!isStandalone){
  window.addEventListener('beforeinstallprompt',(event)=>{event.preventDefault();installPrompt=event;installButton.hidden=false;});
  if(isIos)installButton.hidden=false;
  installButton.addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installButton.hidden=true;return;}alert(isIos?'请在 Safari 中点“分享”，再选择“添加到主屏幕”。':'请使用浏览器菜单中的“安装应用”或“添加到主屏幕”。');});
}
if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
