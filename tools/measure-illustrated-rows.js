// Read-only row-gutter measurement; report cuts, then declare reviewed cuts in the contract.
// node tools/measure-illustrated-rows.js nick alex nazim sam gerald
const art = require('../src/character-art');
const { session } = require('./browser-session');
const families = process.argv.slice(2);
session(async (browser,url) => {
  const page = await browser.newPage(); await page.goto(url);
  for(const family of families) {
    const spec=art.families[family]; if(!spec) throw new Error('Undeclared '+family);
    const report=await page.evaluate(async ({family,rows}) => {
      const im=new Image(); im.src='assets/sprites/'+family+'-illustrated.png'; await im.decode();
      const c=document.createElement('canvas'); c.width=im.width;c.height=im.height;
      const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
      const px=g.getImageData(0,0,c.width,c.height).data, ink=[];let clear=0;
      for(let y=0;y<c.height;y++){let n=0;for(let x=0;x<c.width;x++){const a=px[(y*c.width+x)*4+3];if(!a)clear++;if(a>=128)n++;}ink.push(n);}
      const cuts=[0],gaps=[];
      for(let row=1;row<rows;row++){
        const target=c.height*row/rows, lo=Math.floor(target-c.height*.08),hi=Math.ceil(target+c.height*.08);
        const choices=[];let start=null;
        for(let y=lo;y<=hi;y++){
          if(y<hi&&!ink[y]&&start===null)start=y;
          if((y===hi||ink[y])&&start!==null){if(y-start>=5)choices.push({start,end:y-1,cut:Math.floor((start+y-1)/2)});start=null;}
        }
        if(!choices.length)throw new Error(family+': no safe row gap '+row);
        const gap=choices.sort((a,b)=>Math.abs(a.cut-target)-Math.abs(b.cut-target))[0];gaps.push(gap);cuts.push(gap.cut);
      }
      cuts.push(c.height);
      return {family,width:c.width,height:c.height,rows,rowCuts:cuts,opaqueThreshold:128,gaps,alphaZeroFraction:clear/(c.width*c.height)};
    },{family,rows:spec.rows.length});
    console.log(JSON.stringify(report));
  }
}).catch(e=>{console.error(e);process.exitCode=1;});
