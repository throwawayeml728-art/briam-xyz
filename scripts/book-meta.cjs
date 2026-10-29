// Samples each local cover (aspect ratio + dominant/edge colors) for the generated spines.
const sharp=require('sharp'),fs=require('fs'),path=require('path')
;(async()=>{const dir=path.join(__dirname,'../public/books'),out={}
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.webp'))){const img=sharp(path.join(dir,f));const m=await img.metadata()
const edge=await sharp(path.join(dir,f)).extract({left:0,top:0,width:Math.max(2,Math.round(m.width*.08)),height:m.height}).resize(1,1).raw().toBuffer()
const {dominant}=await sharp(path.join(dir,f)).stats()
const hex=a=>'#'+[...a].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('')
out['/books/'+f]={ratio:+(m.width/m.height).toFixed(4),edge:hex(edge),dominant:hex([dominant.r,dominant.g,dominant.b])}}
fs.writeFileSync(path.join(__dirname,'../data/book-meta.json'),JSON.stringify(out,null,1)+'\n')})()
