const downloadButton=document.querySelector('#download-library');
const offlineStatus=document.querySelector('#offline-status');
const offlineProgress=document.querySelector('#offline-progress');
const bundleNames=[...new Set(Object.values(window.HANZI_INDEX||{}))];
if(location.protocol==='file:'){downloadButton.disabled=true;downloadButton.textContent='本地文件已完整';offlineStatus.textContent='当前本地文件夹已包含完整字库，无需再次下载。';}
downloadButton.addEventListener('click',async()=>{if(!('caches'in window))return;downloadButton.disabled=true;offlineProgress.hidden=false;const cache=await caches.open('hanzi-offline-v1');let complete=0;try{for(const bundle of bundleNames){const url=new URL(`data/chunks/${bundle}.js`,document.baseURI).href;const response=await fetch(url,{cache:'reload'});if(!response.ok)throw new Error('download-failed');await cache.put(url,response.clone());complete+=1;offlineProgress.value=complete/bundleNames.length*100;offlineStatus.textContent=`正在下载完整字库：${complete} / ${bundleNames.length} 个数据包`;}
await navigator.storage?.persist?.();offlineStatus.textContent='完整离线字库已下载，可在断网时使用。';downloadButton.textContent='已下载';}catch(error){offlineStatus.textContent=`下载在 ${complete} / ${bundleNames.length} 个数据包后中断，可再次点击继续。`;downloadButton.disabled=false;}});
