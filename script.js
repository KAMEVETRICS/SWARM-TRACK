const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const highScoreEl = document.getElementById('highScore');
const DPR = window.devicePixelRatio || 1;

let W, H, laneW, lanesX, gradient;
let touchStartX = 0;
let running = false, frame = 0, score = 0, high = +localStorage.getItem('trackrunner_high') || 0;
hud.textContent = `High: ${high}`;

const G = { baseSpeed: 3, maxSpeed: 20, speed: 3, laneCount: 4, spawnInterval: 80, speedUpRate: 0.0025, accel: 0.004 };

const car = { lane: 1, x: 0, y: 0, w: 0, h: 0, targetX: 0 };
const obstacles = [];
const playerImg = new Image();
playerImg.src = 'images/bee2.png';
const obstacleImgs = ['images/owl.png','images/bear.png','images/bird.png'].map(src => {
  const img = new Image(); img.src = src; return img;
});

/* ---- Resize ---- */
function resize(){
  const rect = canvas.getBoundingClientRect();
  W = rect.width; H = rect.height;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);

  laneW = Math.min(160, W / G.laneCount);
  lanesX = Array.from({length: G.laneCount}, (_,i) =>
    (W/2) - ((G.laneCount/2 - 0.5)*laneW) + i*laneW
  );
  gradient = ctx.createLinearGradient(0,0,0,H);
  gradient.addColorStop(0,'#1a0f0a'); gradient.addColorStop(1,'#000');

  // Calculate responsive player size based on canvas dimensions
  car.w = Math.min(80, laneW * 0.6);
  car.h = car.w * 1.5; // Maintain aspect ratio
  
  car.x = lanesX[1];
  car.targetX = car.x;
  car.y = H - car.h - 20;
}
window.addEventListener('resize', resize);
resize();

/* ---- Input ---- */
function move(dir){
  car.lane = Math.max(0, Math.min(G.laneCount-1, car.lane + dir));
  car.targetX = lanesX[car.lane];
}
document.addEventListener('keydown', e=>{
  if(e.code==='ArrowLeft') move(-1);
  else if(e.code==='ArrowRight') move(1);
  else if(e.code==='Space' && !running) start();
});

// Touch handling for mobile swipe gestures
canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  if(!running){ start(); return; }
  touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchend', e=>{
  e.preventDefault();
  if(!running) return;
  const touchEndX = e.changedTouches[0].clientX;
  const dx = touchEndX - touchStartX;
  if(Math.abs(dx) > 50) move(dx < 0 ? -1 : 1);
});

// Also support tap-to-move on mobile
canvas.addEventListener('click', e=>{
  if(!running) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const canvasCenter = W / 2;
  if(clickX < canvasCenter) move(-1);
  else move(1);
});

/* ---- Obstacles ---- */
function spawnObstacle(){
  const lane = Math.floor(Math.random() * G.laneCount);
  const x = lanesX[lane];
  const w = laneW * 0.7;
  const h = 60 + Math.random()*40;
  const img = obstacleImgs[Math.floor(Math.random()*obstacleImgs.length)];
  obstacles.push({ x: x - w/2, y: -h, w, h, img });
}
function rectsCollide(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ---- Draw ---- */
function draw(){
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,W,H);

  // Lane markers
  ctx.fillStyle = 'rgba(139, 69, 19, 0.2)';
  const offset = (frame*G.speed)%60;
  for(let i=1;i<G.laneCount;i++){
    const sx = W/2 - (G.laneCount/2)*laneW + i*laneW;
    for(let y=-offset;y<H;y+=60) ctx.fillRect(sx-2, y, 4, 30);
  }

  // Obstacles
  for(const ob of obstacles){
    if(ob.img.complete) ctx.drawImage(ob.img, ob.x, ob.y, ob.w, ob.h);
    else { ctx.fillStyle = '#8b4513'; ctx.fillRect(ob.x, ob.y, ob.w, ob.h); }
  }

  // Player
  if(playerImg.complete)
    ctx.drawImage(playerImg, car.x - car.w/2, car.y - car.h/2, car.w, car.h);
  else {
    ctx.fillStyle = 'rgba(210, 105, 30, 0.9)';
    ctx.fillRect(car.x - car.w/2, car.y - car.h/2, car.w, car.h);
  }
}

/* ---- Update ---- */
function update(){
  frame++;
  if(frame % G.spawnInterval === 0) spawnObstacle();

  // Continuously accelerate speed over time while capped by maxSpeed
  G.speed = Math.min(G.maxSpeed, G.speed + G.accel);

  for(let i=obstacles.length-1;i>=0;i--){
    const ob = obstacles[i];
    ob.y += G.speed;
    if(ob.y > H + 100) obstacles.splice(i,1);
    if(rectsCollide({x:car.x-car.w/2,y:car.y-car.h/2,w:car.w,h:car.h}, ob))
      return gameOver();
  }

  car.x += (car.targetX - car.x) * 0.2;
  const newScore = Math.floor(score += 0.1 + G.speed/100);
  if(newScore !== Math.floor(score-1)) scoreEl.textContent = `Score: ${newScore}`;
}

/* ---- Loop ---- */
function loop(){
  if(!running) return;
  update(); draw();
  requestAnimationFrame(loop);
}

/* ---- Game Flow ---- */
function start(){
  running = true;
  frame = 0; score = 0; obstacles.length = 0;
  G.speed = G.baseSpeed;
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  loop();
}
function gameOver(){
  running = false;
  const sc = Math.floor(score);
  if(sc > high){ high = sc; localStorage.setItem('trackrunner_high', high); }
  hud.textContent = `High: ${high}`;
  finalScoreEl.textContent = `Score: ${sc}`;
  highScoreEl.textContent = `High Score: ${high}`;
  setTimeout(()=>gameOverOverlay.classList.remove('hidden'), 300);
}
document.getElementById('startBtn').onclick = start;
document.getElementById('restartBtn').onclick = start;