export const LEVEL_COUNT=20;
const names=['晴湾启程','白沙渡口','潮汐平台','海风仓库','珊瑚电站','风之回廊','双芯港口','远岸信标','高空补给','长桥前哨','封锁海湾','霜蓝航道','逆风港湾','高塔仓库','深蓝哨站','三芯要塞','长风航线','极昼电站','最后防线','天空归航'];
export function levelConfig(number=1){
 const level=Math.max(1,Math.min(20,Math.trunc(number)||1)),t=(level-1)/19;
 const plate=21+((level-1)%4)*1.5,bridgeStart=plate+6,bridgeEnd=bridgeStart+11+Math.floor((level-1)/4)*2;
 const battery={x:bridgeEnd+11+((level-1)%3)*2,y:8+((level-1)%4)*.5};
 const station=battery.x+22+((level-1)%3)*2,turret={x:station+10,y:5+((level-1)%3)*.5};
 const wall=turret.x+13,exit=wall+9;
 const requiredCells=level>=16?3:level>=7?2:1;
 const cells=[battery,{x:bridgeEnd+6,y:10},{x:station-8,y:8.8}].slice(0,requiredCells);
 return {level,name:names[level-1],requiredCells,terminalNeedsPower:level>=11,turretHp:75+25*Math.floor((level-1)/7),fireInterval:2.3-t*1.1,shotSpeed:6+t*3,damage:25+Math.floor(t*10),wind:level>=6?.35+t*.6:0,
 lift:level>=5,scanner:level>=4,coopGate:level>=12,
 world:{bricks:[{x:plate-5,y:8.5},{x:battery.x+5,y:10.7},{x:station+4,y:6.5}],rescue:{x:bridgeEnd+8,y:3.4},scanner:{x:battery.x+6,y:7},gate:wall-5,gatePlate:station+3,gateSwitch:{x:station+7,y:9},end:exit+5,plate,bridgeStart,bridgeEnd,bridgeSwitch:{x:bridgeEnd+3,y:6.5+((level-1)%3)*.6},battery,cells,terminal:{x:station-7,y:8+((level-1)%2)*.8},station,turret,wall,exit}};
}
