(function () {
  const els = {
    batterName: document.getElementById('batterName'),
    pitcherName: document.getElementById('pitcherName'),
    batterTeam: document.getElementById('batterTeam'),
    pitcherTeam: document.getElementById('pitcherTeam'),
    awayName: document.getElementById('awayName'),
    homeName: document.getElementById('homeName'),
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
})();


