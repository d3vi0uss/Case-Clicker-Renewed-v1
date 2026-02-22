const STORAGE_KEY = 'ccr_v1_state';
const defaultState = {
  wallet: 1000,
  vault: 500,
  xp: 0,
  level: 1,
  prestige: 0,
  profile: { username: 'Operator', behavior: 'Balanced', rank: 'Silver I' },
  inventory: [],
  market: {},
  caseHistory: [],
  achievements: {},
  stats: { wagered: 0, won: 0, lost: 0, biggestWin: 0, games: {}, skillScore: 0, recentWins: [] },
  provablyFair: { clientSeed: crypto.randomUUID().slice(0, 12), serverSeed: crypto.randomUUID().slice(0, 12), history: [] },
  tournaments: { seasonStart: Date.now(), points: 0, ai: [] },
  settings: { sound: true, animations: true, theme: 'purple-black', safeMode: false, sessionTimer: true },
  profiles: [{ name: 'Slot A' }, { name: 'Slot B' }, { name: 'Slot C' }],
  session: { startWallet: 1000, startedAt: Date.now() }
};

const RARITIES = [
  ['Consumer', 40, '#7ea4ff'],['Industrial',25,'#6ebcff'],['Mil-Spec',16,'#5f7fff'],['Restricted',10,'#a35fff'],
  ['Classified',6,'#de56ff'],['Covert',2.5,'#ff5476'],['Rare Special',0.5,'#facc15']
];
const WEARS = [['Factory New',1],['Minimal Wear',0.94],['Field-Tested',0.82],['Well-Worn',0.72],['Battle-Scarred',0.6]];

class GameState {
  constructor() { this.state = this.load(); this.idleTick(); }
  load(){ try{return {...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{return structuredClone(defaultState)} }
  save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
  set(mutator){ mutator(this.state); this.save(); }
  idleTick(){ setInterval(()=>{ this.set(s=>{ s.wallet += 1 + s.prestige; s.vault *= 1.0002; });}, 30000); }
}

class WearSystem { generate(){ return WEARS[Math.floor(Math.random()*WEARS.length)]; } }
class RankSystem { rank(level){ return ['Bronze','Silver','Gold','Platinum','Diamond'][Math.min(4,Math.floor(level/10))] + ' ' + ((level%10)+1); } }
class PrestigeSystem { tryPrestige(gs){ if(gs.state.level>=50){ gs.set(s=>{ s.prestige++; s.level=1;s.xp=0;s.wallet=1000;}); } } }
class ProvablyFairSystem {
  constructor(gs){ this.gs=gs; }
  hash(input){ return [...new TextEncoder().encode(input)].reduce((a,b)=>(a*31+b)%1e9,7).toString(16); }
  roll(game){ const p=this.gs.state.provablyFair; const nonce=p.history.length+1; const value=this.hash(`${p.clientSeed}:${p.serverSeed}:${game}:${nonce}`); const n=parseInt(value,16)%10000/10000; this.gs.set(s=>s.provablyFair.history.unshift({game,nonce,result:n,time:Date.now()})); return n; }
  regen(){ this.gs.set(s=>{s.provablyFair.clientSeed=crypto.randomUUID().slice(0,12);s.provablyFair.serverSeed=crypto.randomUUID().slice(0,12);}); }
}
class InventorySystem {
  constructor(gs){ this.gs=gs; }
  add(item){ this.gs.set(s=>s.inventory.push(item)); }
  value(){ return this.gs.state.inventory.reduce((a,b)=>a+b.value,0); }
  sellAll(){ this.gs.set(s=>{ const t=s.inventory.reduce((a,b)=>a+b.value,0); s.wallet+=t; s.inventory=[];}); }
}
class CaseSystem {
  constructor(gs, inv, wear){ this.gs=gs; this.inv=inv; this.wear=wear; this.skins=this.createSkins(); this.cases=this.createCases(); }
  createSkins(){ const arr=[]; for(let i=0;i<84;i++){ const r=this.pickRarity(); arr.push({id:i,name:`${['Pulse','Nova','Spectral','Phantom','Apex'][i%5]}-${100+i}`,rarity:r[0],base:Math.round((5+i*0.6)*(r[0]==='Rare Special'?6:r[0]==='Covert'?3:1)),color:r[2]}); } return arr; }
  createCases(){ return Array.from({length:10},(_,i)=>({id:i,name:`Quantum Case ${i+1}`,price:25+i*12,odds:RARITIES})); }
  pickRarity(){ const x=Math.random()*100; let c=0; for(const r of RARITIES){ c+=r[1]; if(x<=c) return r; } return RARITIES[0]; }
  open(caseId,count=1){ const c=this.cases.find(x=>x.id===caseId); if(!c) return []; const out=[]; this.gs.set(s=>{ if(s.wallet<c.price*count) return; s.wallet-=c.price*count; });
    for(let i=0;i<count;i++){ const skin=this.skins.filter(s=>s.rarity===this.pickRarity()[0])[0] || this.skins[0]; const [wear,mult]=this.wear.generate(); const item={...skin,wear,value:Math.round(skin.base*mult)}; out.push(item); this.inv.add(item); }
    this.gs.set(s=>{ s.caseHistory.unshift({case:c.name,items:out,time:Date.now()}); s.stats.recentWins.unshift(...out.slice(0,3).map(i=>`${i.name} $${i.value}`)); s.xp += 8*count; });
    return out;
  }
}
class MarketSystem {
  constructor(gs, caseSys){ this.gs=gs; this.caseSys=caseSys; if(!Object.keys(gs.state.market).length){ gs.set(s=> caseSys.skins.forEach(k=>s.market[k.id]={price:k.base,vol:(Math.random()*4+1).toFixed(2),change:0,spark:[k.base]})); }
    setInterval(()=>this.tick(),30000);
  }
  tick(){ const events=['Knife demand surge','Covert crash','Weapon hype spike',null]; const ev=events[Math.floor(Math.random()*events.length)]; this.gs.set(s=>{ Object.entries(s.market).forEach(([id,m])=>{ const cyc=Math.sin(Date.now()/90000)*2; const delta=(Math.random()-0.5)*m.vol+cyc; m.change=delta; m.price=Math.max(1, +(m.price*(1+delta/100)).toFixed(2)); m.spark=(m.spark||[]).slice(-19).concat(m.price); }); s.marketEvent=ev; }); }
}
class VaultSystem { constructor(gs){this.gs=gs;} deposit(v){this.gs.set(s=>{if(s.wallet>=v){s.wallet-=v;s.vault+=v;}})} withdraw(v){this.gs.set(s=>{if(s.vault>=v){s.vault-=v;s.wallet+=v;}})} }
class TournamentSystem { constructor(gs){this.gs=gs; if(!gs.state.tournaments.ai.length){ gs.set(s=>s.tournaments.ai=Array.from({length:12},(_,i)=>({name:`AI_${i+1}`,pts:Math.floor(Math.random()*2000)}))); }} points(){ return this.gs.state.tournaments.points; } }
class BehaviorSystem { constructor(gs){this.gs=gs;} eval(){ const st=this.gs.state.stats; const ratio=(st.won+1)/(st.lost+1); return ratio>1.3?'Value Hunter':ratio<0.8?'High Risk':'Balanced'; } }
class StatsSystem { constructor(gs){this.gs=gs;} record(game,bet,payout){ this.gs.set(s=>{ s.stats.wagered+=bet; if(payout>=bet){s.stats.won+=payout-bet;} else s.stats.lost+=bet-payout; s.stats.biggestWin=Math.max(s.stats.biggestWin,payout); s.stats.games[game]=(s.stats.games[game]||0)+1; s.wallet += payout-bet; s.stats.recentWins.unshift(`${game}: ${payout>=bet?'+':'-'}$${Math.abs(payout-bet).toFixed(2)}`); s.tournaments.points += Math.round(Math.max(0,payout-bet)); }); }
  rtp(){const s=this.gs.state.stats; return s.wagered?((s.won/(s.wagered))*100).toFixed(1):'0.0';}
}
class AchievementSystem { constructor(gs){ this.gs=gs; this.list=Array.from({length:55},(_,i)=>({id:`a${i}`,name:`Milestone ${i+1}`,target:(i+1)*10,metric:i%2?'wagered':'xp'})); }
  check(){ this.gs.set(s=>this.list.forEach(a=>{ const v=a.metric==='wagered'?s.stats.wagered:s.xp+s.level*100; if(v>=a.target) s.achievements[a.id]=true; })); }
}
class PluginRegistry { constructor(){ this.map=new Map(); } register(name,plugin){ this.map.set(name,plugin);} get(name){return this.map.get(name);} }
class CasinoGame { constructor(name,odds,stats,pf){ this.name=name; this.odds=odds; this.stats=stats; this.pf=pf; } play(bet){ const r=this.pf.roll(this.name); const win=r<this.odds; const payout=win?bet*(1/this.odds*0.96):0; this.stats.record(this.name,bet,payout); return {r,win,payout}; } }
class BlackjackGame extends CasinoGame{} class RouletteGame extends CasinoGame{} class CrashGame extends CasinoGame{}
class MinesGame extends CasinoGame{} class DiceGame extends CasinoGame{} class PlinkoGame extends CasinoGame{}
class JackpotGame extends CasinoGame{} class CoinflipGame extends CasinoGame{} class WheelGame extends CasinoGame{} class SlotsGame extends CasinoGame{}
class CasinoManager {
  constructor(stats,pf){ this.registry=new PluginRegistry(); [
    ['blackjack',new BlackjackGame('Blackjack',0.48,stats,pf)],['roulette',new RouletteGame('Roulette',18/37,stats,pf)],
    ['crash',new CrashGame('Crash',0.44,stats,pf)],['mines',new MinesGame('Mines',0.40,stats,pf)],['dice',new DiceGame('Dice',0.495,stats,pf)],
    ['plinko',new PlinkoGame('Plinko',0.46,stats,pf)],['jackpot',new JackpotGame('Jackpot',0.3,stats,pf)],['coinflip',new CoinflipGame('Coinflip',0.495,stats,pf)],
    ['wheel',new WheelGame('Wheel',0.33,stats,pf)],['slots',new SlotsGame('Slots',0.26,stats,pf)]
  ].forEach(([n,g])=>this.registry.register(n,g)); }
}
class GraphicsEngine {
  static weaponSVG(color='#7a5cff'){ return `<svg viewBox='0 0 120 36'><rect x='8' y='12' width='78' height='8' rx='2' fill='${color}'/><rect x='86' y='14' width='20' height='5' fill='#2e2e40'/><rect x='20' y='20' width='12' height='10' fill='#2e2e40'/></svg>`; }
}
class AnimationEngine { static pulse(el){ el?.animate([{transform:'scale(1)'},{transform:'scale(1.02)'},{transform:'scale(1)'}],{duration:360}); } }
class ProfileManager { constructor(gs){this.gs=gs;} export(){ return JSON.stringify(this.gs.state,null,2);} import(raw){ try{ const v=JSON.parse(raw); localStorage.setItem(STORAGE_KEY,JSON.stringify(v)); location.reload(); }catch{} } }

class UIController {
  constructor(){
    this.gs=new GameState(); this.wear=new WearSystem(); this.rank=new RankSystem(); this.inv=new InventorySystem(this.gs);
    this.caseSys=new CaseSystem(this.gs,this.inv,this.wear); this.market=new MarketSystem(this.gs,this.caseSys); this.vault=new VaultSystem(this.gs);
    this.stats=new StatsSystem(this.gs); this.pf=new ProvablyFairSystem(this.gs); this.casino=new CasinoManager(this.stats,this.pf); this.tour=new TournamentSystem(this.gs);
    this.behavior=new BehaviorSystem(this.gs); this.ach=new AchievementSystem(this.gs); this.prestige=new PrestigeSystem(); this.profile=new ProfileManager(this.gs);
    this.activateNav(); this.render(); this.registerSW();
  }
  activateNav(){ const page=document.body.dataset.page; document.querySelector(`[data-nav="${page}"]`)?.classList.add('active'); }
  shell(title,body){ return `<h2>${title}</h2>${body}`; }
  render(){ const p=document.body.dataset.page; const app=document.getElementById('app'); const s=this.gs.state; s.profile.behavior=this.behavior.eval(); s.profile.rank=this.rank.rank(s.level); this.ach.check();
    const commonTop=`<div class='panel flex space'><div>Wallet <b>$${s.wallet.toFixed(2)}</b></div><div>Vault <b>$${s.vault.toFixed(2)}</b></div><div>Level <b>${s.level}</b></div><div class='progress' style='width:180px'><span style='width:${s.xp%100}%'></span></div></div><br/>`;
    const pages={
      index:()=>this.shell('Dashboard',`${commonTop}<div class='grid cols-3'><div class='panel stat'>Rank<b>${s.profile.rank}</b></div><div class='panel stat'>Prestige<b>${s.prestige}</b></div><div class='panel stat'>Session P/L<b>$${(s.wallet-s.session.startWallet).toFixed(2)}</b></div><div class='panel stat'>Inventory Value<b>$${this.inv.value().toFixed(2)}</b></div><div class='panel stat'>RTP<b>${this.stats.rtp()}%</b></div><div class='panel stat'>Behavior<b>${s.profile.behavior}</b></div></div><br/><div class='panel'><h4>Market overview</h4><canvas id='miniChart' height='80'></canvas></div><br/><div class='panel'><h4>Recent wins</h4>${(s.stats.recentWins||[]).slice(0,8).map(r=>`<div>${r}</div>`).join('')}</div>`),
      cases:()=>this.shell('Cases',`${commonTop}<div class='panel'>Odds: ${RARITIES.map(r=>`${r[0]} ${r[1]}%`).join(' | ')}</div><br/><div class='case-grid'>${this.caseSys.cases.map(c=>`<div class='card'><div class='flex space'><b>${c.name}</b><span>$${c.price}</span></div>${GraphicsEngine.weaponSVG()}<div class='flex'><button class='btn-primary' data-open='${c.id},1'>Open x1</button><button class='btn-secondary' data-open='${c.id},5'>x5</button><button class='btn-secondary' data-open='${c.id},10'>x10</button></div></div>`).join('')}</div><br/><div class='panel'><h4>Open history</h4>${s.caseHistory.slice(0,10).map(h=>`<div>${new Date(h.time).toLocaleTimeString()} ${h.case} → ${h.items.map(i=>i.name).join(', ')}</div>`).join('')}</div>`),
      inventory:()=>this.shell('Inventory',`${commonTop}<div class='panel flex space'><div>Total value: $${this.inv.value().toFixed(2)}</div><button class='btn-danger' id='sellAll'>Sell All</button></div><br/><div class='skin-grid'>${s.inventory.map((i,idx)=>`<div class='card rarity-${i.rarity.toLowerCase().replace(/ /g,'-')}'><b>${i.name}</b><div>${i.rarity}</div>${GraphicsEngine.weaponSVG(i.color)}<div class='progress'><span style='width:${Math.round(i.value/i.base*100)}%'></span></div><div class='flex space'><span>${i.wear}</span><span>$${i.value}</span></div><button class='btn-secondary' data-sell='${idx}'>Sell</button></div>`).join('')}</div>`),
      market:()=>this.shell('Market',`${commonTop}<div class='panel'>${s.marketEvent||'No event'} • updates every 30s</div><br/><div class='panel'><table class='table'><thead><tr><th>Skin</th><th>Price</th><th>Change%</th><th>Volatility</th><th>Sparkline</th></tr></thead><tbody>${Object.entries(s.market).slice(0,25).map(([id,m])=>`<tr><td>${this.caseSys.skins[id]?.name||id}</td><td>$${m.price}</td><td style='color:${m.change>=0?'#22c55e':'#ef4444'}'>${m.change.toFixed(2)}</td><td>${m.vol}</td><td><canvas data-spark='${id}' width='100' height='24'></canvas></td></tr>`).join('')}</tbody></table></div>`),
      casino:()=>this.shell('Casino Suite',`${commonTop}<div class='panel flex'>${['blackjack','roulette','crash','mines','dice','plinko','jackpot','coinflip','wheel','slots'].map(g=>`<button class='btn-secondary' data-game='${g}'>${g}</button>`).join('')}</div><br/><div class='panel'><div id='casinoInfo'>Transparent odds and provably fair: house edge fixed at 4%.</div><div class='flex'><input id='bet' type='number' value='25' min='1'/><button class='btn-primary' id='playCasino'>Play</button></div><pre id='casinoOut'></pre></div>`),
      skill:()=>this.shell('Skill Arena',`${commonTop}<div class='panel'><p>30-second reaction challenge. Click moving targets.</p><button class='btn-primary' id='startSkill'>Start</button><div id='skillGame' style='position:relative;height:260px;border:1px solid var(--border);margin-top:8px;'></div><div id='skillStats'></div></div>`),
      tournaments:()=>this.shell('Tournaments',`${commonTop}<div class='panel'>7-day season points from profit, rare drops, and skill score.</div><br/><div class='panel'><table class='table'><tbody>${[{name:s.profile.username,pts:s.tournaments.points},...s.tournaments.ai].sort((a,b)=>b.pts-a.pts).map((r,i)=>`<tr><td>#${i+1}</td><td>${r.name}</td><td>${r.pts}</td></tr>`).join('')}</tbody></table></div>`),
      vault:()=>this.shell('Vault',`${commonTop}<div class='grid cols-2'><div class='panel'><input type='number' id='depAmt' value='100'/><button class='btn-success' id='deposit'>Deposit</button></div><div class='panel'><input type='number' id='withAmt' value='100'/><button class='btn-secondary' id='withdraw'>Withdraw</button></div></div><br/><div class='panel'>Safe mode: <button class='btn-secondary' id='safeMode'>${s.settings.safeMode?'ON':'OFF'}</button></div>`),
      achievements:()=>this.shell('Achievements',`${commonTop}<div class='skin-grid'>${this.ach.list.map(a=>{const done=!!s.achievements[a.id];return `<div class='card ${done?'rarity-rare-special':''}'><b>${a.name}</b><div>${done?'Unlocked':'Locked'}</div><div class='progress'><span style='width:${done?100:20}%'></span></div></div>`}).join('')}</div>`),
      profile:()=>this.shell('Profile',`${commonTop}<div class='grid cols-3'><div class='panel'>Username <b>${s.profile.username}</b></div><div class='panel'>Behavior <b>${s.profile.behavior}</b></div><div class='panel'>Biggest Win <b>$${s.stats.biggestWin.toFixed(2)}</b></div></div><br/><div class='panel'>Total wagered: $${s.stats.wagered.toFixed(2)} • RTP: ${this.stats.rtp()}% • EV vs actual: ${(s.stats.won-s.stats.lost).toFixed(2)}</div><br/><div class='panel'><canvas id='distChart' height='90'></canvas></div><br/><div class='panel'><button class='btn-primary' id='shareCard'>Generate share card</button><canvas id='shareCanvas' width='420' height='220'></canvas></div>`),
      settings:()=>this.shell('Settings',`${commonTop}<div class='grid cols-2'><div class='panel'>Sound <button class='btn-secondary' id='toggleSound'>${s.settings.sound?'ON':'OFF'}</button></div><div class='panel'>Animations <button class='btn-secondary' id='toggleAnim'>${s.settings.animations?'ON':'OFF'}</button></div><div class='panel'>Session timer <button class='btn-secondary' id='toggleTimer'>${s.settings.sessionTimer?'ON':'OFF'}</button></div><div class='panel'>Provably fair seeds <div>${s.provablyFair.clientSeed} / ${s.provablyFair.serverSeed}</div><button class='btn-secondary' id='regenSeed'>Regenerate</button></div></div><br/><div class='panel'><button class='btn-danger' id='reset'>Reset account</button> <button class='btn-success' id='export'>Export JSON</button> <input id='importInput' placeholder='Paste JSON'/><button class='btn-secondary' id='import'>Import</button></div>`)
    };
    app.innerHTML = pages[p]?.() || '<div class="panel">Unknown page</div>';
    this.bind(p);
    this.drawCharts(p);
  }
  bind(p){
    const q=(s)=>document.querySelector(s);
    if(p==='cases') document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ const [id,c]=b.dataset.open.split(',').map(Number); this.caseSys.open(id,c); this.render(); });
    if(p==='inventory'){ q('#sellAll')?.addEventListener('click',()=>{this.inv.sellAll(); this.render();}); document.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{const i=+b.dataset.sell; this.gs.set(s=>{const it=s.inventory.splice(i,1)[0]; s.wallet+=it?.value||0;}); this.render();}); }
    if(p==='casino'){ let current='blackjack'; document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{current=b.dataset.game; q('#casinoInfo').textContent=`${current} odds transparent. Win chance ${(this.casino.registry.get(current).odds*100).toFixed(2)}%`;}); q('#playCasino')?.addEventListener('click',()=>{const bet=Math.max(1,+q('#bet').value||1); const res=this.casino.registry.get(current).play(bet); q('#casinoOut').textContent=JSON.stringify(res,null,2); this.gs.set(s=>s.xp+=5); this.render();}); }
    if(p==='skill') q('#startSkill')?.addEventListener('click',()=>this.runSkillGame());
    if(p==='vault'){ const d=q('#deposit'), w=q('#withdraw'), sm=q('#safeMode'); if(d) d.onclick=()=>{this.vault.deposit(+q('#depAmt').value||0); this.render();}; if(w) w.onclick=()=>{this.vault.withdraw(+q('#withAmt').value||0); this.render();}; if(sm) sm.onclick=()=>{this.gs.set(s=>s.settings.safeMode=!s.settings.safeMode); this.render();}; }
    if(p==='settings'){
      const ts=q('#toggleSound'), ta=q('#toggleAnim'), tt=q('#toggleTimer'), rs=q('#regenSeed'), re=q('#reset'), ex=q('#export'), im=q('#import');
      if(ts) ts.onclick=()=>{this.gs.set(s=>s.settings.sound=!s.settings.sound); this.render();};
      if(ta) ta.onclick=()=>{this.gs.set(s=>s.settings.animations=!s.settings.animations); this.render();};
      if(tt) tt.onclick=()=>{this.gs.set(s=>s.settings.sessionTimer=!s.settings.sessionTimer); this.render();};
      if(rs) rs.onclick=()=>{this.pf.regen(); this.render();};
      if(re) re.onclick=()=>{localStorage.removeItem(STORAGE_KEY); location.reload();};
      if(ex) ex.onclick=()=>{const blob=new Blob([this.profile.export()],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ccr-profile.json'; a.click();};
      if(im) im.onclick=()=>this.profile.import(q('#importInput').value);
    }
    if(p==='profile'){ const sc=q('#shareCard'); if(sc) sc.onclick=()=>{const c=q('#shareCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#0c0c12';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#c084fc';ctx.font='bold 20px sans-serif';ctx.fillText('Case Clicker Profile',20,36);ctx.fillStyle='#f1f1f5';ctx.fillText(`User: ${this.gs.state.profile.username}`,20,78);ctx.fillText(`Level: ${this.gs.state.level} Prestige: ${this.gs.state.prestige}`,20,108);ctx.fillText(`RTP: ${this.stats.rtp()}%`,20,138);ctx.fillText(`Biggest Win: $${this.gs.state.stats.biggestWin.toFixed(2)}`,20,168); const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='profile-card.png';a.click();}; }
  }
  runSkillGame(){ const area=document.getElementById('skillGame'); if(!area) return; area.innerHTML=''; let score=0,hits=0,shots=0,time=30; const t=document.getElementById('skillStats');
    const spawn=()=>{ const dot=document.createElement('div'); dot.style.cssText=`position:absolute;width:22px;height:22px;border-radius:50%;background:#a855f7;left:${Math.random()*92}%;top:${Math.random()*88}%;cursor:pointer;`; dot.onclick=()=>{hits++;score+=12;dot.remove();}; area.appendChild(dot); shots++; setTimeout(()=>dot.remove(),850); };
    const int=setInterval(()=>{time--; spawn(); t.textContent=`${time}s | score ${score} | accuracy ${shots?Math.round(hits/shots*100):0}%`; if(time<=0){clearInterval(int); const reward=score*(hits/Math.max(1,shots)); this.gs.set(s=>{s.wallet+=reward;s.xp+=Math.round(score/4);s.stats.skillScore=Math.max(s.stats.skillScore,score);s.tournaments.points+=Math.round(reward/2);}); this.render(); }},1000);
  }
  drawCharts(p){
    if(p==='index'){ const c=document.getElementById('miniChart'); if(c){const x=c.getContext('2d'); const vals=Object.values(this.gs.state.market).slice(0,25).map(m=>m.price); x.clearRect(0,0,c.width,c.height); x.strokeStyle='#9d4edd'; x.beginPath(); vals.forEach((v,i)=>{const y=80-(v/Math.max(...vals))*70; x[i?'lineTo':'moveTo']((i/(vals.length-1))*c.width,y);}); x.stroke(); }}
    if(p==='market'){ document.querySelectorAll('[data-spark]').forEach(cv=>{ const id=cv.dataset.spark; const m=this.gs.state.market[id]; const x=cv.getContext('2d'); const vals=m.spark||[m.price]; x.strokeStyle='#a855f7'; x.beginPath(); vals.forEach((v,i)=>{const y=24-(v/Math.max(...vals))*20; x[i?'lineTo':'moveTo']((i/(vals.length-1||1))*100,y);}); x.stroke(); }); }
    if(p==='profile'){ const c=document.getElementById('distChart'); if(c){const x=c.getContext('2d');const g=this.gs.state.stats.games;const entries=Object.entries(g);let i=0;entries.forEach(([k,v])=>{x.fillStyle=`hsl(${i*35} 80% 60%)`;x.fillRect(10+i*38,90-v*4,24,v*4);x.fillStyle='#a1a1b3';x.fillText(k.slice(0,3),10+i*38,88);i++;});}}
  }
  registerSW(){ if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js'); }
}

new UIController();
