import test from 'node:test';import assert from 'node:assert/strict';import {createLevelOne,reachable,move,endTurn,LEVEL_ONE} from './state.js';
test('翼龙越障距离三格，战车距离两格',()=>{const s=createLevelOne();assert.equal(reachable(s,'bird').some(p=>p[0]===3&&p[1]===4),true);assert.equal(reachable(s,'tank').some(p=>p[0]===2&&p[1]===1),false);});
test('预告格中的单位会在结束回合时消耗稳定度',()=>{let s=createLevelOne();s=move(s,'bird',[3,4]);s={...s,bird:[3,3]};assert.equal(endTurn(s).stability,7);});
test('两个单位到达各自出口后结束回合通关',()=>{let s=createLevelOne();s={...s,bird:[...LEVEL_ONE.birdExit],tank:[...LEVEL_ONE.tankExit]};assert.equal(endTurn(s).status,'won');});
