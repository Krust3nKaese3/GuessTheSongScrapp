/*
 * Allzeit-Statistik aus einem kompakten Ereignisprotokoll.
 * Keine Abhängigkeiten. Alles außer den Archiv-Summen wird aus dem Protokoll berechnet.
 *
 * songraten.history.v1:
 * {"v":1,"games":[{id,start,end,players:[pid],events:[...]}],"archive":{pid:{points,games,wins,dj,hit}}}
 *
 * Ereignisse: r Runde, b Buzz, v Wertung, k Überspringen, d Song-Ende ohne Treffer, z Spielende.
 * OpenScr lehnt Speicherwerte über 256 KiB ab. HISTORY_BUDGET_BYTES bleibt darunter;
 * ältere Spiele werden dann in archive zusammengefasst.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpenScrStats = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KEY_LIMIT_BYTES = 256 * 1024;
  const HISTORY_BUDGET_BYTES = 192 * 1024;

  function emptyHistory() {
    return { v: 1, games: [], archive: {} };
  }

  function isGame(game) {
    return Boolean(game && typeof game === 'object' && typeof game.id === 'string' && Array.isArray(game.events));
  }

  function normalizeHistory(raw) {
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return emptyHistory();
    const archive = raw.archive && typeof raw.archive === 'object' && !Array.isArray(raw.archive) ? raw.archive : {};
    return {
      v: 1,
      games: Array.isArray(raw.games) ? raw.games.filter(isGame) : [],
      archive: archive
    };
  }

  function utf8Bytes(value) {
    const text = String(value == null ? '' : value);
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
    let n = 0;
    for (let i = 0; i < text.length; i += 1) {
      const c = text.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c <= 0xdbff) {
        n += 4;
        i += 1;
      } else n += 3;
    }
    return n;
  }

  function clip(value, max) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max) : text;
  }

  function trackId(uri) {
    const text = String(uri || '');
    const mark = 'spotify:track:';
    const at = text.indexOf(mark);
    const id = (at === -1 ? text : text.slice(at + mark.length)).split('?')[0];
    return clip(id, 64);
  }

  function roundSec(sec) {
    const n = Number(sec);
    if (!isFinite(n) || n < 0) return null;
    return Math.round(n * 10) / 10;
  }

  function roundEvent(dj, uri, title, artist) {
    return { t: 'r', dj: dj, id: trackId(uri), ti: clip(title, 80), ar: clip(artist, 80) };
  }

  function buzzEvent(player, sec) {
    const event = { t: 'b', p: player };
    const seconds = roundSec(sec);
    if (seconds != null) event.s = seconds;
    return event;
  }

  function scoreEvent(player, ok, pts, sec) {
    const event = { t: 'v', p: player, ok: ok ? 1 : 0, pts: Number(pts) || 0 };
    if (ok) {
      const seconds = roundSec(sec);
      if (seconds != null) event.s = seconds;
    }
    return event;
  }

  function skipEvent(player, pts) {
    return { t: 'k', p: player, pts: Number(pts) || 0 };
  }

  function missEvent(player, pts) {
    return { t: 'd', p: player, pts: Number(pts) || 0 };
  }

  function createGame(players, now, random) {
    const stamp = Math.floor(now == null ? Date.now() : now);
    const rnd = typeof random === 'function' ? random : Math.random;
    let suffix = '';
    for (let i = 0; i < 4; i += 1) suffix += Math.floor(rnd() * 36).toString(36);
    return {
      id: 'g_' + stamp.toString(36) + suffix,
      start: stamp,
      end: 0,
      players: (players || []).filter((id) => typeof id === 'string' && id),
      events: []
    };
  }

  function finishGame(game, end) {
    return {
      id: game.id,
      start: Number(game.start) || 0,
      end: Math.floor(end == null ? Date.now() : end),
      players: (game.players || []).slice(),
      events: (game.events || []).concat([{ t: 'z' }])
    };
  }

  function blankBucket() {
    return { points: 0, games: 0, wins: 0, dj: {}, hit: {} };
  }

  function addSong(map, id, title, artist, count, sec) {
    if (!id) return;
    const row = map[id] || { n: 0, sn: 0, sec: 0, ti: '', ar: '' };
    row.n += count || 1;
    if (title) row.ti = title;
    if (artist) row.ar = artist;
    if (sec != null && isFinite(Number(sec))) {
      row.sec = Math.round((row.sec + Number(sec)) * 10) / 10;
      row.sn += 1;
    }
    map[id] = row;
  }

  function pointsOf(game) {
    const scores = new Map();
    (game.players || []).forEach((id) => { if (id) scores.set(id, scores.get(id) || 0); });
    (game.events || []).forEach((event) => {
      if (!event || !event.p || event.pts == null) return;
      if (event.t !== 'v' && event.t !== 'k' && event.t !== 'd') return;
      scores.set(event.p, (scores.get(event.p) || 0) + (Number(event.pts) || 0));
    });
    return scores;
  }

  function winnerIds(game) {
    const scores = pointsOf(game);
    let best = null;
    scores.forEach((value) => { if (best == null || value > best) best = value; });
    if (best == null) return [];
    const top = [];
    scores.forEach((value, id) => { if (value === best) top.push(id); });
    return top.length === 1 ? top : [];
  }

  function summarizeGame(game) {
    const out = {};
    function bucket(id) {
      if (!id) return null;
      if (!out[id]) out[id] = blankBucket();
      return out[id];
    }
    (game.players || []).forEach((id) => {
      const row = bucket(id);
      if (row) row.games += 1;
    });
    const scores = pointsOf(game);
    const winners = new Set(winnerIds(game));
    scores.forEach((pts, id) => {
      const row = bucket(id);
      row.points += pts;
      if (!game.players || game.players.indexOf(id) === -1) row.games += 1;
      if (winners.has(id)) row.wins += 1;
    });
    let current = null;
    (game.events || []).forEach((event) => {
      if (!event) return;
      if (event.t === 'r') {
        current = event;
        const row = bucket(event.dj);
        if (row) addSong(row.dj, event.id, event.ti, event.ar, 1, null);
      }
      if (event.t === 'v' && event.ok && event.p && current) {
        const row = bucket(event.p);
        if (row) addSong(row.hit, current.id, current.ti, current.ar, 1, roundSec(event.s));
      }
    });
    return out;
  }

  function mergeSong(target, source) {
    Object.keys(source || {}).forEach((id) => {
      const row = source[id];
      const cur = target[id] || { n: 0, sn: 0, sec: 0, ti: '', ar: '' };
      cur.n += Number(row.n) || 0;
      cur.sn += Number(row.sn) || 0;
      cur.sec = Math.round((cur.sec + (Number(row.sec) || 0)) * 10) / 10;
      if (row.ti) cur.ti = row.ti;
      if (row.ar) cur.ar = row.ar;
      target[id] = cur;
    });
  }

  function mergeBucket(into, extra) {
    into.points += Number(extra.points) || 0;
    into.games += Number(extra.games) || 0;
    into.wins += Number(extra.wins) || 0;
    mergeSong(into.dj, extra.dj);
    mergeSong(into.hit, extra.hit);
  }

  function cloneArchive(archive) {
    const copy = {};
    Object.keys(archive || {}).forEach((id) => {
      const row = archive[id] || {};
      copy[id] = {
        points: Number(row.points) || 0,
        games: Number(row.games) || 0,
        wins: Number(row.wins) || 0,
        dj: Object.assign({}, row.dj || {}),
        hit: Object.assign({}, row.hit || {})
      };
      copy[id].dj = JSON.parse(JSON.stringify(row.dj || {}));
      copy[id].hit = JSON.parse(JSON.stringify(row.hit || {}));
    });
    return copy;
  }

  function mergeSummary(archive, summary) {
    Object.keys(summary).forEach((id) => {
      if (!archive[id]) archive[id] = blankBucket();
      mergeBucket(archive[id], summary[id]);
    });
  }

  function ingest(history, game, budget) {
    const doc = normalizeHistory(history);
    const copy = {
      v: 1,
      games: doc.games.concat([finishShape(game)]),
      archive: cloneArchive(doc.archive)
    };
    const limit = budget == null ? HISTORY_BUDGET_BYTES : budget;
    let guard = 0;
    while (copy.games.length > 1 && utf8Bytes(JSON.stringify(copy)) > limit && guard < 10000) {
      mergeSummary(copy.archive, summarizeGame(copy.games.shift()));
      guard += 1;
    }
    if (copy.games.length && utf8Bytes(JSON.stringify(copy)) > KEY_LIMIT_BYTES) {
      mergeSummary(copy.archive, summarizeGame(copy.games.shift()));
    }
    return copy;
  }

  function finishShape(game) {
    return {
      id: game.id,
      start: Number(game.start) || 0,
      end: Number(game.end) || 0,
      players: (game.players || []).slice(),
      events: (game.events || []).slice()
    };
  }

  function timesFromGames(games, playerId) {
    const times = {};
    (games || []).forEach((game) => {
      let current = null;
      (game.events || []).forEach((event) => {
        if (!event) return;
        if (event.t === 'r') current = event;
        if (event.t === 'v' && event.ok && event.p === playerId && current && current.id && event.s != null) {
          if (!times[current.id]) times[current.id] = [];
          times[current.id].push(roundSec(event.s));
        }
      });
    });
    return times;
  }

  function present(bucket, times) {
    const byCount = (a, b) => b.count - a.count || String(a.title).localeCompare(String(b.title), 'de') || String(a.id).localeCompare(String(b.id));
    const djSongs = Object.keys(bucket.dj || {}).map((id) => {
      const row = bucket.dj[id];
      return { id: id, title: row.ti || '', artist: row.ar || '', count: Number(row.n) || 0 };
    }).sort(byCount);
    const guessed = Object.keys(bucket.hit || {}).map((id) => {
      const row = bucket.hit[id];
      const known = (times && times[id]) || [];
      const measured = Number(row.sn) || 0;
      return {
        id: id,
        title: row.ti || '',
        artist: row.ar || '',
        count: Number(row.n) || 0,
        seconds: known,
        average: measured ? (Number(row.sec) || 0) / measured : null
      };
    }).sort(byCount);
    return {
      points: Number(bucket.points) || 0,
      games: Number(bucket.games) || 0,
      wins: Number(bucket.wins) || 0,
      djSongs: djSongs,
      guessed: guessed
    };
  }

  function statsFor(history, playerId) {
    const doc = normalizeHistory(history);
    const bucket = blankBucket();
    if (doc.archive[playerId]) mergeBucket(bucket, doc.archive[playerId]);
    doc.games.forEach((game) => {
      const summary = summarizeGame(game);
      if (summary[playerId]) mergeBucket(bucket, summary[playerId]);
    });
    return present(bucket, timesFromGames(doc.games, playerId));
  }

  return {
    KEY_LIMIT_BYTES: KEY_LIMIT_BYTES,
    HISTORY_BUDGET_BYTES: HISTORY_BUDGET_BYTES,
    emptyHistory: emptyHistory,
    normalizeHistory: normalizeHistory,
    utf8Bytes: utf8Bytes,
    createGame: createGame,
    finishGame: finishGame,
    roundEvent: roundEvent,
    buzzEvent: buzzEvent,
    scoreEvent: scoreEvent,
    skipEvent: skipEvent,
    missEvent: missEvent,
    winnerIds: winnerIds,
    summarizeGame: summarizeGame,
    ingest: ingest,
    statsFor: statsFor
  };
});
