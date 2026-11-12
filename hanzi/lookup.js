const lookupToggle=document.querySelector('#lookup-toggle');
const lookupModal=document.querySelector('#lookup-modal');
const lookupSheet=document.querySelector('#lookup-sheet');
const lookupClose=document.querySelector('#lookup-close');
const lookupBackdrop=document.querySelector('#lookup-backdrop');
const lookupSelection=document.querySelector('#lookup-selection');
const lookupResultView=document.querySelector('#lookup-result-view');
const lookupResultBack=document.querySelector('#lookup-result-back');
const lookupResultTitle=document.querySelector('#lookup-result-title');
const lookupResultFilters=document.querySelector('#lookup-result-filters');
const lookupPinyin=document.querySelector('#lookup-pinyin');
const lookupRadicals=document.querySelector('#lookup-radicals');
const lookupStrokes=document.querySelector('#lookup-strokes');
const lookupPinyinInput=document.querySelector('#lookup-pinyin-input');
const lookupPinyinSubmit=document.querySelector('#lookup-pinyin-submit');
const lookupRadicalsList=document.querySelector('#lookup-radicals-list');
const lookupStrokesList=document.querySelector('#lookup-strokes-list');
const lookupStatus=document.querySelector('#lookup-status');
const lookupResults=document.querySelector('#lookup-results');
const pinyinIndex=window.HANZI_LOOKUP_INDEX?.p||{};
const radicalIndex=window.HANZI_LOOKUP_INDEX?.r||{};
const strokeIndex=window.HANZI_LOOKUP_INDEX?.s||{};
const radicalStrokes=window.HANZI_LOOKUP_INDEX?.rs||{};
const characterStrokes=window.HANZI_LOOKUP_INDEX?.c||{};
const characterInitials=window.HANZI_LOOKUP_INDEX?.ci||{};
const initialOrder=['B','P','M','F','D','T','N','L','G','K','H','J','Q','X','ZH','CH','SH','R','Z','C','S','Y','W','零声母'];
const formatInitial=initial=>initial==='零声母'?'无声母':initial==='未注音'?'未注音':/^[A-Z]+$/.test(initial)?initial.toLowerCase():initial;
let selectionScrollTop=0;

const selectChoice=(container,value)=>container.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.lookupValue===String(value)));
const createChoice=(container,value,label,onClick,selectionContainer=container)=>{const button=document.createElement('button');button.type='button';button.dataset.lookupValue=value;button.textContent=label;button.addEventListener('click',()=>{selectChoice(selectionContainer,value);onClick(value);});container.append(button);};
const clearResults=()=>{lookupResults.replaceChildren();lookupResults.classList.remove('plain-results');lookupStatus.textContent='';};
const enterResult=(title,{filters=false}={})=>{selectionScrollTop=lookupSheet.scrollTop;lookupSelection.hidden=true;lookupResultView.hidden=false;lookupResultTitle.textContent=title;lookupResultFilters.hidden=!filters;lookupResultFilters.replaceChildren();clearResults();lookupSheet.scrollTop=0;};
const leaveResult=()=>{lookupResultView.hidden=true;lookupSelection.hidden=false;lookupResultFilters.replaceChildren();clearResults();lookupSheet.scrollTop=selectionScrollTop;};
const resetLookup=()=>{if(!lookupResultView.hidden)leaveResult();lookupModal.hidden=true;document.body.classList.remove('lookup-open');lookupToggle.focus();};

for(let stroke=1;stroke<=30;stroke+=1)createChoice(lookupStrokesList,stroke,`${stroke}画`,findStrokes);
const radicalsByStrokes=new Map();
Object.keys(radicalIndex).forEach(radical=>{const strokes=radicalStrokes[radical]||99;if(!radicalsByStrokes.has(strokes))radicalsByStrokes.set(strokes,[]);radicalsByStrokes.get(strokes).push(radical);});
[...radicalsByStrokes.entries()].sort(([a],[b])=>a-b).forEach(([strokes,radicals])=>{const group=document.createElement('div');group.className='lookup-radical-group';const title=document.createElement('p');title.textContent=strokes===99?'其他':`${strokes}画`;const choices=document.createElement('div');choices.className='lookup-radical-choices';radicals.sort((a,b)=>a.localeCompare(b,'zh-CN')).forEach(radical=>createChoice(choices,radical,radical,findRadical,lookupRadicalsList));group.append(title,choices);lookupRadicalsList.append(group);});

lookupToggle.addEventListener('click',()=>{lookupModal.hidden=false;document.body.classList.add('lookup-open');lookupPinyinInput.focus();});
lookupClose.addEventListener('click',resetLookup);
lookupBackdrop.addEventListener('click',resetLookup);
lookupResultBack.addEventListener('click',leaveResult);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!lookupModal.hidden)resetLookup();});
document.querySelectorAll('[data-lookup-mode]').forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.lookupMode;document.querySelectorAll('[data-lookup-mode]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));});lookupPinyin.hidden=mode!=='pinyin';lookupRadicals.hidden=mode!=='radicals';lookupStrokes.hidden=mode!=='strokes';clearResults();}));

const createResultButton=character=>{const button=document.createElement('button');button.type='button';button.textContent=character;button.setAttribute('aria-label',`演示“${character}”`);button.addEventListener('click',()=>{resetLookup();window.playHanziWord?.(character);});return button;};
function showResults(characters,label,getGroupLabel){clearResults();if(!characters?.length){lookupStatus.textContent=`没有找到${label}的已收录汉字。`;return;}lookupStatus.textContent=`找到 ${characters.length} 个字，点一个开始演示。`;if(!getGroupLabel){lookupResults.classList.add('plain-results');characters.forEach(character=>lookupResults.append(createResultButton(character)));return;}const groups=new Map();characters.forEach(character=>{const group=getGroupLabel(character);const key=`${group.order}:${group.label}`;if(!groups.has(key))groups.set(key,{...group,items:[]});groups.get(key).items.push(character);});[...groups.values()].sort((a,b)=>a.order-b.order).forEach(group=>{const section=document.createElement('section');section.className='lookup-result-group';const heading=document.createElement('h3');heading.textContent=group.label;const choices=document.createElement('div');choices.className='lookup-result-choices';group.items.forEach(character=>choices.append(createResultButton(character)));section.append(heading,choices);lookupResults.append(section);});}
function findPinyin(){const key=lookupPinyinInput.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v').toLowerCase().replace(/[^a-zv]/g,'');if(!key)return;enterResult(`拼音：${key}`);showResults(pinyinIndex[key],`拼音“${key}”`,character=>{const strokes=characterStrokes[character]||99;return{order:strokes,label:strokes===99?'其他':`${strokes}画`};});}
function findRadical(key){enterResult(`${key}部`);const radicalStroke=radicalStrokes[key]||0;showResults(radicalIndex[key],`部首“${key}”`,character=>{const remaining=Math.max(0,(characterStrokes[character]||0)-radicalStroke);return{order:remaining,label:`部首外 ${remaining} 画`};});}
function findStrokes(key){const candidates=strokeIndex[key]||[];const initials=new Map();candidates.forEach(character=>{(characterInitials[character]||[]).forEach(initial=>{if(!initials.has(initial))initials.set(initial,[]);initials.get(initial).push(character);});});enterResult(`${key}画`,{filters:true});const allButton=document.createElement('button');allButton.type='button';allButton.dataset.lookupValue='all';allButton.textContent=`全部 ${candidates.length}`;allButton.addEventListener('click',()=>{selectChoice(lookupResultFilters,'all');showResults(candidates,`${key} 画 · 全部`,character=>{const initial=(characterInitials[character]||['未注音'])[0];const order=initialOrder.indexOf(initial);return{order:order<0?initialOrder.length:order,label:formatInitial(initial)};});});lookupResultFilters.append(allButton);initialOrder.filter(initial=>initials.has(initial)).forEach(initial=>{const button=document.createElement('button');button.type='button';button.dataset.lookupValue=initial;button.textContent=`${formatInitial(initial)} ${initials.get(initial).length}`;button.addEventListener('click',()=>{selectChoice(lookupResultFilters,initial);showResults(initials.get(initial),`${key} 画 · ${formatInitial(initial)}`);});lookupResultFilters.append(button);});lookupStatus.textContent=`${key} 画共有 ${candidates.length} 个字，请按声母筛选。`;}
lookupPinyinSubmit.addEventListener('click',findPinyin);
lookupPinyinInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findPinyin();}});
