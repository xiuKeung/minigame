const dictionaryCard=document.querySelector('#dictionary-card');
const dictionaryCharacter=document.querySelector('#dictionary-character');
const dictionaryLoading=document.querySelector('#dictionary-loading');
const dictionaryContent=document.querySelector('#dictionary-content');
const dictionaryPinyin=document.querySelector('#dictionary-pinyin');
const dictionaryMeta=document.querySelector('#dictionary-meta');
const dictionaryMeaning=document.querySelector('#dictionary-meaning');
const dictionaryWords=document.querySelector('#dictionary-word-list');
const dictionaryPromises=new Map();
const dictionaryDataVersion='2';

window.getHanziDictionary=(character)=>window.HANZI_DICTIONARY_DATA?.[character];
window.loadHanziDictionary=(character,retry=0)=>{
  const existing=window.getHanziDictionary(character);
  if(existing)return Promise.resolve(existing);
  const bundle=window.HANZI_INDEX?.[character];
  if(!bundle)return Promise.reject(new Error('missing-dictionary-entry'));
  if(!retry&&dictionaryPromises.has(bundle))return dictionaryPromises.get(bundle).then(()=>window.getHanziDictionary(character));
  const promise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.async=true;
    script.src=`data/dictionary-chunks/${bundle}.js?v=${dictionaryDataVersion}${retry?`&retry=${Date.now()}`:''}`;
    script.onload=()=>{script.remove();resolve();};
    script.onerror=()=>{script.remove();reject(new Error('dictionary-load-failed'));};
    document.head.append(script);
  });
  dictionaryPromises.set(bundle,promise);
  return promise.then(()=>window.getHanziDictionary(character)).catch(error=>{
    dictionaryPromises.delete(bundle);
    if(retry<1)return window.loadHanziDictionary(character,retry+1);
    throw error;
  });
};

function clearDictionary(){
  dictionaryCharacter.textContent='—';
  dictionaryContent.hidden=true;
  dictionaryLoading.hidden=false;
  dictionaryLoading.textContent='输入汉字后查看释义与组词。';
}

function showDictionary(character,data){
  dictionaryCharacter.textContent=character;
  dictionaryLoading.hidden=true;
  dictionaryContent.hidden=false;
  dictionaryPinyin.textContent=data.p||'暂未收录拼音';
  dictionaryMeta.textContent=`部首：${data.r||'暂未收录'}　总笔画：${data.s||'暂未收录'}`;
  dictionaryMeaning.textContent=data.m||'暂未收录释义。';
  dictionaryWords.replaceChildren();
  if(data.g?.length){
    data.g.forEach(word=>{const item=document.createElement('span');item.textContent=word;dictionaryWords.append(item);});
  }else{
    const empty=document.createElement('span');empty.textContent='暂未收录常用组词';dictionaryWords.append(empty);
  }
}

window.renderCharacterInfo=(character,token,getToken)=>{
  if(!character){clearDictionary();return;}
  dictionaryCharacter.textContent=character;
  dictionaryContent.hidden=true;
  dictionaryLoading.hidden=false;
  dictionaryLoading.textContent='正在准备汉字释义…';
  window.loadHanziDictionary(character).then(data=>{if(token===getToken())showDictionary(character,data||{});}).catch(()=>{if(token===getToken())dictionaryLoading.textContent='释义数据加载失败，请重新点“演示”重试。';});
};
