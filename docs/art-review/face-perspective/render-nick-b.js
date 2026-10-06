// Preview-only frame measurement and comparison rendering; never writes production assets.
// node docs/art-review/face-perspective/render-nick-b.js
const fs = require('fs');
const path = require('path');
const { session } = require('../../../tools/browser-session');
const out = __dirname;
const refs = ['waiter', 'doe', 'hunter', 'nick'].map(family => ({
  family, meta: JSON.parse(fs.readFileSync(path.resolve(out, '../../../assets/sprites/' + family + '-illustrated.json'), 'utf8'))
}));

session(async (browser, base) => {
  const reports = [];
  for (const [name, width, height, mobile] of [['desktop', 1200, 900, false], ['mobile', 390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile,
      hasTouch: mobile, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => errors.push(r.url()));
    page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    await page.route(base + '/__nick_b_preview__', route => route.fulfill({ status:200,contentType:'text/html',
      body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/assets/favicon.svg"><title>Nick B preview</title></head><body style="margin:0;background:#14120d"><canvas id="board" style="display:block;margin:auto;max-width:100%;height:auto"></canvas></body></html>' }));
    await page.goto(base + '/__nick_b_preview__', { waitUntil:'domcontentloaded' });
    const report = await page.evaluate(async ({ base, refs, mobile }) => {
      const load = src => new Promise((resolve, reject) => {
        const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error('Failed image ' + src)); im.src = base + src;
      });
      const originals = await Promise.all(refs.map(r => load('/assets/sprites/' + r.family + '-illustrated.png')));
      const study = await load('/docs/art-review/face-perspective/nick-b-candidate.png');
      if (study.width !== study.height) throw new Error('Candidate must be square');
      const scan = document.createElement('canvas'); scan.width = study.width; scan.height = study.height;
      const sctx = scan.getContext('2d'); sctx.drawImage(study, 0, 0);
      const pixels = sctx.getImageData(0, 0, scan.width, scan.height).data;
      let transparent = 0;
      const rowInk = [];
      for (let y = 0; y < scan.height; y++) {
        let count = 0;
        for (let x = 0; x < scan.width; x++) {
          const a = pixels[(y * scan.width + x) * 4 + 3];
          if (!a) transparent++; if (a >= 128) count++;
        }
        rowInk.push(count);
      }
      if (transparent < scan.width * scan.height * .35) throw new Error('Candidate transparency insufficient');
      const seams = [0];
      for (let r = 1; r < 4; r++) {
        const target = scan.height * r / 4;
        const gaps = []; let gapStart = null;
        for (let y = Math.floor(target - scan.height * .055); y < Math.ceil(target + scan.height * .055); y++) {
          if (rowInk[y] === 0 && gapStart === null) gapStart = y;
          if (rowInk[y] !== 0 && gapStart !== null) {
            if (y-gapStart >= 5) gaps.push(Math.floor((gapStart+y-1)/2));
            gapStart=null;
          }
        }
        if (gapStart !== null) {
          const end=Math.ceil(target+scan.height*.055);
          if(end-gapStart >= 5) gaps.push(Math.floor((gapStart+end-1)/2));
        }
        if (!gaps.length) throw new Error('No clear silhouette row seam ' + r);
        seams.push(gaps.sort((a,b) => Math.abs(a-target)-Math.abs(b-target))[0]);
      }
      seams.push(scan.height);
      const frames = [];
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
        const x0 = Math.round(col * scan.width / 4), x1 = Math.round((col+1) * scan.width / 4);
        const y0 = seams[row], y1 = seams[row+1];
        let minX = x1, minY = y1, maxX = -1, maxY = -1;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          if (pixels[(y * scan.width + x) * 4 + 3] < 128) continue;
          minX = Math.min(minX,x); minY = Math.min(minY,y); maxX = Math.max(maxX,x); maxY = Math.max(maxY,y);
        }
        if (maxX < minX || maxY < minY) throw new Error('Empty cell ' + row + '/' + col);
        if (minX <= x0 || maxX >= x1-1 || minY <= y0 || maxY >= y1-1) throw new Error('Clipped cell ' + row + '/' + col);
        frames.push({ x:minX-2, y:minY-2, width:maxX-minX+5, height:maxY-minY+5 });
      }
      const density = Math.max(...frames.slice(0,4).map(f => f.height)) / 21;
      const board = document.querySelector('#board');
      board.width = mobile ? 390 : 1120; board.height = mobile ? 1160 : 960;
      const ctx = board.getContext('2d');
      ctx.fillStyle = '#14120d'; ctx.fillRect(0,0,board.width,board.height);
      const text = (str,x,y,size=16,color='#e5c78d',align='left') => {
        ctx.font = size + 'px Segoe UI, sans-serif'; ctx.fillStyle=color; ctx.textAlign=align; ctx.fillText(str,x,y);
      };
      const paint = (im,f,density,x,feet,scale) => {
        const w=f.width/density*scale, h=f.height/density*scale;
        ctx.drawImage(im,f.x,f.y,f.width,f.height,x-w/2,feet-h,w,h);
      };
      const original = (index,x,feet,scale=6) => paint(originals[index],refs[index].meta.frames['idle.down'].rect,refs[index].meta.authoredPixelsPerWorldUnit,x,feet,scale);
      text('NICK · B PERSPECTIVE',mobile?18:32,42,mobile?23:29,'#f6d688');
      text('Head and eyes looking along the floor.',mobile?18:32,72,mobile?15:18);
      if (mobile) {
        ['Jay','Doe','Hunter'].forEach((label,i) => { original(i,65+i*130,270,5.4); text(label,65+i*130,295,16,'#d99a38','center'); });
        original(3,95,505,7); paint(study,frames[0],density,292,505,7);
        text('Nick · current',95,535,16,'#c8a66c','center'); text('Nick · B study',292,535,16,'#f6d688','center');
      } else {
        ['Jay','Doe','Hunter','Nick · current'].forEach((label,i) => { const x=125+i*210; original(i,x,325,6.5); text(label,x,358,19,'#d99a38','center'); });
        paint(study,frames[0],density,980,325,6.5); text('Nick · B study',980,358,19,'#f6d688','center');
      }
      const matrixTop=mobile?585:405, firstX=mobile?70:240, step=mobile?90:235, rowStep=mobile?120:120;
      ['Front','Right','Back','Left'].forEach((label,col) => text(label,firstX+col*step,matrixTop, mobile?14:17,'#d99a38','center'));
      ['Idle','Stride A','Stride B','Pardon!'].forEach((label,row) => {
        const top=matrixTop+14+row*rowStep;
        ctx.fillStyle='#211d17'; ctx.fillRect(mobile?18:125,top, mobile?354:945,rowStep-8);
        if(mobile) text(label,24,top+18,11,'#c8a66c'); else text(label,90,top+60,14,'#c8a66c','right');
        for(let col=0;col<4;col++) paint(study,frames[row*4+col],density,firstX+col*step,top+102,mobile?3.1:3.5);
      });
      text('Preview only · Alex follows after Nick approval.',mobile?18:32,board.height-23,mobile?13:16,'#c8a66c');
      return { width:study.width,height:study.height,alphaZeroFraction:transparent/(scan.width*scan.height),seams,density,frames,cells:frames.length,viewport:mobile?'390x844 mobile/touch':'1200x900 desktop',references:'Actual shipped Jay/Doe/Hunter/current Nick PNG frames; never regenerated' };
    }, { base, refs, mobile });
    if(errors.length) throw new Error(name + ': ' + errors.join('\n'));
    await page.locator('#board').screenshot({ path:path.join(out,'nick-b-'+name+'.png') });
    reports.push({ name,...report,errors });
    await page.close();
  }
  fs.writeFileSync(path.join(out,'nick-b-report.json'),JSON.stringify(reports,null,2)+'\n');
  console.log('PASS Nick preview: 16 non-clipped transparent cells; actual cast comparison; desktop + true mobile emulation; no errors.');
}).catch(error => { console.error(error); process.exitCode=1; });
