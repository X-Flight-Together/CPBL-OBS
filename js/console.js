(function () {
  const ref = window.ScoreboardFirebase.gameRef();

  const els = {
    awayNameInput: document.getElementById('awayNameInput'),
    homeNameInput: document.getElementById('homeNameInput'),
    awayScoreLabel: document.getElementById('awayScoreLabel'),
    homeScoreLabel: document.getElementById('homeScoreLabel'),
    inningLabel: document.getElementById('inningLabel'),
    batterInput: document.getElementById('batterInput'),
    pitcherInput: document.getElementById('pitcherInput'),
    awayTeamSelect: document.getElementById('awayTeamSelect'),
    homeTeamSelect: document.getElementById('homeTeamSelect'),
    awayLineupForm: document.getElementById('awayLineupForm'),
    homeLineupForm: document.getElementById('homeLineupForm'),
    saveAwayLineup: document.getElementById('saveAwayLineup'),
    saveHomeLineup: document.getElementById('saveHomeLineup'),
    nextAwayBatter: document.getElementById('nextAwayBatter'),
    nextHomeBatter: document.getElementById('nextHomeBatter'),
    awayPitcherInput: document.getElementById('awayPitcherInput'),
    homePitcherInput: document.getElementById('homePitcherInput'),
    awayPitcherList: document.getElementById('awayPitcherList'),
    homePitcherList: document.getElementById('homePitcherList'),
    setAwayPitcher: document.getElementById('setAwayPitcher'),
    setHomePitcher: document.getElementById('setHomePitcher'),
    stadiumSelect: document.getElementById('stadiumSelect'),
    strikeLabel: document.getElementById('strikeLabel'),
    ballLabel: document.getElementById('ballLabel'),
    outLabel: document.getElementById('outLabel'),
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(n, max));
  }

  // Apply button actions
  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    handleAction(act);
  });

  function handleAction(act) {
    const updates = {};

    switch (act) {
      case 'awayScore+': return step('awayTeam/score', +1);
      case 'awayScore-': return step('awayTeam/score', -1);
      case 'homeScore+': return step('homeTeam/score', +1);
      case 'homeScore-': return step('homeTeam/score', -1);
      case 'inning+': return step('inning', +1, 1, 30);
      case 'inning-': return step('inning', -1, 1, 30);
      case 'ball+': return step('counts/balls', +1, 0, 3);
      case 'ball-': return step('counts/balls', -1, 0, 3);
      case 'strike+': return step('counts/strikes', +1, 0, 2);
      case 'strike-': return step('counts/strikes', -1, 0, 2);
      case 'out+': return step('counts/outs', +1, 0, 3);
      case 'out-': return step('counts/outs', -1, 0, 3);
      case 'reset-count': updates['counts'] = { balls: 0, strikes: 0, outs: 0 }; break;
      case 'clear-bases': updates['bases'] = { b1: false, b2: false, b3: false }; break;
      case 'base1^': return toggle('bases/b1');
      case 'base2^': return toggle('bases/b2');
      case 'base3^': return toggle('bases/b3');
      case 'batting=home': updates['batting'] = 'home'; break;
      case 'batting=away': updates['batting'] = 'away'; break;
      case 'half=top': updates['half'] = 'top'; break;
      case 'half=bottom': updates['half'] = 'bottom'; break;
      default: return;
    }

    applyUpdates(updates);
  }

  function step(path, delta, min = -9999, max = 9999) {
    ref.child(path).transaction(function (cur) {
      const next = clamp(Number(cur || 0) + delta, min, max);
      return next;
    });
  }

  function toggle(path) {
    ref.child(path).transaction(function (cur) { return !cur; });
  }

  function applyUpdates(updates) {
    updates['updatedAt'] = Date.now();
    ref.update(updates);
  }

  // Inputs sync
  els.awayNameInput.addEventListener('change', function () { applyUpdates({ 'awayTeam/name': this.value }); });
  els.homeNameInput.addEventListener('change', function () { applyUpdates({ 'homeTeam/name': this.value }); });
  els.batterInput.addEventListener('change', function () { applyUpdates({ 'batter/name': this.value }); });
  els.pitcherInput.addEventListener('change', function () { applyUpdates({ 'pitcher/name': this.value }); });
  if (els.stadiumSelect) {
    els.stadiumSelect.addEventListener('change', function () { 
      const opt = this.options[this.selectedIndex];
      const name = opt ? opt.getAttribute('data-name') : '';
      applyUpdates({ stadium: name || '' }); 
    });
  }

  // Load preset teams
  var presetTeams = [];
  var teamIdToRosterFile = {
    TSG: './data/tsg_player.json',
    CTBC: './data/brothers_player.json',
    Fubon: './data/guardians_player.json',
    UniLions: './data/lions_player.json',
    Rakuten: './data/monkeys_player.json',
    Dragons: './data/dragon_player.json',
  };
  var allPitchers = null; // cached data from all_pitcher.json
  var latestGameState = null;
  fetch('./data/teams.json').then(function (r) { return r.json(); }).then(function (data) {
    const teams = data.teams || [];
    presetTeams = teams;
    function fill(select) {
      select.innerHTML = '<option value="">— 選擇隊伍 —</option>' + teams.map(function (t) {
        return '<option value="' + t.id + '" data-name="' + t.name_zh + '" data-color="' + t.color + '" data-logo="' + (t.logo || '') + '">' + t.name_zh + '</option>';
      }).join('');
    }
    fill(els.awayTeamSelect);
    fill(els.homeTeamSelect);

    function onPick(select, side) {
      const opt = select.options[select.selectedIndex];
      if (!opt || !opt.value) return;
      const name = opt.getAttribute('data-name');
      const color = opt.getAttribute('data-color');
      const logo = opt.getAttribute('data-logo');
      const team = teams.find(function (t) { return t.id === opt.value; });
      const updates = {};
      updates[side + 'Team/name'] = name;
      updates[side + 'Team/color'] = color;
      if (logo) updates[side + 'Team/logo'] = logo;
      if (team && team.name_en) updates[side + 'Team/nameEn'] = team.name_en;
      applyUpdates(updates);
      loadRoster(side, opt.value);
      // load pitchers by team name (zh)
      loadPitchers(side, name);
    }
    els.awayTeamSelect.addEventListener('change', function () { onPick(this, 'away'); });
    els.homeTeamSelect.addEventListener('change', function () { onPick(this, 'home'); });
  }).catch(function (e) { console.warn('Load teams failed', e); });

  // Load all pitchers once
  fetch('./data/all_pitcher.json').then(function (r) { return r.json(); }).then(function (data) {
    allPitchers = data;
    // if we already have state, populate selects now
    try {
      if (latestGameState) {
        if (latestGameState.awayTeam?.name) loadPitchers('away', latestGameState.awayTeam.name);
        if (latestGameState.homeTeam?.name) loadPitchers('home', latestGameState.homeTeam.name);
      }
    } catch (_) {}
  }).catch(function (e) { console.warn('Load all_pitcher failed', e); });

  // Load stadiums
  fetch('./data/stadiums.json').then(function (r) { return r.json(); }).then(function (data) {
    const stadiums = data.stadiums || [];
    
    // Try to find stadium select element
    let stadiumSelect = els.stadiumSelect || document.getElementById('stadiumSelect');
    if (stadiumSelect) {
      stadiumSelect.innerHTML = '<option value="">選擇球場</option>' + 
        stadiums.map(function (s) { 
          return '<option value="' + s.id + '" data-name="' + s.name + '">' + s.name + '</option>'; 
        }).join('');
      
      // Add event listener if not already added
      if (!stadiumSelect.hasAttribute('data-listener-added')) {
        stadiumSelect.addEventListener('change', function () { 
          const opt = this.options[this.selectedIndex];
          const name = opt ? opt.getAttribute('data-name') : '';
          applyUpdates({ stadium: name || '' }); 
        });
        stadiumSelect.setAttribute('data-listener-added', 'true');
      }
    } else {
      console.warn('Stadium select element not found');
    }
  }).catch(function (e) { console.warn('Load stadiums failed', e); });


  // Lineup tab functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Remove active class from all buttons and panels
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      this.classList.add('active');
      document.getElementById(targetTab + 'LineupPanel').classList.add('active');
    });
  });

  document.getElementById('resetAll').addEventListener('click', function () {
    if (!confirm('確定要重置整場比賽資料？')) return;
    ref.set({
      awayTeam: { name: els.awayNameInput.value || '客隊', score: 0 },
      homeTeam: { name: els.homeNameInput.value || '主隊', score: 0 },
      batting: 'away', half: 'top', inning: 1,
      batter: { name: els.batterInput.value || '—', avg: '.000' },
      pitcher: { name: els.pitcherInput.value || '—', pitches: 0 },
      counts: { balls: 0, strikes: 0, outs: 0 },
      bases: { b1: false, b2: false, b3: false },
      currentBatter: 0,
      awayLineup: Array(9).fill().map((_, i) => ({ name: '—' })),
      homeLineup: Array(9).fill().map((_, i) => ({ name: '—' })),
      updatedAt: Date.now(),
    });
  });

  // Live preview
  ref.on('value', function (snap) {
    if (!snap.exists()) return;
    const s = snap.val();
    latestGameState = s;
    els.awayNameInput.value = s.awayTeam?.name || '';
    els.homeNameInput.value = s.homeTeam?.name || '';
    els.awayScoreLabel.textContent = s.awayTeam?.score ?? 0;
    els.homeScoreLabel.textContent = s.homeTeam?.score ?? 0;
    els.inningLabel.textContent = s.inning || 1;
    els.batterInput.value = s.batter?.name || '';
    els.pitcherInput.value = s.pitcher?.name || '';
    // Update count values with fallback
    const strikeEl = els.strikeLabel || document.getElementById('strikeLabel');
    const ballEl = els.ballLabel || document.getElementById('ballLabel');
    const outEl = els.outLabel || document.getElementById('outLabel');
    
    if (strikeEl) strikeEl.textContent = s.counts?.strikes ?? 0;
    if (ballEl) ballEl.textContent = s.counts?.balls ?? 0;
    if (outEl) outEl.textContent = s.counts?.outs ?? 0;
    
    
    // Update stadium select
    const stadiumSelect = els.stadiumSelect || document.getElementById('stadiumSelect');
    if (stadiumSelect && s.stadium) {
      const options = stadiumSelect.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].getAttribute('data-name') === s.stadium) {
          stadiumSelect.selectedIndex = i;
          break;
        }
      }
    }
    
    // Auto-migrate remote logo URLs to local ones based on team name
    try {
      function localLogoFor(name) {
        if (!name) return null;
        const t = presetTeams.find(function (x) { return x.name_zh === name; });
        return t ? t.logo : null;
      }
      const updates = {};
      // Backfill English team names if missing
      if (s.awayTeam?.name && (!s.awayTeam.nameEn || s.awayTeam.nameEn === '')) {
        const t = presetTeams.find(function (x) { return x.name_zh === s.awayTeam.name; });
        if (t && t.name_en) updates['awayTeam/nameEn'] = t.name_en;
      }
      if (s.homeTeam?.name && (!s.homeTeam.nameEn || s.homeTeam.nameEn === '')) {
        const t = presetTeams.find(function (x) { return x.name_zh === s.homeTeam.name; });
        if (t && t.name_en) updates['homeTeam/nameEn'] = t.name_en;
      }
      // Also set team selects based on name and load roster once
      if (els.awayTeamSelect && s.awayTeam?.name) {
        const t = presetTeams.find(function (x) { return x.name_zh === s.awayTeam.name; });
        if (t) {
          els.awayTeamSelect.value = t.id;
          loadRoster('away', t.id);
          loadPitchers('away', t.name_zh || s.awayTeam.name);
        }
      }
      if (els.homeTeamSelect && s.homeTeam?.name) {
        const t = presetTeams.find(function (x) { return x.name_zh === s.homeTeam.name; });
        if (t) {
          els.homeTeamSelect.value = t.id;
          loadRoster('home', t.id);
          loadPitchers('home', t.name_zh || s.homeTeam.name);
        }
      }
      if (s.awayTeam?.logo && /^https?:\/\//.test(String(s.awayTeam.logo))) {
        const local = localLogoFor(s.awayTeam?.name);
        if (local) updates['awayTeam/logo'] = local;
      }
      if (s.homeTeam?.logo && /^https?:\/\//.test(String(s.homeTeam.logo))) {
        const local = localLogoFor(s.homeTeam?.name);
        if (local) updates['homeTeam/logo'] = local;
      }
      if (Object.keys(updates).length) applyUpdates(updates);
    } catch (e) { /* ignore */ }

    // Switch pitcher datalist by defense team (opposite of batting)
    try {
      var batting = s.batting || 'away';
      var listId = (batting === 'away') ? 'homePitchers' : 'awayPitchers';
      if (els.pitcherInput) els.pitcherInput.setAttribute('list', listId);
    } catch (_) {}
  });

  // Build lineup forms (away, home)
  function buildLineup(formEl, prefix) {
    if (!formEl) return;
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= 9; i++) {
      const row = document.createElement('div');
      row.className = 'field-row';
      const label = document.createElement('label');
      label.textContent = String(i) + ' 棒';
      const input = document.createElement('input');
      input.placeholder = '球員姓名';
      input.id = prefix + 'lineup_' + i;
      const filler = document.createElement('div');
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(filler);
      frag.appendChild(row);
    }
    formEl.appendChild(frag);
  }
  buildLineup(els.awayLineupForm, 'away_');
  buildLineup(els.homeLineupForm, 'home_');

  function attachDatalist(prefix, side) {
    const listId = side + 'Players';
    // create datalist if not exists
    let dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      document.body.appendChild(dl);
    }
    for (let i = 1; i <= 9; i++) {
      const inp = document.getElementById(prefix + 'lineup_' + i);
      if (inp) inp.setAttribute('list', listId);
    }
  }
  attachDatalist('away_', 'away');
  attachDatalist('home_', 'home');

  function loadRoster(side, teamId) {
    const file = teamIdToRosterFile[teamId];
    if (!file) return;
    fetch(file).then(function (r) { return r.json(); }).then(function (data) {
      const playersObj = data.players || {};
      const names = [];
      Object.keys(playersObj).forEach(function (group) {
        const arr = playersObj[group] || [];
        arr.forEach(function (p) { if (p && p.name) names.push(p.name); });
      });
      const dl = document.getElementById(side + 'Players');
      if (dl) {
        dl.innerHTML = names.map(function (n) { return '<option value="' + n + '"></option>'; }).join('');
      }
    }).catch(function (e) { console.warn('Load roster failed', e); });
  }

  function ensurePitcherDatalist(side) {
    const listId = side + 'Pitchers';
    let dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      document.body.appendChild(dl);
    }
    return dl;
  }

  function loadPitchers(side, teamNameZh) {
    if (!allPitchers || !teamNameZh) return;
    const list = (allPitchers.teams || []).find(function (t) { return t.team === teamNameZh; });
    const dl = ensurePitcherDatalist(side);
    if (!dl) return;
    const names = (list && Array.isArray(list.players)) ? list.players.map(function (p) { return p.name; }) : [];
    dl.innerHTML = names.map(function (n) { return '<option value="' + n + '"></option>'; }).join('');
    // Also fill selects for explicit clicking
    const listEl = side === 'away' ? els.awayPitcherList : els.homePitcherList;
    if (listEl) {
      listEl.innerHTML = names.map(function (n) { return '<button class="btn" data-pitcher="' + n + '">' + n + '</button>'; }).join('');
    }
  }

  function setPitcherFromInput(input) {
    if (!input) return;
    const name = input.value || '';
    if (!name) return;
    applyUpdates({ 'pitcher/name': name });
  }
  if (els.setAwayPitcher) els.setAwayPitcher.addEventListener('click', function () { setPitcherFromInput(els.awayPitcherInput); });
  if (els.setHomePitcher) els.setHomePitcher.addEventListener('click', function () { setPitcherFromInput(els.homePitcherInput); });

  // Click on list to fill input
  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-pitcher]');
    if (!btn) return;
    const name = btn.getAttribute('data-pitcher');
    if (btn.parentElement === els.awayPitcherList && els.awayPitcherInput) els.awayPitcherInput.value = name;
    if (btn.parentElement === els.homePitcherList && els.homePitcherInput) els.homePitcherInput.value = name;
  });

  // Load lineup into inputs
  ref.on('value', function (snap) {
    const s = snap.val();
    if (!s) return;
    if (s.awayLineup) {
      for (let i = 1; i <= 9; i++) {
        const inp = document.getElementById('away_lineup_' + i);
        if (inp) {
          const player = s.awayLineup[i - 1];
          if (typeof player === 'string') {
            inp.value = player || '';
          } else if (player && typeof player === 'object') {
            inp.value = player.name || '';
          } else {
            inp.value = '';
          }
        }
      }
    }
    if (s.homeLineup) {
      for (let i = 1; i <= 9; i++) {
        const inp = document.getElementById('home_lineup_' + i);
        if (inp) {
          const player = s.homeLineup[i - 1];
          if (typeof player === 'string') {
            inp.value = player || '';
          } else if (player && typeof player === 'object') {
            inp.value = player.name || '';
          } else {
            inp.value = '';
          }
        }
      }
    }
  });

  // Save lineup
  function collect(prefix) {
    const arr = [];
    for (let i = 1; i <= 9; i++) {
      const inp = document.getElementById(prefix + 'lineup_' + i);
      const playerName = (inp && inp.value) ? inp.value : '';
      arr.push({ name: playerName || '—' });
    }
    return arr;
  }
  if (els.saveAwayLineup) els.saveAwayLineup.addEventListener('click', function () { applyUpdates({ awayLineup: collect('away_') }); });
  if (els.saveHomeLineup) els.saveHomeLineup.addEventListener('click', function () { applyUpdates({ homeLineup: collect('home_') }); });

  // Next batter functionality
  document.getElementById('nextAwayBatter')?.addEventListener('click', function () {
    const currentBatter = latestGameState?.currentBatter || 0;
    const nextBatter = (currentBatter + 1) % 9;
    const lineup = latestGameState?.awayLineup || [];
    const nextPlayer = lineup[nextBatter] || { name: '—' };
    
    console.log('Next Away Batter:', { currentBatter, nextBatter, nextPlayer, lineup });
    
    applyUpdates({ 
      currentBatter: nextBatter,
      'batter/name': nextPlayer.name,
      batting: 'away'
    });
  });

  document.getElementById('nextHomeBatter')?.addEventListener('click', function () {
    const currentBatter = latestGameState?.currentBatter || 0;
    const nextBatter = (currentBatter + 1) % 9;
    const lineup = latestGameState?.homeLineup || [];
    const nextPlayer = lineup[nextBatter] || { name: '—' };
    
    console.log('Next Home Batter:', { currentBatter, nextBatter, nextPlayer, lineup });
    
    applyUpdates({ 
      currentBatter: nextBatter,
      'batter/name': nextPlayer.name,
      batting: 'home'
    });
  });

  // Next batter: advance an index and set current batter
  function advance(side) {
    ref.transaction(function (game) {
      if (!game) game = {};
      const key = side + 'Lineup';
      const idxKey = side + 'LineupIndex';
      const lineup = Array.isArray(game[key]) ? game[key] : [];
      const count = lineup.length || 0;
      if (count === 0) return game;
      const idx = ((game[idxKey] || 0) + 1) % count;
      game[idxKey] = idx;
      const name = lineup[idx] || '';
      if (!game.batter) game.batter = {};
      game.batter.name = name;
      return game;
    });
  }
  if (els.nextAwayBatter) els.nextAwayBatter.addEventListener('click', function () { advance('away'); });
  if (els.nextHomeBatter) els.nextHomeBatter.addEventListener('click', function () { advance('home'); });

  // Tab switching for lineup
  document.body.addEventListener('click', function (e) {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;
    const tab = tabBtn.getAttribute('data-tab');
    if (!tab) return;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    tabBtn.classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    const panel = document.getElementById(tab + 'LineupPanel');
    if (panel) panel.classList.add('active');
  });
})();


