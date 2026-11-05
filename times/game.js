const app = document.querySelector('#app');
const DURATION = 180;
const cnNumbers = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八','二十九','三十','三十一','三十二','三十三','三十四','三十五','三十六','三十七','三十八','三十九','四十','四十一','四十二','四十三','四十四','四十五','四十六','四十七','四十八','四十九','五十','五十一','五十二','五十三','五十四','五十五','五十六','五十七','五十八','五十九','六十','六十一','六十二','六十三','六十四','六十五','六十六','六十七','六十八','六十九','七十','七十一','七十二','七十三','七十四','七十五','七十六','七十七','七十八','七十九','八十','八十一'];
function cn(n) { return cnNumbers[n]; }
function chantFor(a, b) { const answer = a * b; const product = answer === 10 ? '一十' : cn(answer); return `${cn(a)}${cn(b)}${answer < 10 ? '得' : ''}${product}`; }
const facts = Array.from({ length: 9 }, (_, i) => i + 1).flatMap(a =>
  Array.from({ length: 9 }, (_, i) => i + 1).filter(b => b >= a).map(b => ({ a, b, answer: a * b, chant: chantFor(a, b) }))
);
const state = { screen: 'home', difficulty: 'easy', playMode: 'practice', selectedFactors: [2,3,4,5,6,7,8,9], lessonGroup: 2, lessonIndex: 0, seconds: DURATION, score: 0, total: 0, roundSize: 0, misses: [], coverageQueue: [], reviewQueue: [], timer: null, nextQuestionTimer: null, question: null, inputValue: '', skipGameAnimation: false, locked: false };
const saved = JSON.parse(localStorage.getItem('times-progress') || '{"learned":[]}');
function save() { localStorage.setItem('times-progress', JSON.stringify(saved)); }
function shuffle(items) { return [...items].sort(() => Math.random() - .5); }
function unique(items) { return [...new Set(items)]; }
function factText(f) { return `${f.a} × ${f.b} = ${f.answer}`; }
function shell(content, cls = '') { return `<div class="stars"></div><section class="screen ${cls}">${content}</section>`; }
function render() {
  clearInterval(state.timer); state.timer = null;
  if (state.screen === 'home') return home();
  if (state.screen === 'difficulty') return difficulty();
  if (state.screen === 'learn') return learnMenu();
  if (state.screen === 'lesson') return lesson();
  if (state.screen === 'game') return game();
  return results();
}
function home() {
  app.innerHTML = shell(`<div class="brand"><img class="brand-mark" src="../assets/minigame-mark.svg" alt="小游戏乐园" /><h1>九九星球</h1><p class="subtitle">边玩边记住九九乘法表</p></div><div class="home-actions"><button class="mode-card play" data-go="difficulty"><span class="mode-icon">🚀</span><span><strong>开始闯关</strong><span>练习一轮或限时挑战</span></span></button><button class="mode-card learn" data-go="learn"><span class="mode-icon">📖</span><span><strong>口诀课堂</strong><span>直接看答案，轻松学口诀</span></span></button></div><p class="home-note">每次答错都会告诉你正确口诀</p>`);
}
function headerBar(title, back) { return `<header class="topbar"><button class="back" data-go="${back}">‹ 返回</button><span class="title">${title}</span><span aria-hidden="true">　</span></header>`; }
function difficulty() {
  const data = [{id:'easy', name:'容易', note:'基础题型，轻松入门'}, {id:'middle', name:'中等', note:'混合练习，逐步挑战全表'}, {id:'hard', name:'困难', note:'全表随机，相近答案来挑战'}];
  const modes = [{id:'practice', name:'练习一轮', note:'完整覆盖，再复习错题'}, {id:'challenge', name:'3 分钟挑战', note:'限时练习，挑战更多题目'}];
  app.innerHTML = shell(`${headerBar('选择难度','home')}<div class="panel center"><p class="eyebrow">开始闯关</p><h2>今天挑战哪一关？</h2><div class="difficulty">${data.map(d => `<button class="${state.difficulty === d.id ? 'active' : ''}" data-difficulty="${d.id}"><span><b>${d.name}</b><small>${d.note}</small></span><span>${state.difficulty === d.id ? '✓' : ''}</span></button>`).join('')}</div><div class="play-mode-picker"><div class="factor-heading"><span>挑战方式</span><small>默认练习一轮</small></div>${modes.map(mode => `<button class="${state.playMode === mode.id ? 'active' : ''}" data-play-mode="${mode.id}"><span><b>${mode.name}</b><small>${mode.note}</small></span><span>${state.playMode === mode.id ? '✓' : ''}</span></button>`).join('')}</div><div class="factor-picker"><div class="factor-heading"><span>练习范围</span><small>可只选一个数</small></div><div class="factor-options">${Array.from({length:8},(_,i)=>i+2).map(n => `<button class="${state.selectedFactors.includes(n) ? 'active' : ''}" data-factor="${n}" aria-pressed="${state.selectedFactors.includes(n)}"><span>${n}</span><span class="factor-check">${state.selectedFactors.includes(n) ? '✓' : ''}</span></button>`).join('')}</div></div><button class="primary" data-action="start-game">出发！</button></div>`);
}
function learnMenu() {
  const allChants = Array.from({length:8}, (_, i) => i + 2).map(group => {
    const items = facts.filter(f => f.a === group);
    return `<section class="chant-group"><h3>${cn(group)}的口诀</h3>${items.map(item => `<p><b>${factText(item)}</b><span>${item.chant}</span></p>`).join('')}</section>`;
  }).join('');
  app.innerHTML = shell(`${headerBar('口诀课堂','home')}<div class="panel center"><p class="eyebrow">直接看答案</p><h2>想先学哪一组？</h2><p class="subtitle">选一组口诀，慢慢看一遍</p><div class="learn-grid">${Array.from({length:8},(_,i)=>i+2).map(n=>`<button class="${saved.learned.includes(n)?'done':''}" data-group="${n}">${cn(n)}的口诀</button>`).join('')}</div></div><section class="all-chants"><h2>全部口诀</h2><p class="subtitle">算式和口诀一起看</p>${allChants}</section><p class="home-note">学习完成后，随时可以回到闯关模式</p>`, 'learn-screen');
}
function lessonFacts() { return facts.filter(f => f.a === state.lessonGroup); }
function lesson() {
  const items = lessonFacts(), f = items[state.lessonIndex];
  app.innerHTML = shell(`${headerBar('口诀课堂','learn')}<div class="lesson-progress"><span style="width:${((state.lessonIndex+1)/items.length)*100}%"></span></div><p class="center subtitle">第 ${state.lessonIndex+1} 条 / 共 ${items.length} 条</p><article class="panel lesson-card center"><p class="lesson-label">${cn(state.lessonGroup)}的口诀</p><p class="equation">${factText(f)}</p><p class="chant">${f.chant}</p><p class="subtitle">看一看，念一念</p></article><section class="lesson-overview" aria-label="本组口诀总览"><p>本组口诀</p><div>${items.map((item, index) => `<span class="${index === state.lessonIndex ? 'current' : ''}">${item.chant}</span>`).join('')}</div></section><div class="lesson-actions"><button class="secondary" data-action="lesson-prev">上一条</button><button class="primary" data-action="lesson-next">${state.lessonIndex === items.length-1 ? '学完啦！' : '下一条'}</button><button class="secondary" data-action="lesson-repeat">再看一次</button></div>`);
}
function availableFacts() {
  return facts.filter(f => state.selectedFactors.includes(f.a) || state.selectedFactors.includes(f.b));
}
function factKey(f) { return `${f.a}-${f.b}`; }
function refillCoverageQueue() { state.coverageQueue = shuffle(availableFacts()); state.roundSize = state.coverageQueue.length; }
function chooseFact() {
  if (!state.coverageQueue.length && !state.reviewQueue.length) {
    if (state.playMode === 'practice' && state.total > 0) return null;
    refillCoverageQueue();
  }
  if (state.coverageQueue.length) return { fact: state.coverageQueue.shift(), phase: 'coverage' };
  return { fact: state.reviewQueue.shift(), phase: 'review' };
}
function answerChoices(f, count=4) {
  const nearby = unique(availableFacts().map(x => x.answer).filter(n => n !== f.answer)).sort((x, y) => Math.abs(x - f.answer) - Math.abs(y - f.answer));
  const fallback = unique(facts.map(x => x.answer).filter(n => n !== f.answer && !nearby.includes(n))).sort((x, y) => Math.abs(x - f.answer) - Math.abs(y - f.answer));
  return shuffle([f.answer, ...nearby, ...fallback].slice(0, count));
}
function newQuestion() {
  const next = chooseFact();
  if (!next) { finishGame(); return false; }
  const f = next.fact; const types = state.difficulty === 'easy' ? ['choice','fill'] : state.difficulty === 'hard' ? ['choice','fill','wrong','input'] : ['choice','fill','wrong'];
  const shouldSwap = state.difficulty === 'hard' && Math.random() < .5;
  const display = shouldSwap ? { a: f.b, b: f.a } : { a: f.a, b: f.b };
  const type = types[Math.floor(Math.random()*types.length)]; state.question = { f, phase: next.phase, display, type, choices: answerChoices(f, 4) }; state.inputValue = ''; state.locked = false; return true;
}
function game() {
  if (!state.question && !newQuestion()) return; const q = state.question;
  const gameClass = state.skipGameAnimation ? 'game-screen no-animate' : 'game-screen';
  state.skipGameAnimation = false;
  const gameStatus = state.playMode === 'challenge' ? `<div class="challenge-status"><div class="timer-wrap"><div class="timer-bar" style="width:${(state.seconds/DURATION)*100}%"></div></div><span class="timer">${formatTime(state.seconds)}</span></div>` : `<div class="practice-progress"><span>${q.phase === 'review' ? '错题复习' : '完整覆盖'}</span><strong>${q.phase === 'review' ? `剩余 ${state.reviewQueue.length + 1} 题` : `${state.roundSize - state.coverageQueue.length} / ${state.roundSize}`}</strong></div>`;
  app.innerHTML = shell(`<div id="confetti" class="confetti" aria-hidden="true"></div><div class="game-top"><button class="pause-btn" data-action="pause" aria-label="暂停游戏">Ⅱ <span>暂停</span></button>${gameStatus}<span class="score">✦ ${state.score}</span></div>${gameQuestion(q)}<div id="feedback" class="feedback">认真看题，再选出答案吧。</div><div id="pause" class="pause hidden"><div class="panel center"><p class="eyebrow">已暂停</p><h2>休息一下吧</h2><p class="subtitle">准备好后继续挑战</p><button class="primary" data-action="resume">继续游戏</button><button class="muted-btn" data-go="home">结束本局</button></div></div>`, gameClass);
  if (state.playMode === 'challenge') startTimer();
}
function gameQuestion(q) {
  const f = q.f, shown = q.display;
  if (q.type === 'choice') return `<article class="question-card"><p class="question-type">选择答案</p><h2>算一算</h2><p class="game-equation">${shown.a} × ${shown.b} = ?</p><p class="question-tip">选出正确的积</p></article><div class="answers">${q.choices.map(n=>`<button class="answer" data-answer="${n}">${n}</button>`).join('')}</div>`;
  if (q.type === 'fill') { const hideA = Math.random() > .5; const prompt = hideA ? `□ × ${shown.b} = ${f.answer}` : `${shown.a} × □ = ${f.answer}`; const correct = hideA ? shown.a : shown.b; const opts = shuffle(unique([correct, ...Array.from({length:9},(_,i)=>i+1).filter(n=>n!==correct).slice(0,3)])).slice(0,4); return `<article class="question-card"><p class="question-type">补全算式</p><h2>缺少哪个数？</h2><p class="game-equation">${prompt}</p><p class="question-tip">想一想这句口诀</p></article><div class="answers">${opts.map(n=>`<button class="answer" data-answer="${n}" data-correct="${correct}">${n}</button>`).join('')}</div>`; }
  if (q.type === 'input') return `<article class="question-card"><p class="question-type">手填答案</p><h2>算一算</h2><p class="game-equation">${shown.a} × ${shown.b} = <span id="input-answer" class="input-answer">?</span></p><p class="question-tip">用下面的数字键盘输入答案</p></article><div class="keypad" aria-label="数字键盘">${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="keypad-key" data-key="${n}">${n}</button>`).join('')}<button class="keypad-key key-clear" data-key="clear" aria-label="清除">⌫</button><button class="keypad-key" data-key="0">0</button><button class="keypad-key key-submit" data-key="submit">确认</button></div>`;
  if (q.type === 'wrong') { const wrong = f.answer + (Math.random() > .5 ? 1 : -1) * (Math.random() > .5 ? shown.a : shown.b); const other = shuffle(availableFacts().filter(x=>x.answer!==f.answer)).slice(0,3); const items = shuffle([{text:`${shown.a} × ${shown.b} = ${wrong}`, bad:true}, ...other.map(x=>({text:factText(x)}))]); return `<article class="question-card"><p class="question-type">找出错误</p><h2>哪一题算错了？</h2><p class="question-tip">点击不正确的算式</p></article><div class="answers">${items.map(x=>`<button class="answer" data-wrong="${x.bad?'yes':'no'}">${x.text}</button>`).join('')}</div>`; }
}
function finishGame() {
  if (state.screen === 'result') return;
  clearInterval(state.timer);
  clearTimeout(state.nextQuestionTimer);
  state.timer = null;
  state.nextQuestionTimer = null;
  state.screen = 'result';
  render();
}
function startTimer() { state.timer = setInterval(()=>{ state.seconds--; const bar=document.querySelector('.timer-bar'), time=document.querySelector('.timer'); if(bar) bar.style.width=`${Math.max(0,state.seconds/DURATION*100)}%`; if(time) time.textContent=formatTime(state.seconds); if(state.seconds<=0) finishGame(); },1000); }
function formatTime(sec) { return `${String(Math.floor(sec/60)).padStart(1,'0')}:${String(sec%60).padStart(2,'0')}`; }
function feedback(html, kind) { const el=document.querySelector('#feedback'); if(el) { el.className=`feedback ${kind}`; el.innerHTML=html; } }
function celebrate() { const box = document.querySelector('#confetti'); if (!box) return; const colors = ['#ffc94a','#ff8068','#3978e8','#27b99a']; box.innerHTML = Array.from({length: 18}, (_, i) => `<i style="--x:${8 + Math.random() * 84}%;--r:${-150 + Math.random() * 300}deg;--d:${Math.random() * 140}ms;--c:${colors[i % colors.length]}"></i>`).join(''); setTimeout(() => { if (box) box.innerHTML = ''; }, 900); }
function resolve(correct, message) { if(state.locked) return; state.locked=true; document.querySelectorAll('.answer, .keypad button').forEach(b=>b.classList.add('disabled')); state.total++; if(correct) { state.score++; feedback('答对啦！继续加油 ✦','good'); celebrate(); } else { state.misses.push(state.question.f); if (!state.reviewQueue.some(f => factKey(f) === factKey(state.question.f))) state.reviewQueue.push(state.question.f); feedback(message || `答案是 <b>${factText(state.question.f)}</b>，${state.question.f.chant}。`,'bad'); } state.nextQuestionTimer = setTimeout(()=>{ if(state.screen !== 'game' || (state.playMode === 'challenge' && state.seconds <= 0)) return; state.question = null; state.skipGameAnimation = true; render(); }, correct ? 700 : 1700); }
function updateInputAnswer() { const display = document.querySelector('#input-answer'); if (display) display.textContent = state.inputValue || '?'; }
function startGame() { clearTimeout(state.nextQuestionTimer); state.nextQuestionTimer=null; state.screen='game'; state.seconds=DURATION; state.score=0; state.total=0; state.roundSize=0; state.misses=[]; state.coverageQueue=[]; state.reviewQueue=[]; state.question=null; render(); }
document.addEventListener('click', e => {
  const el=e.target.closest('button'); if(!el) return;
  if(el.dataset.go) { state.screen=el.dataset.go; render(); return; }
  if(el.dataset.difficulty) {
    state.difficulty = el.dataset.difficulty;
    document.querySelectorAll('[data-difficulty]').forEach(button => {
      const selected = button.dataset.difficulty === state.difficulty;
      button.classList.toggle('active', selected);
      button.lastElementChild.textContent = selected ? '✓' : '';
    });
    return;
  }
  if(el.dataset.playMode) {
    state.playMode = el.dataset.playMode;
    document.querySelectorAll('[data-play-mode]').forEach(button => {
      const selected = button.dataset.playMode === state.playMode;
      button.classList.toggle('active', selected);
      button.lastElementChild.textContent = selected ? '✓' : '';
    });
    return;
  }
  if(el.dataset.factor) {
    const factor = Number(el.dataset.factor);
    const selected = state.selectedFactors.includes(factor);
    if (selected && state.selectedFactors.length === 1) return;
    state.selectedFactors = selected ? state.selectedFactors.filter(n => n !== factor) : [...state.selectedFactors, factor].sort((a, b) => a - b);
    document.querySelectorAll('[data-factor]').forEach(button => {
      const active = state.selectedFactors.includes(Number(button.dataset.factor));
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('.factor-check').textContent = active ? '✓' : '';
    });
    return;
  }
  if(el.dataset.key) {
    if (state.screen !== 'game' || state.locked || state.question.type !== 'input') return;
    if (el.dataset.key === 'clear') state.inputValue = '';
    else if (el.dataset.key === 'submit') {
      if (!state.inputValue) return;
      const answer = Number(state.inputValue);
      resolve(answer === state.question.f.answer, `答案是 <b>${state.question.f.answer}</b>。${state.question.f.chant}。`);
      return;
    } else if (state.inputValue.length < 2) state.inputValue += el.dataset.key;
    updateInputAnswer();
    return;
  }
  if(el.dataset.group) { state.lessonGroup=Number(el.dataset.group); state.lessonIndex=0; state.screen='lesson'; render(); return; }
  if(el.dataset.action==='start-game') return startGame();
  if(el.dataset.action==='lesson-prev') { state.lessonIndex=Math.max(0,state.lessonIndex-1); render(); return; }
  if(el.dataset.action==='lesson-repeat') return render();
  if(el.dataset.action==='lesson-next') { const items=lessonFacts(); if(state.lessonIndex < items.length-1) state.lessonIndex++; else { if(!saved.learned.includes(state.lessonGroup)) saved.learned.push(state.lessonGroup); save(); state.screen='learn'; } render(); return; }
  if(el.dataset.action==='pause') { clearInterval(state.timer); document.querySelector('#pause').classList.remove('hidden'); return; }
  if(el.dataset.action==='resume') { document.querySelector('#pause').classList.add('hidden'); if (state.playMode === 'challenge') startTimer(); return; }
  if(state.screen!=='game'||state.locked) return;
  if(el.dataset.answer) { const q=state.question; const correct=q.type==='fill'?Number(el.dataset.correct):q.f.answer; const isCorrect=Number(el.dataset.answer)===correct; el.classList.add(isCorrect?'correct':'wrong'); if(!isCorrect) [...document.querySelectorAll('.answer')].find(b=>Number(b.dataset.answer)===correct)?.classList.add('correct'); resolve(isCorrect, `答案是 <b>${correct}</b>。${q.f.chant}。`); return; }
  if(el.dataset.wrong) { const ok=el.dataset.wrong==='yes'; el.classList.add(ok?'correct':'wrong'); resolve(ok, `这一题应该是 <b>${factText(state.question.f)}</b>，${state.question.f.chant}。`); return; }
});
function results() { const review=unique(state.misses.map(f=>`${factText(f)}，${f.chant}`)).slice(0,4); const stars=state.score>=12?'★★★':state.score>=6?'★★☆':'★☆☆'; const title = state.playMode === 'challenge' ? '三分钟挑战结束' : '练习一轮完成'; app.innerHTML=shell(`${headerBar('本局完成','home')}<div class="panel center"><p class="eyebrow">做得不错！</p><h2>${title}</h2><div class="result-stars">${stars}</div><div class="stat-row"><div class="stat"><strong>${state.score}</strong><span>答对题数</span></div><div class="stat"><strong>${state.total}</strong><span>练习题数</span></div></div>${review.length?`<div class="review"><h3>这些口诀再看一眼</h3>${review.map(x=>`<div class="review-item"><span>${x}</span></div>`).join('')}</div>`:`<p class="subtitle">这一局全都答对啦！</p>`}<div class="result-actions"><button class="primary" data-action="start-game">再玩一局</button><button class="secondary" data-go="difficulty">换个难度</button><button class="muted-btn" data-go="home">返回首页</button></div></div>`); }
render();
