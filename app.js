// JavaScript / Browser / WebRTC screen and microphone streaming
"use strict";
const $=id=>document.getElementById(id);
const roomInput=$("roomCode"),video=$("remoteVideo");
let socket=null,pc=null,localStream=null,joined=false,role=null,micEnabled=true,peerPresent=false,toastTimer=null,profileName="Zyon",profileUrl=null;
const defaultAvatar=(letter="Z",color="#7464ed")=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#16b8d5"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(#g)"/><text x="50" y="66" font-size="49" text-anchor="middle" fill="white" font-family="Arial">${letter}</text></svg>`)}`;
const rtcConfig={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun.cloudflare.com:3478"}]};
function toast(s){const e=$("toast");e.textContent=s;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),2600)}
function setStatus(s){$("connectionText").textContent=s;$("dockStatus").textContent=joined?(role==="host"?"Transmitindo / conectado":"Assistindo / conectado"):"Não conectado"}
function badge(s){$("liveText").textContent=s}
function roomCode(){return roomInput.value.trim().toUpperCase()}
function roomName(){return "sala-"+roomCode().toLowerCase()}
function updateRoomLabels(){const n=roomName();["navRoomName","topRoomName","dockRoom"].forEach(id=>$(id).textContent=n);$("codeLabel").textContent=roomCode()}
function openModal(id){$(id).hidden=false}
function closeModal(id){$(id).hidden=true}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(b=>b.addEventListener("click",e=>{if(e.target===b)b.hidden=true}));
$("createRoom").addEventListener("click",()=>{roomInput.value=randomCode();updateRoomLabels();openModal("roomModal")});
$("newRoomShortcut").addEventListener("click",()=>{roomInput.value=randomCode();updateRoomLabels();openModal("roomModal")});
$("roomNav").addEventListener("click",()=>openModal("roomModal"));
$("randomBtn").addEventListener("click",()=>{roomInput.value=randomCode();updateRoomLabels()});
function randomCode(){return "ZY"+Math.random().toString(36).slice(2,7).toUpperCase()}
function wsUrl(){return `${location.protocol==="https:"?"wss":"ws"}://${location.host}`}
function setJoined(v){joined=v;$("joinBtn").disabled=v;$("leaveBtn").disabled=!v;$("shareBtn").disabled=!v||role!=="host";$("micBtn").disabled=!v||role!=="host";$("modalJoinBtn").disabled=v}
function joinRoom(){
 const code=roomCode();if(!/^[A-Z0-9]{4,12}$/.test(code)){toast("Use um código de 4 a 12 letras ou números.");return}
 if(joined)return;
 if(!("WebSocket"in window)||!("RTCPeerConnection"in window)){toast("Este navegador não suporta WebRTC.");return}
 updateRoomLabels();$("modalJoinBtn").disabled=true;setStatus("Conectando ao servidor…");
 socket=new WebSocket(wsUrl());
 socket.onopen=()=>socket.send(JSON.stringify({type:"join",room:code}));
 socket.onmessage=async ev=>{let m;try{m=JSON.parse(ev.data)}catch{return}
  try{switch(m.type){
   case"joined":role=m.role;setJoined(true);closeModal("roomModal");badge(role==="host"?"SALA ABERTA":"CONECTADO");$("streamerName").textContent=role==="host"?profileName:"Aguardando transmissor";$("streamerSub").textContent=role==="host"?"Você é o transmissor":"Você entrou como espectador";$("selfParticipantState").textContent=role==="host"?"Online · transmissor":"Online · espectador";$("stageStatus").textContent=role==="host"?"PRONTO PARA TRANSMITIR":"AGUARDANDO TRANSMISSOR";$("participantCount").textContent="1";setStatus(role==="host"?"Sala criada. Envie o convite e compartilhe sua tela.":"Conectado à sala. Aguardando a transmissão.");if(role==="viewer"){$("shareBtn").disabled=true;$("micBtn").disabled=true}break;
   case"peer-joined":peerPresent=true;showPeer(true);toast("Participante conectado.");if(role==="host"&&localStream)await makeOffer();break;
   case"viewer-ready":peerPresent=true;showPeer(true);if(role==="host"&&localStream)await makeOffer();else setStatus("Espectador conectado. Inicie a captura de tela.");break;
   case"offer":if(role==="viewer")await acceptOffer(m.data);break;
   case"answer":if(pc)await pc.setRemoteDescription(m.data);break;
   case"ice":if(pc&&m.data){try{await pc.addIceCandidate(m.data)}catch(e){console.warn("ICE:",e)}}break;
   case"peer-left":peerPresent=false;closePeer();showPeer(false);if(role==="viewer"){video.classList.remove("visible");$("emptyState").style.display="flex";badge("CONECTADO")}setStatus("O outro participante saiu da sala.");break;
   case"error":toast(m.message||"Erro no servidor.");$("modalJoinBtn").disabled=false;break;
  }}catch(e){console.error(e);toast("Falha WebRTC: "+(e.message||"erro"))}
 };
 socket.onerror=()=>{toast("Falha de conexão. Verifique o servidor.");$("modalJoinBtn").disabled=false;setStatus("Erro de conexão.")};
 socket.onclose=()=>{if(joined)setStatus("Servidor desconectado.")};
}
$("joinBtn").addEventListener("click",()=>openModal("roomModal"));
$("modalJoinBtn").addEventListener("click",joinRoom);
$("roomCode").addEventListener("keydown",e=>{if(e.key==="Enter")joinRoom()});
function showPeer(on){$("peerParticipant").hidden=!on;$("participantCount").textContent=on?"2":"1";if(on){$("peerName").textContent=role==="host"?"Espectador":"Transmissor";$("peerState").textContent=role==="host"?"Conectado à sala":"Transmitindo quando disponível"}}
function signal(type,data){if(socket&&socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,data}))}
function ensurePeer(){if(pc)return pc;pc=new RTCPeerConnection(rtcConfig);pc.onicecandidate=e=>{if(e.candidate)signal("ice",e.candidate)};pc.onconnectionstatechange=()=>{if(!pc)return;const s=pc.connectionState;if(s==="connected"){badge("AO VIVO");$("stageStatus").textContent="TRANSMISSÃO AO VIVO";$("qualityValue").textContent="Conectado";$("qualityMeter").style.width="86%";$("transportValue").textContent="WebRTC · P2P";$("audioValue").textContent="Faixa de áudio ativa";setStatus("Mídia conectada via WebRTC.")}if(s==="failed"){setStatus("Conexão falhou; algumas redes exigem um servidor TURN.")}};pc.ontrack=e=>{video.srcObject=e.streams?.[0]||new MediaStream([e.track]);video.classList.add("visible");$("emptyState").style.display="none";$("stageStatus").textContent="TRANSMISSÃO AO VIVO";$("streamHeading").textContent="Tela compartilhada ao vivo";badge("AO VIVO");video.play().catch(()=>{})};return pc}
async function makeOffer(){if(!localStream||!peerPresent)return;const p=ensurePeer();for(const t of localStream.getTracks())if(!p.getSenders().some(s=>s.track===t))p.addTrack(t,localStream);const o=await p.createOffer();await p.setLocalDescription(o);signal("offer",p.localDescription)}
async function acceptOffer(o){const p=ensurePeer();await p.setRemoteDescription(o);const a=await p.createAnswer();await p.setLocalDescription(a);signal("answer",p.localDescription)}
async function shareScreen(){if(!joined||role!=="host")return;if(!navigator.mediaDevices?.getDisplayMedia||!navigator.mediaDevices?.getUserMedia){toast("Captura exige navegador compatível e HTTPS (ou localhost).");return} $("shareBtn").disabled=true;try{const screen=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:30,max:60},width:{ideal:1920},height:{ideal:1080}},audio:false});let mic;try{mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false},video:false})}catch{screen.getTracks().forEach(t=>t.stop());throw Error("Permita o acesso ao microfone para iniciar a transmissão.")}localStream=new MediaStream([...screen.getVideoTracks(),...mic.getAudioTracks()]);video.srcObject=screen;video.classList.add("visible");$("emptyState").style.display="none";$("stageStatus").textContent="PRÉVIA LOCAL";$("streamHeading").textContent="Sua tela";$("streamerName").textContent=profileName;$("streamerSub").textContent="Transmitindo tela e microfone";$("streamerAvatar").src=profileUrl||defaultAvatar(profileName[0].toUpperCase());$("selfParticipantState").textContent="Online · ao vivo";$("qualityValue").textContent="Captura ativa";$("qualityMeter").style.width="65%";badge("AO VIVO");$("shareBtn").classList.add("active");setStatus(peerPresent?"Captura ativa. Negociando conexão de mídia…":"Captura ativa. Aguardando espectador.");screen.getVideoTracks()[0].addEventListener("ended",stopSharing);updateMic();if(peerPresent)await makeOffer()}catch(e){toast(e.message||"Captura cancelada.");$("shareBtn").disabled=false}}
$("shareBtn").addEventListener("click",shareScreen);$("emptyShare").addEventListener("click",()=>joined&&role==="host"?shareScreen():openModal("roomModal"));
function updateMic(){const t=localStream?.getAudioTracks()||[];t.forEach(x=>x.enabled=micEnabled);$("micBtn").classList.toggle("muted",!micEnabled);$("micBtn").title=micEnabled?"Silenciar microfone":"Ativar microfone";$("selfMicState").textContent=micEnabled?"♩":"×";$("selfMicState").style.color=micEnabled?"var(--green)":"#ed7583"}
$("micBtn").addEventListener("click",()=>{micEnabled=!micEnabled;updateMic();toast(micEnabled?"Microfone ligado":"Microfone silenciado")});
function closePeer(){if(pc){pc.ontrack=null;pc.close();pc=null}}
function stopSharing(){if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}closePeer();video.srcObject=null;video.classList.remove("visible");$("emptyState").style.display="flex";$("stageStatus").textContent="AGUARDANDO SINAL";$("streamHeading").textContent="Tela compartilhada";$("shareBtn").classList.remove("active");$("shareBtn").disabled=!joined||role!=="host";$("qualityValue").textContent="Aguardando";$("qualityMeter").style.width="0";badge(joined?"SALA ABERTA":"PRONTO");setStatus("Compartilhamento encerrado.")}
$("leaveBtn").addEventListener("click",leaveRoom);
function leaveRoom(){stopSharing();if(socket){try{signal("hangup");socket.close()}catch{}socket=null}setJoined(false);role=null;peerPresent=false;showPeer(false);badge("PRONTO");$("streamerName").textContent="Aguardando transmissor";$("streamerSub").textContent="A sala está pronta para conectar";$("stageStatus").textContent="AGUARDANDO SINAL";setStatus("Você saiu da sala.");toast("Sessão encerrada.")}
async function copyInvite(){const u=new URL(location.href);u.searchParams.set("room",roomCode()||"ZYON24");try{await navigator.clipboard.writeText(u.toString());toast("Convite copiado.")}catch{prompt("Copie o link do convite:",u.toString())}}
$("copyInvite").addEventListener("click",copyInvite);$("copyCode").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(roomCode());toast("Código copiado.")}catch{toast("Código da sala: "+roomCode())}});
$("fullscreenBtn").addEventListener("click",()=>{const target=$("streamStage");if(document.fullscreenElement)document.exitFullscreen?.();else target.requestFullscreen?.()});
function applyProfile(){const src=profileUrl||defaultAvatar(profileName[0].toUpperCase());["myAvatar","selfParticipantAvatar","streamerAvatar","profilePreview"].forEach(id=>$(id).src=src);$("myName").textContent=profileName;$("selfParticipantName").innerHTML=`${escapeHtml(profileName)} <span class="you-tag">VOCÊ</span>`;if(role==="host")$("streamerName").textContent=profileName}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openProfile(){ $("profileName").value=profileName;applyProfile();openModal("profileModal")}
$("avatarEdit").addEventListener("click",openProfile);$("userSettings").addEventListener("click",openProfile);$("editNameBtn").addEventListener("click",openProfile);$("openSettings").addEventListener("click",openProfile);$("profilePhotoBtn").addEventListener("click",()=>$("avatarFile").click());
$("avatarFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/"))return toast("Escolha um arquivo de imagem.");if(f.size>8*1024*1024)return toast("A imagem deve ter até 8 MB.");if(profileUrl)URL.revokeObjectURL(profileUrl);profileUrl=URL.createObjectURL(f);applyProfile()});
$("saveProfile").addEventListener("click",()=>{const n=$("profileName").value.trim();if(!n)return toast("Digite um nome.");profileName=n.slice(0,24);applyProfile();closeModal("profileModal");toast("Perfil atualizado.")});
const initialRoom=new URLSearchParams(location.search).get("room");if(initialRoom&&/^[A-Za-z0-9]{4,12}$/.test(initialRoom))roomInput.value=initialRoom.toUpperCase();updateRoomLabels();applyProfile();
window.addEventListener("beforeunload",()=>{if(socket)socket.close();if(localStream)localStream.getTracks().forEach(t=>t.stop());if(profileUrl)URL.revokeObjectURL(profileUrl)});
