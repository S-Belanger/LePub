# Usage: python -I key-green.py <generated image> <out.png>. Keys a flat #00FF00 background to real alpha with despill. Used for Martine (no Node on that machine).
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(float)
r,g,b = a[...,0],a[...,1],a[...,2]
dom = g - np.maximum(r,b)
alpha = np.clip((200 - dom) / (200 - 40), 0, 1)
bg = np.array([5.,248.,3.])
al = alpha[...,None]
with np.errstate(divide='ignore', invalid='ignore'):
    fg = np.where(al > 0.02, (a - (1-al)*bg) / np.maximum(al, 0.02), a)
fg = np.clip(fg, 0, 255)
# despill: green may not exceed the larger of red/blue by more than a little
cap = np.maximum(fg[...,0], fg[...,2]) + 6
fg[...,1] = np.minimum(fg[...,1], cap)
alpha[alpha < 0.03] = 0
fg[alpha == 0] = 0
rgba = np.dstack([fg, alpha*255]).round().astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(out)
print('saved', out, 'opaque px', int((rgba[...,3]>=128).sum()), 'partial px', int(((rgba[...,3]>0)&(rgba[...,3]<128)).sum()))
