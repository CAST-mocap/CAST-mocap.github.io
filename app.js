'use strict';

const videos = [...document.querySelectorAll('#video-grid video')];
const playToggle = document.querySelector('#play-toggle');
const timeline = document.querySelector('#timeline');
const videoTime = document.querySelector('#video-time');
const caption = document.querySelector('#demo-caption');
const targetNames = ['input', 'horse', 'crab', 'bird', 'human'];
// Clip lengths differ per source (58 vs 81 frames), so the scrub-bar fallback length is tracked per source.
// Nothing derived from the underlying clips or renders is shown on the page; these names are for screen readers only.
const sources = {horse01: {label: 'Horse', frames: 81}, crab03: {label: 'Crab', frames: 81}, bird01: {label: 'Ostrich', frames: 81}, human04: {label: 'Human', frames: 58}};
const FPS = 30;
let currentSource = 'horse01';
let playing = false;
let generation = 0;
let frameRequest = 0;

function setPlaying(value) {
  playing = value;
  playToggle.textContent = value ? 'Pause all' : 'Play all';
  playToggle.setAttribute('aria-label', `${value ? 'Pause' : 'Play'} all five videos`);
}
function pauseAll() {
  generation++;
  videos.forEach(v => v.pause());
  cancelAnimationFrame(frameRequest);
  setPlaying(false);
}
function updateTimeline() {
  const main = videos[0];
  const duration = Number.isFinite(main.duration) ? main.duration : sources[currentSource].frames / FPS;
  timeline.value = duration ? Math.round(main.currentTime / duration * 1000) : 0;
  videoTime.textContent = `${main.currentTime.toFixed(1)} / ${duration.toFixed(1)} s`;
  if (playing) {
    for (const v of videos.slice(1)) {
      if (v.readyState >= 2 && Math.abs(v.currentTime - main.currentTime) > 0.12) v.currentTime = main.currentTime;
    }
    frameRequest = requestAnimationFrame(updateTimeline);
  }
}
async function playAll() {
  const currentGeneration = ++generation;
  if (videos[0].ended || (Number.isFinite(videos[0].duration) && videos[0].currentTime >= videos[0].duration - 0.08)) {
    videos.forEach(v => { v.currentTime = 0; });
  }
  const time = videos[0].currentTime;
  videos.slice(1).forEach(v => { v.currentTime = time; });
  setPlaying(true);
  const settled = await Promise.allSettled(videos.map(v => v.play()));
  if (currentGeneration !== generation) return;
  if (settled.some(result => result.status === 'rejected')) {
    pauseAll();
    caption.textContent = 'Playback could not start. Please try Play all again once the videos have loaded.';
    return;
  }
  updateTimeline();
}
playToggle.addEventListener('click', () => playing ? pauseAll() : playAll());
document.querySelector('#restart').addEventListener('click', () => {
  const resume = playing;
  pauseAll();
  videos.forEach(v => { v.currentTime = 0; });
  updateTimeline();
  if (resume) playAll();
});
timeline.addEventListener('input', () => {
  const fraction = Number(timeline.value) / 1000;
  videos.forEach(v => { if (Number.isFinite(v.duration)) v.currentTime = fraction * v.duration; });
  if (!playing) updateTimeline();
});
videos[0].addEventListener('loadedmetadata', updateTimeline);
videos[0].addEventListener('ended', () => { pauseAll(); updateTimeline(); });
document.querySelectorAll('[data-source]').forEach(button => {
  button.addEventListener('click', () => {
    const resume = playing;
    pauseAll();
    const source = button.dataset.source;
    currentSource = source;
    document.querySelectorAll('[data-source]').forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    videos.forEach((v, i) => {
      v.src = `assets/videos/${source}-${targetNames[i]}.mp4`;
      v.poster = `assets/posters/${source}-${targetNames[i]}.jpg`;
      v.load();
    });
    videos[0].setAttribute('aria-label', `${sources[source].label} input video`);
    timeline.value = 0;
    videoTime.textContent = `0.0 / ${(sources[source].frames / FPS).toFixed(1)} s`;
    if (resume) playAll();
  });
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });

// Cross-skeleton reels. Every reel is laid out as panels: the input clip first, then the CAST
// result on each other skeleton. The Mixamo reel runs six panels wide (one input plus five
// targets), so its header splits the labels 1:5 instead of in half.
const crossGroups = {
  zoo2zoo: {label: 'Zoo → Zoo', meta: '15 sequences'},
  zoo2obj: {label: 'Zoo → Obj', meta: '15 sequences'},
  obj2zoo: {label: 'Obj → Zoo', meta: '15 sequences'},
  obj2obj: {label: 'Obj → Obj', meta: '15 sequences'},
  mixamo: {label: 'Mixamo', meta: '6 clips', columns: ['Input', '5 other skeletons'], wideFirst: true}
};
const crossVideo = document.querySelector('#cross-reel-video');
const crossColumns = document.querySelector('#cross-reel-columns');
function renderCrossColumns(group) {
  const config = crossGroups[group];
  crossColumns.className = `reel-columns two${config.wideFirst ? ' wide-first' : ''}`;
  crossColumns.replaceChildren(...(config.columns || ['Input', 'CAST (Ours)']).map((text, index) => {
    const span = document.createElement('span');
    if (index) span.className = 'reel-ours';
    span.textContent = text;
    return span;
  }));
}
document.querySelectorAll('[data-cross-group]').forEach(button => {
  button.addEventListener('click', () => {
    const group = button.dataset.crossGroup;
    const config = crossGroups[group];
    crossVideo.pause();
    document.querySelectorAll('[data-cross-group]').forEach(b => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    document.querySelector('#cross-reel-label').textContent = config.label;
    document.querySelector('#cross-reel-meta').textContent = config.meta;
    renderCrossColumns(group);
    crossVideo.src = `assets/videos/${group}.mp4`;
    crossVideo.poster = `assets/posters/${group}.jpg`;
    crossVideo.setAttribute('aria-label', `${config.label} cross-skeleton motion capture, ${config.meta}`);
    crossVideo.load();
  });
});

// Transcribed from ../tables/combined.tex. Do not replace missing values with zero.
const results = {
  zoo: {title:'Zoo · Matched-rig motion capture', rows:[['Puppeteer',454.70,236.38,19.74,.245],['TopoCap',null,null,null,null],['MCA V2*',105.52,67.04,10.35,.077],['CAST-B',42.68,33.23,5.48,.036],['CAST-L',39.59,31.05,5.14,.034]]},
  seen: {title:'MObj Seen · Matched-rig motion capture', rows:[['Puppeteer',205.85,103.89,22.09,.136],['TopoCap',157.51,74.04,34.86,.096],['MCA V2*',94.38,58.62,16.71,.071],['CAST-B',55.39,32.92,9.73,.043],['CAST-L',52.19,30.91,9.10,.041]]},
  unseen: {title:'MObj Unseen · Matched-rig motion capture', rows:[['Puppeteer',181.63,93.23,21.10,.119],['TopoCap',191.77,82.11,38.93,.109],['MCA V2*',103.04,61.98,16.44,.074],['CAST-B',79.21,46.52,10.73,.057],['CAST-L',74.63,44.21,10.19,.054]]},
  mixamo: {title:'Mixamo · Cross-skeleton animation', rows:[['TopoCap',363.59,154.72,57.20,.174],['MCA V2*',277.35,127.38,33.64,.135],['CAST-B',149.50,85.79,19.60,.087],['CAST-L',125.62,71.16,15.74,.074]]}
};
document.querySelector('#dataset').addEventListener('change', event => {
  const data = results[event.target.value];
  document.querySelector('#table-caption').textContent = data.title;
  document.querySelector('#results-body').replaceChildren(...data.rows.map(row => {
    const tr = document.createElement('tr');
    if (row[0] === 'CAST-B') tr.className = 'ours';
    if (row[0] === 'CAST-L') tr.className = 'best';
    row.forEach((value, index) => {
      const cell = document.createElement(index ? 'td' : 'th');
      if (!index) cell.scope = 'row';
      cell.textContent = index ? (value === null ? '—' : value.toFixed(index === 4 ? 3 : 2)) : value;
      if (!index && value === 'CAST-L') {
        const label = document.createElement('span'); label.textContent = 'Ours'; cell.append(' ', label);
      }
      tr.append(cell);
    });
    return tr;
  }));
});
