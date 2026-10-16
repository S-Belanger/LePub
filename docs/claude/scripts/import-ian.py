# Python port of tools/import-illustrated.js for the ian family (hard-coded paths/contract). Prefer the Node importer where Node exists.
import json, numpy as np
from PIL import Image
im = np.asarray(Image.open('C:/Projets/Perso/LePub/assets/sprites/ian-illustrated.png')); H,W = im.shape[:2]
alpha = im[...,3]
rows = ['idle','walkA','walkB','special']; dirs=['down','right','up','left']
def rnd(v): import math; return math.floor(v+0.5)   # JS Math.round
cuts = [rnd(i*H/4) for i in range(5)]
frames={}; hs=[]
for row in range(4):
    for col in range(4):
        x0,x1 = rnd(col*W/4), rnd((col+1)*W/4); y0,y1 = cuts[row], cuts[row+1]
        cell = alpha[y0:y1, x0:x1]
        ys,xs = np.nonzero(cell>=128)
        edge = (cell[0,:]>=128).sum()+(cell[-1,:]>=128).sum()+(cell[:,0]>=128).sum()+(cell[:,-1]>=128).sum()
        transp = (cell==0).mean()
        left,right,top,bottom = xs.min()+x0, xs.max()+x0, ys.min()+y0, ys.max()+y0
        assert edge==0 and transp>=0.2, (row,col,edge,transp)
        x=max(x0,left-2); y=max(y0,top-2)
        rect=dict(x=int(x),y=int(y),width=int(min(x1,right+3)-x),height=int(min(y1,bottom+3)-y))
        pivot=dict(x=(x0+x1)/2-x, y=int(bottom+1-y))
        frames[f'{rows[row]}.{dirs[col]}']=dict(rect=rect,pivot=pivot)
print('cuts',cuts)
height=max(frames[f'idle.{d}']['rect']['height'] for d in dirs); density=height/21
print('idle heights',[frames[f'idle.{d}']['rect']['height'] for d in dirs],'density',density)
anims={}
walk=['walkA','idle','walkB','idle']
for d in dirs:
    for pose,seq in {'idle':['idle'],'walk':walk,'confused':['special']}.items():
        ids=[f'{r}.{d}' for r in seq]
        anims[f'{pose}.{d}']=dict(loop=len(ids)>1,sequence=[dict(frameId=i,durationMs=160 if len(ids)>1 else 1000) for i in ids])
meta=dict(schemaVersion=1,assetId='lepub.ian.illustrated',image='ian-illustrated.png',imageSize=dict(width=W,height=H),
  frameSpace='untrimmed-source-pixels',pivotSpace='frame-local-pixels',authoredPixelsPerWorldUnit=density,alphaPolicy='translucent',
  palettePolicy='illustrated-reference',fallbackKey='ian',directions=dirs,
  provenance='Gemini image generation from a reference board (identity crop + Jay + Nick B); green keyed to alpha and figures re-laid on a 4x4 sheet by script; walk B row and confused right/UP are mirrored cells (see docs/claude/ian-brief.md). Bounds measured by a Python port of tools/import-illustrated.js.',
  frames=frames,animations=anims)
json.dump(meta,open('C:/Projets/Perso/LePub/assets/sprites/ian-illustrated.json','w'),indent=2); open('C:/Projets/Perso/LePub/assets/sprites/ian-illustrated.json','a').write('\n')
print('frames',len(frames))
