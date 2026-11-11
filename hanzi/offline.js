const downloadButton=document.querySelector('#download-library');
const offlineStatus=document.querySelector('#offline-status');
const offlineProgress=document.querySelector('#offline-progress');
const libraryVersion=window.HANZI_LIBRARY_VERSION||'1';
const offlineCacheName=`hanzi-offline-${libraryVersion}`;
const bundleNames=[...new Set(Object.values(window.HANZI_INDEX||{}))];
const bundleUrl=(bundle)=>new URL(`data/chunks/${bundle}.js?v=${libraryVersion}`,document.baseURI).href;

async function cachedBundleCount(){
  const cache=await caches.open(offlineCacheName);
  const found=await Promise.all(bundleNames.map(bundle=>cache.match(bundleUrl(bundle))));
  return found.filter(Boolean).length;
}

async function refreshOfflineState(){
  if(location.protocol==='file:'){
    downloadButton.disabled=true;
    downloadButton.textContent='本地文件已完整';
    offlineStatus.textContent='当前本地文件夹已包含完整字库，无需再次下载。';
    return;
  }
  if(!('caches'in window))return;
  const count=await cachedBundleCount();
  const cacheNames=await caches.keys();
  const hasOlderVersion=cacheNames.some(name=>name.startsWith('hanzi-offline-')&&name!==offlineCacheName);
  if(count===bundleNames.length){
    downloadButton.disabled=true;
    downloadButton.textContent='已下载';
    offlineStatus.textContent='完整离线字库已下载，可在断网时使用。';
    return;
  }
  downloadButton.textContent=count?'继续下载':hasOlderVersion?'下载更新':'下载离线字库';
  offlineStatus.textContent=count?`已下载 ${count} / ${bundleNames.length} 个数据包。`:hasOlderVersion?'发现新版离线字库，可下载更新。':'需要时下载完整字库，之后断网也能使用所有汉字。';
}

downloadButton.addEventListener('click',async()=>{
  if(!('caches'in window))return;
  downloadButton.disabled=true;
  offlineProgress.hidden=false;
  const cache=await caches.open(offlineCacheName);
  let complete=await cachedBundleCount();
  try{
    for(const bundle of bundleNames){
      const url=bundleUrl(bundle);
      if(await cache.match(url))continue;
      const response=await fetch(url,{cache:'reload'});
      if(!response.ok)throw new Error('download-failed');
      await cache.put(url,response.clone());
      complete+=1;
      offlineProgress.value=complete/bundleNames.length*100;
      offlineStatus.textContent=`正在下载完整字库：${complete} / ${bundleNames.length} 个数据包`;
    }
    await navigator.storage?.persist?.();
    await Promise.all((await caches.keys()).filter(name=>name.startsWith('hanzi-offline-')&&name!==offlineCacheName).map(name=>caches.delete(name)));
    offlineStatus.textContent='完整离线字库已下载，可在断网时使用。';
    downloadButton.textContent='已下载';
  }catch(error){
    offlineStatus.textContent=`下载在 ${complete} / ${bundleNames.length} 个数据包后中断，可再次点击继续。`;
    downloadButton.disabled=false;
  }
});

refreshOfflineState();
