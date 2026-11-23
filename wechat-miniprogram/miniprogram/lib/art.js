const spot=require('./spot');
function base64(text) { const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', bytes=Array.from(text,c=>c.charCodeAt(0));let out='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out+=chars[n>>>18&63]+chars[n>>>12&63]+(i+1<bytes.length?chars[n>>>6&63]:'=')+(i+2<bytes.length?chars[n&63]:'=');}return out; }
function svg(state,side='a') {
  const palettes=[['#e8f5ff','#f7edd3','#d8e9cb'],['#ece9ff','#efe2f3','#d7cbee'],['#e2f5fa','#f6ead3','#d2e8e9']], palette=palettes[state.seed%3];
  const scenery='<rect width="600" height="360" rx="24" fill="'+palette[0]+'"/><path d="M0 109Q90 82 200 106T400 98T600 112V360H0Z" fill="'+palette[2]+'"/><path d="M0 210Q120 180 270 209T600 203V360H0Z" fill="'+palette[1]+'"/><path d="M130 91V340M280 91V340M435 91V340" stroke="#fff" stroke-width="2" opacity=".35"/><path d="M18 232H584" stroke="#fff" stroke-width="2" opacity=".5"/>';
  const objects=state.objects.map(o=>'<g transform="translate('+o.x+' '+o.y+')">'+spot.shapes(o.id,side==='b'&&state.changed.includes(o.id),state.level).map(s=>s.type==='rect'?'<rect x="'+s.x+'" y="'+s.y+'" width="'+s.w+'" height="'+s.h+'" rx="'+s.r+'" fill="'+s.c+'"/>':'<ellipse cx="'+s.x+'" cy="'+s.y+'" rx="'+s.rx+'" ry="'+s.ry+'" fill="'+s.c+'"/>').join('')+'</g>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">'+scenery+objects+'</svg>';
}
function image(state,side) {return 'data:image/svg+xml;base64,'+base64(svg(state,side));}
module.exports={svg,image};
