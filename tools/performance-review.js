// Shared by the on-device playable page and local Edge profiler. These are
// controlled render scenarios, not a claim about subjective chase balance.
(function (root) {
  'use strict';
  function summarize(samples) {
    const values = samples.slice().sort((a, b) => a - b);
    const percentile = p => values[Math.min(values.length - 1, Math.floor(values.length * p))] || 0;
    return { count: values.length, medianMs: percentile(0.5), p95Ms: percentile(0.95),
      maxMs: values[values.length - 1] || 0, over20ms: values.filter(v => v > 20).length };
  }
  function create(win) {
    const clock = win.performance.now.bind(win.performance);
    const run = code => win.eval(code);
    function prepare(mode) {
      if (!['normal', 'haze', 'stress'].includes(mode)) throw new Error('Unknown scene ' + mode);
      const savedRandom = win.Math.random;
      let seed = 101;
      win.Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      try {
        run("resetGame(); document.getElementById('btn-start').click(); paused=false; gameTime=80; shiftClock=150; player.x=140;player.y=300;player.facing='down'; hunter.x=110;hunter.y=286;window.__debug.setHunterState('scanning',30);");
        run("for(let i=0;i<6;i++){spawnCustomer();const c=customers[customers.length-1];Object.assign(c,{x:c.seat.x,y:c.seat.y,state:'sitting',moving:false,look:i%4,facing:seatFacing(c.seat),orderType:'beer-blond',sitTimer:35,patienceDuration:40,orderAppearAt:-1});} for(const id of ['sam','gerald','nazim']){window.__debug.forceRegularOrder(id,'beer-blond');regularById.get(id).orderAppearAt=-1;}");
        if (mode !== 'normal') run("fartClouds.push({x:140,y:304,vx:0,vy:0,r:13,age:0,ttl:60,color:FART_COLORS[0]});fartHaze=1;");
        if (mode === 'stress') {
          run("for(let i=0;i<6;i++){spawnCustomer();const c=customers[customers.length-1];Object.assign(c,{x:c.seat.x,y:c.seat.y,state:'sitting',moving:false,look:i%4,facing:seatFacing(c.seat),orderType:i%2?'wine':'beer-dark',sitTimer:35,patienceDuration:40,orderAppearAt:-1});} wetPantsPuddles.push({x:140,y:320});window.__debug.spawnWaiter();window.__debug.spawnBusboy();window.__debug.spawnNick();for(let i=0;i<8;i++)spills.push({x:125+i*5,y:310,ttl:SPILL_TTL,seed:42+i}); const r=regularById.get('sam');r.beingCarried=true;player.tray.push({type:r.orderType,customer:r});window.__debug.setHunterState('chase',30);");
        }
        run('render();');
      } finally { win.Math.random = savedRandom; }
      return { mode, viewport: win.__debug.getViewport(), customers: win.__debug.customers.length,
        haze: win.__debug.getFartHaze(), loadedAtlases: Object.values(win.__debug.Assets.status()).filter(a => a.state === 'ready').length };
    }
    // The pre-extraction renderer, retained here solely as a benchmark baseline.
    // Same sine, alpha, vignette and two-unit bands as game.js on October 10.
    function legacyRenderer(canvas, ctx, scale, getView, calm, now) {
      let copy = null;
      return k => {
        if (k <= 0.01) return;
        if (!copy) copy = win.document.createElement('canvas');
        if (copy.width !== canvas.width || copy.height !== canvas.height) { copy.width = canvas.width; copy.height = canvas.height; }
        const g = copy.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,copy.width,copy.height);g.drawImage(canvas,0,0);
        const {width:w,height:h} = getView(), t = now()/1000;
        const half = v => Math.round(v*2)/2;
        ctx.save();
        if (!calm()) for(let y=0;y<h;y+=2)ctx.drawImage(copy,0,y*scale,copy.width,2*scale,half(Math.sin(y*0.12+t*3)*1.5*k),y,w,2);
        const off=half((1+2.5*k)*(calm()?1:0.7+0.3*Math.sin(t*2.3))),bob=calm()?0:half(Math.sin(t*1.7)*k);
        ctx.globalAlpha=0.33*k;ctx.drawImage(copy,0,0,copy.width,copy.height,-off,bob,w,h);ctx.drawImage(copy,0,0,copy.width,copy.height,off,-bob,w,h);
        ctx.globalAlpha=0.17*k*(calm()?1:0.85+0.15*Math.sin(t*2));ctx.fillStyle='#8fa23a';ctx.fillRect(0,0,w,h);
        const grad=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.3,w/2,h/2,Math.max(w,h)*0.7);
        grad.addColorStop(0,'rgba(60,80,30,0)');grad.addColorStop(1,'rgba(60,80,30,0.8)');ctx.globalAlpha=0.5*k;ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.restore();
      };
    }
    function compare(mode, frames = 300, capture = false) {
      prepare(mode); run('paused=true;');
      const canvas = win.document.getElementById('game'), ctx = canvas.getContext('2d');
      const view = () => run('({width:viewW,height:viewH,top:viewIsPortrait?hudSceneTop():0})');
      const calm = () => run('prefersReducedMotion');
      const old = legacyRenderer(canvas,ctx,4,view,calm,()=>123456);
      const modern = win.Effects.createHazeRenderer({canvas,context:ctx,artScale:4,
        createCanvas:()=>win.document.createElement('canvas'),getView:view,getReducedMotion:calm,now:()=>123456});
      const original = run('drawFartHaze');
      const originalNow = win.performance.now;
      const result = {};
      if(capture)win.__profileCaptures={};
      // Render, lighting and haze share one frozen wall time, scene and viewport.
      // A separately captured clock measures actual synchronous CPU submission.
      win.performance.now = () => 123456;
      try {
        for (const [name, renderer] of [['legacy',old],['bounded',k=>modern.draw(k)]]) {
          win.__profileHaze = renderer;run('drawFartHaze=()=>window.__profileHaze(fartHaze);');
          for(let i=0;i<30;i++)run('render();');
          let imageCalls = 0;
          const drawImage = ctx.drawImage;
          ctx.drawImage = function(...args){imageCalls++;return drawImage.apply(this,args);};
          try { renderer(mode==='normal'?0:1); } finally { ctx.drawImage=drawImage; }
          const samples=[];
          for(let i=0;i<frames;i++){const start=clock();run('render();');samples.push(clock()-start);}
          result[name] = { submission: summarize(samples), hazeImageSubmissions: imageCalls };
          // Readback is outside the timing sample; captures are visual evidence.
          if(capture)win.__profileCaptures[name]=canvas.toDataURL('image/png');
        }
      } finally {
        win.performance.now = originalNow;
        win.__profileHaze=original;run('drawFartHaze=window.__profileHaze;');delete win.__profileHaze;
      }
      return result;
    }
    async function meter(seconds = 10) {
      const intervals=[],submissions=[];let previous=null;
      const original=run('render');
      win.__profileRender=()=>{const start=clock();original();submissions.push(clock()-start);};
      run('render=window.__profileRender;');
      const start=clock();
      try {
        await new Promise(resolve=>{
          const tick=t=>{if(previous!==null)intervals.push(t-previous);previous=t;
            if(clock()-start>=seconds*1000)resolve();else win.requestAnimationFrame(tick);};
          win.requestAnimationFrame(tick);
        });
      } finally {win.__profileRender=original;run('render=window.__profileRender;');delete win.__profileRender;}
      return {seconds,frameSchedule:summarize(intervals),submission:summarize(submissions),
        ending:{haze:win.__debug.getFartHaze(),caught:run('caught'),paused:run('paused'),customers:win.__debug.customers.length}};
    }
    return { prepare, compare, meter, summarize };
  }
  root.GameProfiler = { create, summarize };
})(globalThis);
