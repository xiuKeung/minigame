let installPrompt;
const installButton=document.querySelector('#install-app');
window.addEventListener('beforeinstallprompt',(event)=>{event.preventDefault();installPrompt=event;});
installButton.addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}alert('请在浏览器菜单中选择“添加到主屏幕”。\n\niPhone/iPad：点分享按钮，再选择“添加到主屏幕”。');});
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js');
