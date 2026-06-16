
// ===== CONFIG =====
const SUPABASE_URL='https://zjsiicjywpqjvpgkxgzx.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqc2lpY2p5d3BxanZwZ2t4Z3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNjYzMzEsImV4cCI6MjA2Mzg0MjMzMX0._1rRuEp6wkXHkdqU-2rNf-FxBVMbuuo6A0ZtBy9wYtY';

// ===== STATE =====
let user=null, bal=0, pts=0, pendingTask=null;
const done=new Set();

// ===== LANG =====
function setLang(l,b){document.body.className='lang-'+l;document.querySelectorAll('.lang-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');}

// ===== TOAST =====
function showToast(m){const t=document.getElementById('toast');document.getElementById('toastMsg').textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200);}

// ===== MODALS =====
function openLogin(){
  const cb=document.getElementById('termsChk');
  const ab=document.getElementById('agreeBtn');
  if(cb)cb.checked=false;
  if(ab){ab.disabled=true;}
  document.getElementById('termsModal').classList.add('open');
}
function goToLogin(){
  document.getElementById('termsModal').classList.remove('open');
  document.getElementById('loginModal').classList.add('open');
}
function closeAll(){
  ['termsModal','loginModal','verifyModal'].forEach(id=>document.getElementById(id).classList.remove('open'));
}

// ===== LOGIN =====
// loginWith() is provided by React (App.jsx) using real Privy auth.
// It calls window.__onPrivyLogin(u) -> onLogin(u) below.

function onLogin(u){
  user=u;
  // Load saved state
  const savedDone=JSON.parse(localStorage.getItem('sf_done_'+u.address)||'[]');
  savedDone.forEach(t=>done.add(t));
  bal=parseInt(localStorage.getItem('sf_bal_'+u.address)||'0');
  pts=parseInt(localStorage.getItem('sf_pts_'+u.address)||'0');

  // Update nav
  document.getElementById('navOut').style.display='none';
  const ni=document.getElementById('navIn');ni.style.display='flex';
  document.getElementById('uAvatar').textContent=u.avatar;
  document.getElementById('uName').textContent=u.name;
  document.getElementById('uAddr').textContent=u.address;
  document.getElementById('uBal').textContent=bal+' SCFI';

  // Wallet bar
  const wb=document.getElementById('walletBar');wb.style.display='block';
  document.getElementById('wAddr').textContent=u.address;
  document.getElementById('wBal').textContent=bal+' SCFI';
  document.getElementById('wPts').textContent=pts+' pts';

  // Enable gift buttons
  ['g10','g15','g50'].forEach(id=>{document.getElementById(id).disabled=false;});

  // Show progress
  document.getElementById('progressWrap').style.display='block';

  // Restore task UI
  restoreTasks();
  updateProgress();

  // Hide early btn, show progress
  document.getElementById('earlyBtn').style.display='none';

  showToast('✅ Chào '+u.name+'! Ví đã sẵn sàng.');
  saveUser(u);
  showKolControls();

  // Hide ALL "Đăng nhập/Đăng ký" buttons after login
  document.getElementById('earlyBtn').style.display = 'none';

  // Check if profile already set up
  const savedProfile = localStorage.getItem('sf_profile_'+u.address);
  if(!savedProfile) {
    // First time — show profile setup
    setTimeout(() => openProfileSetup(u), 800);
  } else {
    const p = JSON.parse(savedProfile);
    u.name = p.username || u.name;
    document.getElementById('uName').textContent = u.name;
    document.getElementById('kolNameEl').textContent = u.name;
  }
}

// Update UI to logged-out state (no Privy call) — used both for manual logout
// and when App.jsx detects Privy session ended externally.
function logoutUserUI(){
  localStorage.removeItem('sf_active_session');
  user=null;bal=0;pts=0;done.clear();
  document.getElementById('navOut').style.display='block';
  document.getElementById('navIn').style.display='none';
  document.getElementById('walletBar').style.display='none';
  document.getElementById('earlyBtn').style.display='block';
  document.getElementById('progressWrap').style.display='none';
  ['g10','g15','g50'].forEach(id=>{document.getElementById(id).disabled=true;});
  restoreTasks();
}
window.logoutUserUI = logoutUserUI;

function logoutUser(){
  logoutUserUI();
  showToast('👋 Đã đăng xuất!');
  // Trigger real Privy logout (set by App.jsx)
  if(window.__privyLogout) window.__privyLogout();
}

// ===== TASKS =====
const taskInst={
  twitter:'1. Bấm nút bên dưới để mở Twitter/X\n2. Follow trang @streamfiapp\n3. Quay lại đây bấm "Đã xong! Nhận SCFI"',
  discord:'1. Bấm nút bên dưới để mở Discord\n2. Bấm Join/Tham gia server StreamFi\n3. Quay lại đây bấm "Đã xong! Nhận SCFI"',
  telegram:'1. Bấm nút bên dưới để mở Telegram\n2. Bấm Join/Tham gia group @StreamFi_App\n3. Quay lại đây bấm "Đã xong! Nhận SCFI"',
  retweet:'1. Bấm nút để mở trang Twitter StreamFi\n2. Retweet bài viết mới nhất\n3. Quay lại đây bấm "Đã xong! Nhận SCFI"',
  invite:'1. Copy link: streamfi-iota.vercel.app\n2. Gửi cho bạn bè và nhờ họ đăng nhập\n3. Quay lại đây bấm "Đã xong! Nhận SCFI"'
};

function doSocialTask(id,name,scfi,link){
  if(!user){openLogin();showToast('🔑 Vui lòng đăng nhập trước!');return;}
  if(done.has(id)){showToast('⚠️ Nhiệm vụ này đã hoàn thành!');return;}
  if(link)window.open(link,'_blank');
  pendingTask={id,name,scfi};
  document.getElementById('vTitle').textContent='🔍 '+name+' (+'+scfi+' SCFI)';
  document.getElementById('vDesc').textContent='Hoàn thành bước sau rồi bấm "Đã xong":';
  document.getElementById('vInst').textContent=taskInst[id]||'Hoàn thành nhiệm vụ rồi bấm Đã xong.';
  document.getElementById('verifyModal').classList.add('open');
}

function confirmTask(){
  if(!pendingTask||!user)return;
  const {id,name,scfi}=pendingTask;
  done.add(id);
  bal+=scfi; pts+=scfi;
  localStorage.setItem('sf_done_'+user.address,JSON.stringify([...done]));
  localStorage.setItem('sf_bal_'+user.address,bal);
  localStorage.setItem('sf_pts_'+user.address,pts);
  // Update UI
  document.getElementById('uBal').textContent=bal+' SCFI';
  document.getElementById('wBal').textContent=bal+' SCFI';
  document.getElementById('wPts').textContent=pts+' pts';
  markTask(id);
  updateProgress();
  document.getElementById('verifyModal').classList.remove('open');
  pendingTask=null;
  showToast('🎉 +'+scfi+' SCFI! '+name+' hoàn thành!');
  addPoints(user.address,scfi,name);
}

function markTask(id){
  const el=document.getElementById('st-'+id);
  const ss=document.getElementById('ss-'+id);
  if(el){el.classList.add('done');el.style.pointerEvents='none';}
  if(ss){ss.textContent='✅ Done';}
}

function restoreTasks(){
  ['twitter','discord','telegram','retweet','invite'].forEach(id=>{
    const el=document.getElementById('st-'+id);
    const ss=document.getElementById('ss-'+id);
    if(done.has(id)){
      if(el){el.classList.add('done');el.style.pointerEvents='none';}
      if(ss)ss.textContent='✅ Done';
    } else {
      if(el){el.classList.remove('done');el.style.pointerEvents=user?'auto':'none';}
      if(ss)ss.textContent='';
    }
  });
}

function updateProgress(){
  const count=done.size;
  const pct=Math.min(count/5*100,100);
  document.getElementById('progressFill').style.width=pct+'%';
  document.getElementById('tasksCount').textContent=count;
  document.getElementById('totalEarned').textContent=bal+' SCFI';
}

// ===== SUPABASE =====
async function saveUser(u){
  try{
    await fetch(SUPABASE_URL+'/rest/v1/users',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({wallet_address:u.address,username:u.name,provider:u.provider,tier:1,points:0})
    });
  }catch(e){console.log('Supabase:',e);}
}

async function addPoints(addr,p,task){
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/users?wallet_address=eq.'+addr+'&select=points',{headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}});
    const d=await r.json();
    if(d&&d[0]){
      await fetch(SUPABASE_URL+'/rest/v1/users?wallet_address=eq.'+addr,{
        method:'PATCH',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
        body:JSON.stringify({points:(d[0].points||0)+p})
      });
    }
  }catch(e){console.log('Points:',e);}
}

// ===== LIVESTREAM =====
const LIVEPEER_PLAYBACK='https://livepeercdn.studio/hls/b5b5nslpak0wwaec/index.m3u8';
let mediaStream=null, isLive=false, viewerInterval=null, chatInterval=null;

// Init HLS viewer
function initViewer(){
  const v=document.getElementById('hlsVideo');
  if(!v)return;
  if(Hls.isSupported()){
    const hls=new Hls({lowLatencyMode:true});
    hls.loadSource(LIVEPEER_PLAYBACK);
    hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED,()=>{
      v.play();
      v.style.display='block';
      document.getElementById('offlineState').style.display='none';
      document.getElementById('liveStatus').textContent='LIVE';
      document.getElementById('viewerCount').textContent=Math.floor(Math.random()*50+10);
      startViewerCounter();
    });
    hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal){showOfflineState();}});
  }
}

function showOfflineState(){
  document.getElementById('hlsVideo').style.display='none';
  document.getElementById('offlineState').style.display='flex';
  document.getElementById('liveStatus').textContent='OFFLINE';
}

// KOL Start Live — uses browser camera
async function startLive(){
  if(!user){openLogin();return;}
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    showToast('❌ Trình duyệt không hỗ trợ camera. Cần HTTPS + Chrome/Edge/Safari mới nhất.');
    return;
  }
  const perm=document.getElementById('camPermission');
  perm.style.display='flex';
  // Safety net: if browser never resolves the prompt, hide overlay after 20s
  const safetyTimer=setTimeout(()=>{perm.style.display='none';},20000);
  try{
    mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:true});
    clearTimeout(safetyTimer);
    perm.style.display='none';
    const cam=document.getElementById('camPreview');
    cam.srcObject=mediaStream;
    cam.style.display='block';
    document.getElementById('offlineState').style.display='none';
    document.getElementById('hlsVideo').style.display='none';
    document.getElementById('goLiveBtn').style.display='none';
    document.getElementById('stopLiveBtn').style.display='flex';
    document.getElementById('liveStatus').textContent='LIVE';
    document.getElementById('liveChip').style.background='var(--red)';
    document.getElementById('streamUrl').textContent='streamfi.app/live/'+user.name.replace('@','').toLowerCase();
    isLive=true;
    startViewerCounter();
    addChatMessage('🎙️ System','Buổi live của bạn đã bắt đầu!','system');
    showToast('🔴 Bạn đang phát LIVE! Camera đã bật.');
  }catch(e){
    clearTimeout(safetyTimer);
    perm.style.display='none';
    if(e.name==='NotAllowedError'){
      showToast('❌ Cần cho phép truy cập camera để live! Kiểm tra biểu tượng 🔒/📷 trên thanh địa chỉ trình duyệt.');
    } else if(e.name==='NotFoundError'){
      showToast('❌ Không tìm thấy camera/microphone trên thiết bị này.');
    } else {
      showToast('❌ Lỗi camera: '+e.message);
    }
  }
}

function stopLive(){
  if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null;}
  document.getElementById('camPreview').style.display='none';
  document.getElementById('camPreview').srcObject=null;
  document.getElementById('goLiveBtn').style.display='block';
  document.getElementById('stopLiveBtn').style.display='none';
  document.getElementById('offlineState').style.display='flex';
  document.getElementById('liveStatus').textContent='OFFLINE';
  document.getElementById('liveChip').style.background='';
  isLive=false;
  if(viewerInterval){clearInterval(viewerInterval);viewerInterval=null;}
  addChatMessage('🎙️ System','Buổi live đã kết thúc. Cảm ơn mọi người!','system');
  showToast('⏹ Đã dừng live.');
}

function startViewerCounter(){
  let v=Math.floor(Math.random()*20+5);
  document.getElementById('viewerCount').textContent=v;
  if(viewerInterval)clearInterval(viewerInterval);
  viewerInterval=setInterval(()=>{
    if(isLive||document.getElementById('hlsVideo').style.display!=='none'){
      v+=Math.floor(Math.random()*5)-2;
      v=Math.max(1,v);
      document.getElementById('viewerCount').textContent=v;
      document.getElementById('chatCount').textContent=v+' online';
    }
  },5000);
}

// Chat
function sendChat(){
  if(!user){showToast('🔑 Đăng nhập để chat!');return;}
  const inp=document.getElementById('chatInput');
  const msg=inp.value.trim();
  if(!msg)return;
  addChatMessage(user.name,msg,'user');
  inp.value='';
}

function addChatMessage(name,msg,type){
  const chat=document.getElementById('chatMsgs');
  const d=document.createElement('div');
  if(type==='donate'){
    d.className='cmsg cdonate';
    d.innerHTML='<div class="cu">'+name+'</div><div>'+msg+'</div>';
  } else if(type==='system'){
    d.className='cmsg';
    d.innerHTML='<span style="color:var(--accent2);font-size:11px;">'+name+'</span> <span style="font-size:12px;color:var(--muted);">'+msg+'</span>';
  } else {
    d.className='cmsg';
    d.innerHTML='<span class="cu">'+name+':</span> <span style="font-size:12px;">'+msg+'</span>';
  }
  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;
  if(chat.children.length>20)chat.removeChild(chat.children[0]);
}

// Donate effects
function showDonateEffect(emoji,amount,name){
  const el=document.getElementById('donateEffects');
  const d=document.createElement('div');
  d.style.cssText='font-size:13px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:20px;padding:4px 10px;color:var(--green);font-family:Space Mono,monospace;animation:floatUp 3s ease forwards;';
  d.textContent=emoji+' '+name+' +'+amount+' SCFI';
  el.appendChild(d);
  setTimeout(()=>d.remove(),3000);
}

// Show KOL controls after login
function showKolControls(){
  const kc=document.getElementById('kolControls');
  if(kc){kc.style.display='block';}
  if(user){
    document.getElementById('kolAvatarEl').textContent=user.avatar||'🎤';
    document.getElementById('kolNameEl').textContent=user.name;
  }
}

// ===== CHAT SEND =====
const chatNames=['@web3fan','@cryptolover','@streamfi_vn','@hodler','@nftcollector'];
function sendGift(amt,emoji){
  if(!user){openLogin();return;}
  if(bal<amt){showToast('❌ Số dư không đủ! Cần '+amt+' SCFI');return;}
  bal-=amt;
  document.getElementById('uBal').textContent=bal+' SCFI';
  document.getElementById('wBal').textContent=bal+' SCFI';
  localStorage.setItem('sf_bal_'+user.address,bal);
  addChatMessage(user.name,'→ <span class="camt">'+amt+' SCFI</span> '+emoji,'donate');
  showDonateEffect(emoji,amt,user.name);
  const vc=document.getElementById('viewerCount');
  vc.textContent=(parseInt(vc.textContent.replace(',',''))+Math.floor(Math.random()*3+1)).toLocaleString();
  showToast(emoji+' Donated '+amt+' SCFI!');
  if(!done.has('donate')){
    done.add('donate');
    bal+=15;pts+=15;
    localStorage.setItem('sf_done_'+user.address,JSON.stringify([...done]));
    localStorage.setItem('sf_bal_'+user.address,bal);
    document.getElementById('uBal').textContent=bal+' SCFI';
    document.getElementById('wBal').textContent=bal+' SCFI';
    setTimeout(()=>showToast('🎉 +15 SCFI bonus lần donate đầu tiên!'),1000);
  }
}

// ===== PROFILE SETUP =====
function openProfileSetup(u) {
  // Fill wallet info
  document.getElementById('profileWalletAddr').textContent = u.address;
  // Pre-fill social if logged in via social
  if(u.provider==='twitter') document.getElementById('profileTwitter').value = u.name;
  if(u.provider==='discord') document.getElementById('profileDiscord').value = u.name;
  if(u.provider==='tiktok') document.getElementById('profileTiktok').value = u.name;
  // Show/hide required social for web3 wallet users
  const isWeb3 = ['metamask','phantom'].includes(u.provider);
  document.getElementById('socialRequired').style.display = isWeb3 ? 'inline' : 'none';
  document.getElementById('profileModal').classList.add('open');
}

function previewAvatar(input) {
  if(input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('profileAvatarPreview').innerHTML = '<img src="'+e.target.result+'" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function checkUsername(input) {
  const val = input.value.trim();
  const status = document.getElementById('usernameStatus');
  if(val.length < 3) { status.textContent = ''; return; }
  if(/^[a-zA-Z0-9_@]+$/.test(val)) {
    status.style.color = 'var(--green)';
    status.textContent = '✓ Username hợp lệ';
  } else {
    status.style.color = 'var(--red)';
    status.textContent = '✗ Chỉ dùng chữ, số, _ và @';
  }
}

// Real Privy wallet export (set by App.jsx)
function exportPrivyWallet() {
  if(window.__privyExportWallet) {
    window.__privyExportWallet();
  } else {
    showToast('⚠️ Export ví chỉ khả dụng cho ví được tạo bởi Privy (Google/X/Discord/TikTok).');
  }
}

function saveProfile() {
  const username = document.getElementById('profileUsername').value.trim();
  const antiBot = document.getElementById('antiBotCheck').checked;
  const twitter = document.getElementById('profileTwitter').value.trim();
  const discord = document.getElementById('profileDiscord').value.trim();
  const tiktok = document.getElementById('profileTiktok').value.trim();
  const isWeb3 = user && ['metamask','phantom'].includes(user.provider);

  if(!username || username.length < 3) { showToast('⚠️ Vui lòng nhập username (ít nhất 3 ký tự)!'); return; }
  if(!antiBot) { showToast('⚠️ Vui lòng xác nhận điều khoản chống gian lận!'); return; }
  if(isWeb3 && !twitter && !discord && !tiktok) { showToast('⚠️ Ví Web3 cần liên kết ít nhất 1 mạng xã hội!'); return; }

  // Save profile
  const profile = { username, twitter, discord, tiktok, completed: true };
  localStorage.setItem('sf_profile_'+user.address, JSON.stringify(profile));

  // Update user name display
  user.name = username;
  document.getElementById('uName').textContent = username;
  document.getElementById('kolNameEl').textContent = username;

  // Persist updated name in the saved session
  const sessionKey='sf_session_'+user.provider;
  const savedSession=JSON.parse(localStorage.getItem(sessionKey)||'null');
  if(savedSession){savedSession.name=username;localStorage.setItem(sessionKey,JSON.stringify(savedSession));}

  // Save to Supabase
  saveUserProfile(user.address, profile);

  document.getElementById('profileModal').classList.remove('open');
  showToast('🎉 Hồ sơ đã lưu! Chào mừng '+username+' đến StreamFi!');

  // Give bonus for completing profile
  bal += 20; pts += 20;
  localStorage.setItem('sf_bal_'+user.address, bal);
  localStorage.setItem('sf_pts_'+user.address, pts);
  document.getElementById('uBal').textContent = bal+' SCFI';
  document.getElementById('wBal').textContent = bal+' SCFI';
  setTimeout(()=>showToast('🎁 +20 SCFI thưởng hoàn thành hồ sơ!'), 1500);
}

async function saveUserProfile(addr, profile) {
  try {
    await fetch(SUPABASE_URL+'/rest/v1/users?wallet_address=eq.'+addr, {
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},
      body:JSON.stringify({
        username: profile.username,
        twitter_handle: profile.twitter,
        discord_handle: profile.discord,
        tiktok_handle: profile.tiktok,
        profile_completed: true
      })
    });
  } catch(e){ console.log('Profile save:',e); }
}

// ===== INIT =====
// Called by App.jsx after dangerouslySetInnerHTML mounts the DOM
function initApp() {
  document.body.className = 'lang-vi';
  // Attach overlay click-to-close listeners
  document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', function(e) {
    if (e.target === this && this.id !== 'profileModal') closeAll();
  }));
  initViewer();
}
window.initApp = initApp;
// Required because legacy.js is loaded as type="module" (scoped).
// All onclick="fn()" handlers in body.html need window.fn to work.
// Note: window.loginWith is set by App.jsx (real Privy bridge).
Object.assign(window, {
  openLogin,
  goToLogin,
  closeAll,
  logoutUser,
  logoutUserUI,
  onLogin,
  setLang,
  showToast,
  doSocialTask,
  confirmTask,
  sendChat,
  sendGift,
  startLive,
  stopLive,
  saveProfile,
  checkUsername,
  previewAvatar,
  exportPrivyWallet,
  initViewer,
});
