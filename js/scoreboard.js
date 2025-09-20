(function () {
  const els = {
    batterName: document.getElementById('batterName'),
    pitcherName: document.getElementById('pitcherName'),
    batterTeam: document.getElementById('batterTeam'),
    pitcherTeam: document.getElementById('pitcherTeam'),
    awayName: document.getElementById('awayName'),
    awayNameEn: document.getElementById('awayNameEn'),
    homeName: document.getElementById('homeName'),
    homeNameEn: document.getElementById('homeNameEn'),
    awayScore: document.getElementById('awayScore'),
    homeScore: document.getElementById('homeScore'),
    halfInning: document.getElementById('halfInning'),
    inning: document.getElementById('inning'),
    base1: document.getElementById('base1'),
    base2: document.getElementById('base2'),
    base3: document.getElementById('base3'),
    balls: document.getElementById('balls'),
    strikes: document.getElementById('strikes'),
    outs: document.getElementById('outs'),
    awayTeam: document.getElementById('awayTeam'),
    homeTeam: document.getElementById('homeTeam'),
    awayBattingIndicator: document.getElementById('awayBattingIndicator'),
    homeBattingIndicator: document.getElementById('homeBattingIndicator'),
    stadiumName: document.getElementById('stadiumName'),
    clockTime: document.getElementById('clockTime'),
    clockDate: document.getElementById('clockDate'),
    winAwayName: document.getElementById('winAwayName'),
    winHomeName: document.getElementById('winHomeName'),
    winAwayBar: document.getElementById('winAwayBar'),
    winHomeBar: document.getElementById('winHomeBar'),
    winAwayPct: document.getElementById('winAwayPct'),
    winHomePct: document.getElementById('winHomePct'),
    awayLineupName: document.getElementById('awayLineupName'),
    homeLineupName: document.getElementById('homeLineupName'),
    awayLineup: document.getElementById('awayLineup'),
    homeLineup: document.getElementById('homeLineup'),
  };

  function renderDots(container, count, max) {
    container.innerHTML = '';
    const n = Math.max(0, Math.min(count || 0, max));
    for (let i = 0; i < max; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i < n ? ' on' : '');
      container.appendChild(d);
    }
  }

  function render(state) {
    if (!state) return;
    els.awayName.textContent = state.awayTeam?.name || '客隊';
    els.homeName.textContent = state.homeTeam?.name || '主隊';
    els.awayScore.textContent = state.awayTeam?.score ?? 0;
    els.homeScore.textContent = state.homeTeam?.score ?? 0;
    if (els.awayNameEn) els.awayNameEn.textContent = state.awayTeam?.nameEn || '';
    if (els.homeNameEn) els.homeNameEn.textContent = state.homeTeam?.nameEn || '';

    const top = (state.half === 'top');
    els.halfInning.textContent = top ? '▲' : '▼';
    els.inning.textContent = String(state.inning || 1);

    els.batterName.textContent = state.batter?.name || '—';
    els.pitcherName.textContent = state.pitcher?.name || '—';
    
    // Update team indicators for batter and pitcher
    const battingTeam = state.batting === 'away' ? state.awayTeam?.name || '客隊' : state.homeTeam?.name || '主隊';
    const pitchingTeam = state.batting === 'away' ? state.homeTeam?.name || '主隊' : state.awayTeam?.name || '客隊';
    els.batterTeam.textContent = battingTeam;
    els.pitcherTeam.textContent = pitchingTeam;

    els.base1.classList.toggle('on', !!state.bases?.b1);
    els.base2.classList.toggle('on', !!state.bases?.b2);
    els.base3.classList.toggle('on', !!state.bases?.b3);

    renderDots(els.balls, state.counts?.balls ?? 0, 3);
    renderDots(els.strikes, state.counts?.strikes ?? 0, 2);
    renderDots(els.outs, state.counts?.outs ?? 0, 2);

    // Update team attacking states and indicators
    els.awayTeam.classList.toggle('attacking', state.batting === 'away');
    els.homeTeam.classList.toggle('attacking', state.batting === 'home');
    els.awayBattingIndicator.classList.toggle('active', state.batting === 'away');
    els.homeBattingIndicator.classList.toggle('active', state.batting === 'home');
    
    // Apply team colors
    if (state.awayTeam?.color) els.awayTeam.style.background = state.awayTeam.color;
    if (state.homeTeam?.color) els.homeTeam.style.background = state.homeTeam.color;

    // Update win probability (simple heuristic if provided, else split)
    const awayName = state.awayTeam?.name || '客隊';
    const homeName = state.homeTeam?.name || '主隊';
    if (els.winAwayName) els.winAwayName.textContent = awayName;
    if (els.winHomeName) els.winHomeName.textContent = homeName;
    // Heuristic auto-calculation if DB not providing winProb
    function sigmoid(x){ return 1 / (1 + Math.exp(-x)); }
    // Game progress (0 to 1) based on inning and half
    var inningNum = Number(state.inning || 1);
    var half = String(state.half || 'top');
    var progress = Math.min(1, Math.max(0, ((inningNum - 1) + (half === 'bottom' ? 0.5 : 0)) / 9));
    // Lead from home perspective
    var homeLead = (Number(state.homeTeam?.score || 0) - Number(state.awayTeam?.score || 0));
    // Base/out situation advantage for batting team
    var baseVal = (state.bases?.b1 ? 0.35 : 0) + (state.bases?.b2 ? 0.55 : 0) + (state.bases?.b3 ? 0.85 : 0);
    var outs = Number(state.counts?.outs || 0);
    var batAdv = baseVal - outs * 0.45; // runners positive, outs negative
    // Edge from home perspective
    var edge = homeLead + (state.batting === 'home' ? batAdv : -batAdv);
    // Late game amplifies impact
    var k = 0.9 + 1.4 * progress;
    var homeProbCalc = sigmoid(k * edge) * 100;
    var awayProbCalc = 100 - homeProbCalc;
    // If explicit probs exist, prefer them; else use heuristic
    const awayProb = (state.winProb && typeof state.winProb.away === 'number') ? state.winProb.away : awayProbCalc;
    const homeProb = (state.winProb && typeof state.winProb.home === 'number') ? state.winProb.home : homeProbCalc;
    if (els.winAwayBar) els.winAwayBar.style.width = Math.max(0, Math.min(awayProb, 100)) + '%';
    if (els.winHomeBar) els.winHomeBar.style.width = Math.max(0, Math.min(homeProb, 100)) + '%';
    if (els.winAwayPct) els.winAwayPct.textContent = Math.round(awayProb) + '%';
    if (els.winHomePct) els.winHomePct.textContent = Math.round(homeProb) + '%';

    // Apply team logos to fixed placeholders
    var awayLogo = document.getElementById('awayLogo');
    var homeLogo = document.getElementById('homeLogo');
    function setLogo(container, url) {
      if (!container) return;
      container.innerHTML = '';
      if (!url) return;
      var img = document.createElement('img');
      // Use crossorigin anonymous to allow rendering if server supports it; if not, image still displays
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.src = url;
      container.appendChild(img);
    }
    setLogo(awayLogo, state.awayTeam?.logo);
    setLogo(homeLogo, state.homeTeam?.logo);

    // Update stadium display
    if (els.stadiumName) {
      els.stadiumName.textContent = state.stadium || '未選擇場地';
    }

    // Update lineup display
    updateLineup(state);
  }

  function updateLineup(state) {
    // Update team names in lineup
    if (els.awayLineupName) {
      els.awayLineupName.textContent = state.awayTeam?.name || '客隊';
    }
    if (els.homeLineupName) {
      els.homeLineupName.textContent = state.homeTeam?.name || '主隊';
    }


    // Update away team lineup
    if (els.awayLineup) {
      els.awayLineup.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'lineup-player';
        
        // Handle different data structures
        let playerName = '—';
        if (state.awayLineup && Array.isArray(state.awayLineup)) {
          const player = state.awayLineup[i];
          if (typeof player === 'string') {
            playerName = player || '—';
          } else if (player && typeof player === 'object') {
            playerName = player.name || '—';
          }
        }
        
        playerDiv.textContent = `${i + 1}. ${playerName}`;
        
        // Highlight current batter
        if (state.batting === 'away' && state.currentBatter === i) {
          playerDiv.classList.add('current');
          console.log('Highlighting away batter:', i, playerName);
        }
        
        els.awayLineup.appendChild(playerDiv);
      }
    }

    // Update home team lineup
    if (els.homeLineup) {
      els.homeLineup.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'lineup-player';
        
        // Handle different data structures
        let playerName = '—';
        if (state.homeLineup && Array.isArray(state.homeLineup)) {
          const player = state.homeLineup[i];
          if (typeof player === 'string') {
            playerName = player || '—';
          } else if (player && typeof player === 'object') {
            playerName = player.name || '—';
          }
        }
        
        playerDiv.textContent = `${i + 1}. ${playerName}`;
        
        // Highlight current batter
        if (state.batting === 'home' && state.currentBatter === i) {
          playerDiv.classList.add('current');
          console.log('Highlighting home batter:', i, playerName);
        }
        
        els.homeLineup.appendChild(playerDiv);
      }
    }
  }

  function ensureDefault(snapshot) {
    if (snapshot.exists()) return;
    const ref = window.ScoreboardFirebase.gameRef();
    ref.set({
      awayTeam: { name: '客隊', score: 0 },
      homeTeam: { name: '主隊', score: 0 },
      batting: 'away',
      half: 'top',
      inning: 1,
      batter: { name: '—', avg: '.000' },
      pitcher: { name: '—', pitches: 0 },
      counts: { balls: 0, strikes: 0, outs: 0 },
      bases: { b1: false, b2: false, b3: false },
      stadium: '',
      currentBatter: 0,
      awayLineup: Array(9).fill().map((_, i) => ({ name: '—' })),
      homeLineup: Array(9).fill().map((_, i) => ({ name: '—' })),
      updatedAt: Date.now(),
    });
  }

  const ref = window.ScoreboardFirebase.gameRef();
  ref.on('value', function (snap) {
    if (!snap.exists()) {
      ensureDefault(snap);
      return;
    }
    render(snap.val());
  });

  // Clock widget updater
  function pad(n){ return String(n).padStart(2, '0'); }
  function updateClock(){
    if (!els.clockTime || !els.clockDate) return;
    const now = new Date();
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const y = now.getFullYear();
    const m = pad(now.getMonth()+1);
    const d = pad(now.getDate());
    const wk = ['日','一','二','三','四','五','六'][now.getDay()];
    els.clockTime.textContent = hh+':'+mm+':'+ss;
    els.clockDate.textContent = y+'/'+m+'/'+d+' ('+wk+')';
  }
  updateClock();
  setInterval(updateClock, 1000);
})();


