// Local demo transport: Web Locks serialize same-browser tabs; no cross-device server is connected.
(function(){
 'use strict';
 const prefix='ua-team-room-v7:',listeners=new Set();
 const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 function read(roomId){if(!/^[\w-]{1,80}$/.test(roomId))return null;try{const value=JSON.parse(localStorage.getItem(prefix+roomId)||'null');return value&&value.expiresAt>Date.now()?value:null;}catch(_){return null;}}
 function save(room){localStorage.setItem(prefix+room.id,JSON.stringify(room));listeners.forEach(fn=>fn(room));return room;}
 function create(config,actor,solo){const room=CampaignRoom.create(config,id(),actor,'队长',Date.now(),solo);try{return save(room);}catch(_){throw new Error('浏览器未允许保存房间，请启用本地存储后重试。');}}
 async function dispatch(roomId,action){
  const operation=()=>{const room=read(roomId);if(!room)throw new Error('房间已过期，或不在当前浏览器中。');const next=CampaignRoom.apply(room,{id:id(),...action},Date.now());return next===room?room:save(next);};
  if(navigator.locks)return navigator.locks.request(prefix+roomId,operation);
  if(action.type==='join')throw new Error('当前浏览器不支持多窗口同步，可在原页面添加演示好友体验。');
  return operation();
 }
 window.addEventListener('storage',event=>{if(event.key&&event.key.startsWith(prefix)){const room=read(event.key.slice(prefix.length));if(room)listeners.forEach(fn=>fn(room));}});
 window.RoomStore={id,read,create,dispatch,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
})();
