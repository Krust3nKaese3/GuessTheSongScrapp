/*
 * Lokaler Mehrspieler: Nachrichten, Buzz-Entscheidung, Anzeigereihenfolge.
 * Keine Bridge, kein DOM. Die OpenScr-Bridge transportiert nur JSON bis 32 KiB.
 *
 * songraten.order.v1 (nur dieses Handy): {"v":1,"locked":[pid...],"seen":[pid...]}
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpenScrMultiplayer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_BYTES = 32 * 1024;
  const TIE_MS = 15;
  const DECISION_MS = 60;
  const ORDER_KEY = 'songraten.order.v1';

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

  function ntpOffset(t1, t2, t3, t4) {
    return ((Number(t2) - Number(t1)) + (Number(t3) - Number(t4))) / 2;
  }

  function ntpDelay(t1, t2, t3, t4) {
    return (Number(t4) - Number(t1)) - (Number(t3) - Number(t2));
  }

  function createClock() {
    return { samples: [] };
  }

  function pushSample(clock, offset, delay) {
    const sample = { offset: Number(offset), delay: Number(delay) };
    if (!clock || !isFinite(sample.offset) || !isFinite(sample.delay) || sample.delay < 0) return;
    clock.samples.push(sample);
    if (clock.samples.length > 8) clock.samples.shift();
  }

  function clockOffset(clock) {
    if (!clock || !clock.samples.length) return 0;
    let best = clock.samples[0];
    clock.samples.forEach((sample) => {
      if (sample.delay < best.delay) best = sample;
    });
    return best.offset;
  }

  function openBuzz() {
    return { open: true, buzzes: [], decided: null, since: 0 };
  }

  function takeBuzz(table, buzz, now) {
    if (!table || !table.open || table.decided) return { ok: false, reason: 'closed' };
    if (!buzz || buzz.device == null || buzz.device === '') return { ok: false, reason: 'bad' };
    const seq = Number(buzz.seq);
    const at = Number(buzz.at);
    if (!isFinite(seq) || !isFinite(at)) return { ok: false, reason: 'bad' };
    const device = String(buzz.device);
    if (table.buzzes.some((row) => row.device === device)) return { ok: false, reason: 'dup' };
    const first = table.buzzes.length === 0;
    table.buzzes.push({ device: device, seq: seq, at: at, recv: Number(now) || 0 });
    if (first) table.since = Number(now) || 0;
    return { ok: true, first: first };
  }

  function settleBuzz(table, now, tieMs, windowMs) {
    if (!table || !table.open || table.decided) return table ? table.decided : null;
    if (!table.buzzes.length) return null;
    const wait = windowMs == null ? DECISION_MS : windowMs;
    if ((Number(now) || 0) - table.since < wait) return null;
    const sorted = table.buzzes.slice().sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      if (a.recv !== b.recv) return a.recv - b.recv;
      if (a.device !== b.device) return a.device < b.device ? -1 : 1;
      return a.seq - b.seq;
    });
    const best = sorted[0];
    const result = { kind: 'win', device: best.device, at: best.at };
    table.decided = result;
    table.open = false;
    return result;
  }

  function localBuzzLit(input) {
    if (!input || !input.pressed) return false;
    if (!input.settled) return true;
    return String(input.winner == null ? '' : input.winner) === String(input.self == null ? '' : input.self);
  }

  function arrange(rosterIds, lockedIds, previousIds) {
    const roster = Array.isArray(rosterIds) ? rosterIds : [];
    const index = new Map();
    roster.forEach((id) => {
      if (id == null || id === '') return;
      const key = String(id);
      if (!index.has(key)) index.set(key, id);
    });
    const used = new Set();
    const locked = [];
    (lockedIds || []).forEach((id) => {
      const key = String(id);
      if (!index.has(key) || used.has(key)) return;
      used.add(key);
      locked.push(index.get(key));
    });
    const rest = [];
    (previousIds || []).forEach((id) => {
      const key = String(id);
      if (!index.has(key) || used.has(key)) return;
      used.add(key);
      rest.push(index.get(key));
    });
    const fresh = [];
    roster.forEach((id) => {
      const key = String(id);
      if (!index.has(key) || used.has(key)) return;
      if (index.get(key) !== id) return;
      used.add(key);
      fresh.push(id);
    });
    return locked.concat(rest, fresh);
  }

  function lockIn(locked, id) {
    const list = Array.isArray(locked) ? locked.slice() : [];
    if (id == null || id === '') return list;
    if (list.some((item) => String(item) === String(id))) return list;
    list.push(id);
    return list;
  }

  function unlockLast(locked, id) {
    const list = Array.isArray(locked) ? locked.slice() : [];
    if (!list.length || id == null || id === '') return list;
    if (String(list[list.length - 1]) !== String(id)) return list;
    list.pop();
    return list;
  }

  function fullKey(first, last, normalize) {
    const norm = typeof normalize === 'function' ? normalize : function (value) {
      return String(value == null ? '' : value).trim().toLowerCase();
    };
    return norm((String(first == null ? '' : first).trim() + ' ' + String(last == null ? '' : last).trim()).trim());
  }

  function duplicateName(players, first, last, normalize, exceptId) {
    const key = fullKey(first, last, normalize);
    if (!key) return null;
    const list = Array.isArray(players) ? players : [];
    for (let i = 0; i < list.length; i += 1) {
      const player = list[i];
      if (!player) continue;
      if (exceptId != null && String(player.id) === String(exceptId)) continue;
      if (fullKey(player.first, player.last, normalize) === key) return player;
    }
    return null;
  }

  function removalBlock(playerId, djId, guesserId) {
    if (playerId == null || playerId === '') return 'Nicht gefunden.';
    if (String(playerId) === String(djId) || String(playerId) === String(guesserId)) {
      return 'Diese Person ist gerade dran und kann nicht weg.';
    }
    return '';
  }

  function clip(value, max) {
    const text = String(value == null ? '' : value);
    return text.length > max ? text.slice(0, max) : text;
  }

  function shareState(input) {
    const src = input || {};
    const phase = src.phase || 'setup';
    const showTitle = phase === 'reveal' || phase === 'final';
    const round = src.round && typeof src.round === 'object' ? src.round : null;
    const players = Array.isArray(src.players) ? src.players : [];
    return {
      t: 'state',
      v: 1,
      phase: phase,
      players: players.map((player) => ({
        id: player.id,
        pid: player.pid || '',
        first: clip(player.first, 40),
        last: clip(player.last, 40),
        score: Number(player.score) || 0
      })),
      directory: Array.isArray(src.directory) ? src.directory.map((player) => ({
        id: player.id,
        first: clip(player.first, 40),
        last: clip(player.last, 40)
      })) : [],
      djId: src.djId == null ? null : src.djId,
      guesserId: src.guesserId == null ? null : src.guesserId,
      songsStarted: Number(src.songsStarted) || 0,
      notice: clip(src.notice, 240),
      info: clip(src.info, 240),
      error: clip(src.error, 240),
      buzzDevice: src.buzzDevice ? String(src.buzzDevice) : '',
      searcherId: src.searcherId ? String(src.searcherId) : '',
      hold: Boolean(src.hold),
      scoredPid: src.scoredPid ? String(src.scoredPid) : '',
      revokePid: src.revokePid ? String(src.revokePid) : '',
      round: round ? {
        djId: round.djId == null ? null : round.djId,
        secretTitle: showTitle ? clip(round.secretTitle, 120) : '',
        secretArtist: showTitle ? clip(round.secretArtist, 120) : '',
        lock: Boolean(round.lock),
        outcome: clip(round.outcome, 40),
        outcomeWho: clip(round.outcomeWho, 80),
        unconfirmed: Boolean(round.unconfirmed),
        paused: Boolean(round.paused)
      } : null
    };
  }

  function pack(message) {
    if (!message || typeof message !== 'object') return null;
    let current = message;
    if (utf8Bytes(JSON.stringify(current)) <= MAX_BYTES) return current;
    if (Array.isArray(current.directory) && current.directory.length) {
      current = {};
      Object.keys(message).forEach((key) => { current[key] = message[key]; });
      current.directory = [];
      current.directoryOmitted = true;
      if (utf8Bytes(JSON.stringify(current)) <= MAX_BYTES) return current;
    }
    return null;
  }

  function emptyOrder() {
    return { v: 1, locked: [], seen: [] };
  }

  function normalizeOrder(raw) {
    if (!raw || raw.v !== 1) return emptyOrder();
    const list = (value) => (Array.isArray(value) ? value.filter((id) => id != null && id !== '').map((id) => String(id)) : []);
    return { v: 1, locked: list(raw.locked), seen: list(raw.seen) };
  }

  function isBrowserGuest(bridge) {
    return Boolean(bridge && bridge.guest === true);
  }

  function armGuestRetry(env, onSee) {
    const opts = env || {};
    const getBridge = typeof opts.getBridge === 'function' ? opts.getBridge : function () { return null; };
    const setTimer = opts.setTimeout || setTimeout;
    const max = opts.tries == null ? 12 : opts.tries;
    const gap = opts.gap == null ? 200 : opts.gap;
    let tries = 0;
    let hooked = false;
    let stopped = false;

    function bridgeNow() {
      try { return getBridge() || null; } catch (error) { return null; }
    }

    function see() {
      if (stopped) return false;
      const bridge = bridgeNow();
      const guest = isBrowserGuest(bridge);
      const mp = bridge && bridge.multiplayer;
      if (!hooked && opts.hookResume !== false && mp && typeof mp.onResumed === 'function') {
        hooked = true;
        try { mp.onResumed(function () { see(); }); } catch (error) {}
      }
      try { onSee(guest); } catch (error) {}
      return guest;
    }

    function tick() {
      if (stopped || see() || tries >= max) return;
      tries += 1;
      setTimer(tick, gap);
    }

    const doc = opts.document;
    if (doc && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', see);
    }
    tick();
    return function stop() { stopped = true; };
  }

  return {
    MAX_BYTES: MAX_BYTES,
    TIE_MS: TIE_MS,
    DECISION_MS: DECISION_MS,
    ORDER_KEY: ORDER_KEY,
    utf8Bytes: utf8Bytes,
    ntpOffset: ntpOffset,
    ntpDelay: ntpDelay,
    createClock: createClock,
    pushSample: pushSample,
    clockOffset: clockOffset,
    openBuzz: openBuzz,
    takeBuzz: takeBuzz,
    settleBuzz: settleBuzz,
    localBuzzLit: localBuzzLit,
    arrange: arrange,
    lockIn: lockIn,
    unlockLast: unlockLast,
    fullKey: fullKey,
    duplicateName: duplicateName,
    removalBlock: removalBlock,
    shareState: shareState,
    pack: pack,
    emptyOrder: emptyOrder,
    normalizeOrder: normalizeOrder,
    isBrowserGuest: isBrowserGuest,
    armGuestRetry: armGuestRetry
  };
});
