import {mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const sourceRoot=process.argv[2];
if(!sourceRoot)throw new Error('Usage: node hanzi/tools/build-dictionary.mjs /path/to/chinese-xinhua');
const loadIndex=()=>{const sandbox={window:{}};vm.runInNewContext(readFileSync(resolve(root,'data-index.js'),'utf8'),sandbox);return sandbox.window.HANZI_INDEX;};
const loadStrokeCounts=index=>{const counts={};for(const bundle of new Set(Object.values(index))){const sandbox={window:{}};vm.runInNewContext(readFileSync(resolve(root,'data/chunks',`${bundle}.js`),'utf8'),sandbox);for(const [character,data] of Object.entries(sandbox.window.HANZI_CHUNK_DATA||{}))counts[character]=data.strokes?.length||0;}return counts;};
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const modernSection=(value='',character,pinyin='')=>{const text=value.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim();const reading=new RegExp(`${escapeRegex(character)}(?:（[^）]+）)?\\s*[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+`,'g');const matches=[...text.matchAll(reading)];const matched=pinyin?matches.filter(match=>match[0].includes(pinyin)):matches;const target=(matched.length?matched:matches).at(-1);return target?text.slice(target.index+target[0].length):text;};
const cleanMeaning=(value='',character,pinyin='')=>{const text=value.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim();const section=modernSection(value,character,pinyin);const snippets=section.replace(/[①②③④⑤⑥⑦⑧⑨⑩⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑]/g,' ').replace(/～/g,character).split(/[。；]/).map(item=>item.trim()).filter(item=>item.length>1);return (snippets.slice(0,2).join('；')||text).slice(0,110)||'暂未收录释义。';};
const isWord=value=>/^[\u3400-\u9fff]{2,4}$/.test(value);
const normalizePinyin=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ü/g,'v').replace(/ɡ/g,'g').toLowerCase().replace(/[^a-zv]/g,'');
const pinyinInitial=value=>value.startsWith('zh')?'ZH':value.startsWith('ch')?'CH':value.startsWith('sh')?'SH':/^[aeo]/.test(value)?'零声母':value[0]?.toUpperCase()||'其他';
const index=loadIndex();
const strokeCounts=loadStrokeCounts(index);
const supported=new Set(Object.keys(index));
const characters=JSON.parse(readFileSync(resolve(sourceRoot,'data/word.json'),'utf8'));
const phrases=JSON.parse(readFileSync(resolve(sourceRoot,'data/ci.json'),'utf8'));
const words=new Map(characters.map(item=>[item.word,item]));
const strokeOverrides={艹:3,辶:3,阝:2,亻:2,扌:3,氵:3,忄:3,宀:3,礻:4,衤:5,刂:2,攵:4,灬:4,冫:2,彳:3,廴:2,钅:5,饣:3};
const phraseSet=new Set(phrases.map(item=>item.ci).filter(isWord));
const groups=new Map([...supported].map(character=>[character,new Set()]));
const curatedGroups={
  '一':['一个','一起','一天','第一'],'二':['二月','第二','二手','二话'],'三':['三个','三月','三天','再三'],
  '人':['人们','人生','人类','好人'],'你':['你好','你们','你的','迷你'],'我':['我们','我的','我国','忘我'],'他':['他们','他的','他人','其他'],
  '中':['中国','中心','中学','其中'],'国':['国家','中国','国王','外国'],'文':['文字','文化','作文','语文'],'字':['汉字','字体','字典','写字'],
  '汉':['汉字','汉语','汉族','汉朝'],'好':['好人','好学','好看','美好'],'学':['学习','学生','学校','科学'],'天':['天空','天气','今天','白天'],
  '日':['日月','生日','今日','日记'],'月':['月亮','月牙','月份','明月'],'水':['水果','水平','水田','喝水'],'火':['火山','火苗','火车','生火'],
  '木':['木头','树木','木材','草木'],'山':['山水','山顶','火山','高山'],'地':['地方','地面','天地','草地'],'永':['永远','永久','永恒','永别'],
  '爱':['爱心','友爱','可爱','热爱'],'笔':['毛笔','笔画','铅笔','笔记'],'画':['画画','图画','画家','书画'],'演':['演出','演示','表演','演员'],
  '示':['表示','展示','示意','示范'],'书':['书本','读书','书包','书写'],'写':['写字','书写','写作','写生'],'语':['语文','语言','汉语','词语']
};
for(const item of characters){if(!supported.has(item.word))continue;const found=new Set();for(const run of modernSection(item.explanation,item.word,item.pinyin).replace(/～/g,item.word).match(/[\u3400-\u9fff]+/g)||[]){for(let start=0;start<run.length;start+=1)for(let length=2;length<=4&&start+length<=run.length;length+=1){const phrase=run.slice(start,start+length);if(phrase.includes(item.word)&&phraseSet.has(phrase))found.add(phrase);}}for(const phrase of [...found].sort((a,b)=>a.length-b.length||a.localeCompare(b,'zh-CN')))groups.get(item.word).add(phrase);}
for(const item of phrases){const phrase=item.ci;if(!isWord(phrase))continue;for(const character of new Set(phrase)){const entries=groups.get(character);if(entries?.size<16)entries.add(phrase);}}
for(const [character,phrases] of Object.entries(curatedGroups)){if(groups.has(character))groups.set(character,new Set(phrases));}
const output=resolve(root,'data/dictionary-chunks');
rmSync(output,{recursive:true,force:true});mkdirSync(output,{recursive:true});
const byBundle=new Map();
for(const [character,bundle] of Object.entries(index)){const item=words.get(character);const entry={p:item?.pinyin||'',r:(item?.radicals||'').trim(),s:strokeCounts[character]||Number(item?.strokes)||0,m:cleanMeaning(item?.explanation,character,item?.pinyin),g:[...(groups.get(character)||[])].slice(0,4)};if(!byBundle.has(bundle))byBundle.set(bundle,{});byBundle.get(bundle)[character]=entry;}
for(const [bundle,entries] of byBundle){writeFileSync(resolve(output,`${bundle}.js`),`window.HANZI_DICTIONARY_DATA=window.HANZI_DICTIONARY_DATA||{};Object.assign(window.HANZI_DICTIONARY_DATA,${JSON.stringify(entries)});\n`);}
const lookup={p:{},r:{},s:{},rs:{},c:{},ci:{}};
for(const character of supported){const item=words.get(character);const strokes=strokeCounts[character]||Number(strokeOverrides[character]||item?.strokes);if(Number.isInteger(strokes)&&strokes>0)lookup.c[character]=strokes;for(const reading of (item?.pinyin||'').split(/[、,，/ ]+/)){const key=normalizePinyin(reading);if(key){(lookup.p[key]??=[]).push(character);const initials=lookup.ci[character]??=[];const initial=pinyinInitial(key);if(!initials.includes(initial))initials.push(initial);}}const radical=(item?.radicals||'').trim();if(/^[\u3400-\u9fff]{1,2}$/.test(radical))(lookup.r[radical]??=[]).push(character);if(Number.isInteger(strokes)&&strokes>0)(lookup.s[strokes]??=[]).push(character);}
for(const values of Object.values(lookup.p))values.sort((a,b)=>a.localeCompare(b,'zh-CN'));
for(const values of Object.values(lookup.r))values.sort((a,b)=>a.localeCompare(b,'zh-CN'));
for(const values of Object.values(lookup.s))values.sort((a,b)=>a.localeCompare(b,'zh-CN'));
for(const radical of Object.keys(lookup.r)){const strokes=strokeCounts[radical]||Number(strokeOverrides[radical]||words.get(radical)?.strokes);lookup.rs[radical]=Number.isInteger(strokes)&&strokes>0?strokes:99;}
writeFileSync(resolve(root,'lookup-index.js'),`window.HANZI_LOOKUP_INDEX=${JSON.stringify(lookup)};\n`);
const stats={characters:Object.keys(index).length,entries:[...byBundle.values()].reduce((total,entries)=>total+Object.keys(entries).length,0),bundles:byBundle.size,withPinyin:[...words.keys()].filter(character=>supported.has(character)).length};
console.log(JSON.stringify(stats));
