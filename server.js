// JavaScript / Node.js 20+ / WebSocket signaling server
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { WebSocketServer, WebSocket } = require("ws");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = path.join(__dirname, "public");
const rooms = new Map();
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".svg":"image/svg+xml", ".ico":"image/x-icon", ".png":"image/png", ".webmanifest":"application/manifest+json; charset=utf-8", ".json":"application/json; charset=utf-8" };
const server = http.createServer((req,res) => {
  const pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  if (pathname === "/healthz") { res.writeHead(200, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}); return res.end(JSON.stringify({ok:true, service:"zyon-cast-pro"})); }
  const file = path.resolve(ROOT, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file,(err,data) => {
    if(err){res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});return res.end("Not found");}
    res.writeHead(200,{"Content-Type":MIME[path.extname(file)]||"application/octet-stream","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Permissions-Policy":"camera=(), microphone=(self), display-capture=(self)","Cache-Control":"no-store"});
    res.end(data);
  });
});
const wss = new WebSocketServer({server,maxPayload:1024*1024});
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function broadcast(room,sender,obj){for(const peer of room.clients)if(peer!==sender)send(peer,obj);}
wss.on("connection",ws=>{
  ws.id=crypto.randomUUID();ws.roomCode=null;ws.role=null;
  ws.on("message",raw=>{
    let msg;try{msg=JSON.parse(raw.toString())}catch{return send(ws,{type:"error",message:"Mensagem inválida."})}
    if(msg.type==="join"){
      const code=String(msg.room||"").trim().toUpperCase();
      if(!/^[A-Z0-9]{4,12}$/.test(code))return send(ws,{type:"error",message:"Código inválido (4–12 letras/números)."});
      let room=rooms.get(code);if(!room){room={clients:new Set(),broadcaster:null};rooms.set(code,room)}
      if(room.clients.size>=2)return send(ws,{type:"error",message:"Sala cheia (máximo de 2 participantes)."});
      if(room.clients.size===0){room.broadcaster=ws;ws.role="host"}else ws.role="viewer";
      room.clients.add(ws);ws.roomCode=code;send(ws,{type:"joined",role:ws.role,room:code});
      broadcast(room,ws,{type:"peer-joined",role:ws.role});
      if(ws.role==="viewer"&&room.broadcaster)send(room.broadcaster,{type:"viewer-ready"});
      return;
    }
    if(!ws.roomCode)return send(ws,{type:"error",message:"Entre em uma sala primeiro."});
    const room=rooms.get(ws.roomCode);if(room&&["offer","answer","ice","hangup"].includes(msg.type))broadcast(room,ws,{type:msg.type,data:msg.data});
  });
  ws.on("close",()=>{
    if(!ws.roomCode)return;const room=rooms.get(ws.roomCode);if(!room)return;
    room.clients.delete(ws);broadcast(room,ws,{type:"peer-left"});
    if(room.clients.size===0)rooms.delete(ws.roomCode);else if(room.broadcaster===ws)room.broadcaster=null;
  });
});
server.listen(PORT,HOST,()=>console.log(`Zyon Cast Pro em http://${HOST}:${PORT}`));