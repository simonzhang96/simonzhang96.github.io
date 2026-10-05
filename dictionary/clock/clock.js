'use strict';
const Z = window.ZeksaTime;
const dateNode = document.getElementById('zeksa-date');
const timeNode = document.getElementById('zeksa-time');
const scriptSwitch = document.getElementById('alphabet-switch');
let useZeksa = true;
let fontReady = false;
let lastTime = '';
let timer;
const earthFormatter = new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function alignLabels() {
  if (!timeNode.firstChild) return;
  const labels = document.querySelector('.time-labels');
  const bounds = labels.getBoundingClientRect();
  [[1,3],[4,7],[8,11]].forEach(([start,end],i) => {
    const range = document.createRange();
    range.setStart(timeNode.firstChild,start);range.setEnd(timeNode.firstChild,end);
    const r=range.getBoundingClientRect();
    labels.children[i].style.left=`${r.left+r.width/2-bounds.left}px`;
  });
}
function applyScript() {
  const native = useZeksa && fontReady;
  document.body.classList.toggle('native-mode',native);
  document.body.classList.toggle('earth-mode',!native);
  scriptSwitch.setAttribute('aria-checked',String(useZeksa));
  scriptSwitch.setAttribute('aria-label',useZeksa ? '使用仄克萨文字' : '使用地球文字');
  document.querySelectorAll('[data-script]').forEach(el => {
    el.textContent=native ? Z.toPUA(el.dataset.script) : (el.dataset.earth ?? el.dataset.script);
    el.classList.toggle('mapped',native);
  });
  dateNode.classList.toggle('mapped',native);
  timeNode.classList.toggle('mapped',native);
  render();
}
function render() {
  const now = Date.now();
  const c = Z.fromUnixMs(now);
  const native = useZeksa && fontReady;
  const key = c.date + c.time + native;
  if (key !== lastTime) {
    dateNode.textContent = native ? Z.toPUA(c.date) : c.date;
    timeNode.textContent = native ? Z.toPUA(c.time) : c.time;
    dateNode.setAttribute('aria-label',`仄克萨年号${c.year}，季编号${c.season}，月编号${c.month}，日编号${c.day}，以上读数为十进制`);
    timeNode.setAttribute('aria-label',`${c.hour}时 ${c.minute}分 ${c.second}秒，以上读数为十进制`);
    lastTime = key;
    alignLabels();
  }
  document.getElementById('day-fill').style.width = `${c.dayProgress*100}%`;
  document.getElementById('day-marker').style.left = `${c.dayProgress*100}%`;
  const earth = document.getElementById('earth-time');
  earth.textContent = earthFormatter.format(now);
  earth.dateTime = new Date(now).toISOString();
  clearTimeout(timer);
  const dayMs = ((now - Z.EPOCH_MS) % Z.DAY_MS + Z.DAY_MS) % Z.DAY_MS;
  const nextTick = Math.ceil((c.ticks + 1) * Z.DAY_MS / Z.TICKS_PER_DAY - dayMs) + 1;
  if (!document.hidden) timer = setTimeout(render, Math.max(8, Math.min(250, nextTick)));
}
scriptSwitch.addEventListener('click',()=>{useZeksa=!useZeksa;applyScript();});
window.addEventListener('resize',alignLabels);
document.addEventListener('visibilitychange',render);
window.addEventListener('pageshow',render);
window.addEventListener('focus',render);
applyScript();
document.fonts.load('32px Zeksa', Z.toPUA('0123[]/gäqietëf')).then(faces => {
  fontReady = faces.length > 0;
  document.getElementById('font-notice').hidden = fontReady;
  applyScript();
}).catch(() => {document.getElementById('font-notice').hidden=false;});

const clockFace = document.getElementById('clock-face');
const fullscreenButton = document.getElementById('fullscreen-toggle');
const backgroundElements = document.querySelectorAll('.home-back-btn, #clock-heading, #alphabet-switch, .earth-line, #font-notice, .lexicon-section, .origin-section, .precision, footer');
let expanded = false;
let nativeFullscreen = false;
function setExpanded(value) {
  expanded = value;
  clockFace.classList.toggle('is-expanded', value);
  document.body.classList.toggle('clock-expanded', value);
  backgroundElements.forEach(el => { el.inert = value; });
  const label = value ? '退出全屏' : '全屏显示时钟';
  fullscreenButton.setAttribute('aria-label', label);
  fullscreenButton.setAttribute('aria-pressed', String(value));
  fullscreenButton.title = label;
  fullscreenButton.querySelector('span').textContent = value ? '退出全屏' : '全屏';
  requestAnimationFrame(alignLabels);
}
fullscreenButton.addEventListener('click', async () => {
  if (expanded) {
    if (document.fullscreenElement === clockFace) {
      try { await document.exitFullscreen(); } catch { return; }
    }
    nativeFullscreen = false;
    setExpanded(false);
    fullscreenButton.focus({preventScroll:true});
    return;
  }
  setExpanded(true);
  fullscreenButton.disabled = true;
  try {
    if (document.fullscreenEnabled && clockFace.requestFullscreen) {
      await clockFace.requestFullscreen();
      nativeFullscreen = document.fullscreenElement === clockFace;
    }
  } catch {
    // Keep the viewport-filling view when the browser denies native fullscreen.
  } finally {
    fullscreenButton.disabled = false;
    fullscreenButton.focus({preventScroll:true});
  }
});
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement === clockFace) {
    nativeFullscreen = true;
    setExpanded(true);
  } else if (nativeFullscreen) {
    nativeFullscreen = false;
    setExpanded(false);
    fullscreenButton.focus({preventScroll:true});
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && expanded && !document.fullscreenElement) {
    setExpanded(false);
    fullscreenButton.focus({preventScroll:true});
  }
});
new ResizeObserver(alignLabels).observe(clockFace);
