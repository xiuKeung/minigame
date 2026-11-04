import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from './levels.js';

const powerTypes=new Set(['double','spread','rapid','shield','slow']);

test('20 关配置完整且每关保持三波结构',()=>{
  assert.equal(LEVELS.length,20,'当前关卡包应包含二十关');
  assert.equal(new Set(LEVELS.map(level=>level.id)).size,LEVELS.length,'关卡 ID 必须唯一');
  assert.deepEqual([...new Set(LEVELS.map(level=>level.chapter))],['识别','预判','选择','掌握']);
  for(const level of LEVELS){
    assert.equal(level.waves.length,3,`${level.id} 必须保持三波`);
    assert.equal(level.player.lives,4,'玩家装甲基线保持一致');
  }
});

test('波次参数为可读节奏而非无解压力',()=>{
  for(const level of LEVELS)for(const wave of level.waves){
    assert.ok(wave.count>=3&&wave.count<=10);
    assert.ok(['line','grid','stagger','wedge'].includes(wave.formation));
    assert.ok(['still','sway','sweep','pulse'].includes(wave.driftPattern));
    assert.ok(['single','alternate'].includes(wave.deployPattern));
    assert.ok(wave.health>=2&&wave.health<=3);
    assert.ok(wave.deployEvery>=1.85,'投放必须留出反应时间');
    assert.ok(wave.projectileEvery>=1.7,'炮火必须可横移躲避');
    assert.ok(wave.diveSpeed>=6.2&&wave.diveSpeed<=9.6);
    assert.ok(wave.firstDeployAfter>=2.2&&wave.firstProjectileAfter>=1.65);
  }
});

test('强化由关卡编排，类型、时点和组合均安全',()=>{
  const withoutDrops=LEVELS.filter(level=>level.waves.every(wave=>wave.powerDrops.length===0));
  assert.ok(withoutDrops.length>=4,'应保留无强化关，避免形成依赖');
  const droppedTypes=new Set();
  for(const level of LEVELS)for(const wave of level.waves){
    assert.ok(wave.powerDrops.length<=2,'单波强化不超过两个');
    const types=wave.powerDrops.map(drop=>drop.type);
    assert.ok(!(types.includes('shield')&&types.includes('slow')),'同波不可同时投放两种防守强化');
    assert.equal(new Set(wave.powerDrops.map(drop=>drop.afterDefeat)).size,wave.powerDrops.length,'同一击破节点只掉一个强化');
    for(const drop of wave.powerDrops){
      assert.ok(powerTypes.has(drop.type));
      assert.ok(drop.afterDefeat>0&&drop.afterDefeat<=wave.count);
      assert.ok(['safe','gap'].includes(drop.landing));
      droppedTypes.add(drop.type);
    }
  }
  assert.deepEqual([...droppedTypes].sort(),[...powerTypes].sort(),'五种强化均应在关卡包中出现');
});

test('关卡包总体压力逐章节提升',()=>{
  const pressure=level=>level.waves.reduce((sum,wave)=>sum+wave.count*wave.health+wave.drift+wave.diveSpeed+(6-wave.deployEvery)+(6-wave.projectileEvery),0);
  const chapters=['识别','预判','选择','掌握'].map(chapter=>LEVELS.filter(level=>level.chapter===chapter));
  const average=group=>group.reduce((sum,level)=>sum+pressure(level),0)/group.length;
  for(let i=1;i<chapters.length;i++)assert.ok(average(chapters[i])>average(chapters[i-1]));
  assert.ok(pressure(LEVELS.at(-1))>pressure(LEVELS[0]));
});
