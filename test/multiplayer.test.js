const assert = require('assert');
const mp = require('../multiplayer.js');
const players = require('../players.js');

const offset = mp.ntpOffset(1000, 1100, 1110, 1200);
assert.strictEqual(offset, 5);
assert.strictEqual(mp.ntpDelay(1000, 1100, 1110, 1200), 190);

const clock = mp.createClock();
mp.pushSample(clock, 40, 80);
mp.pushSample(clock, 12, 20);
mp.pushSample(clock, 4, 50);
assert.strictEqual(mp.clockOffset(clock), 12);
assert.strictEqual(mp.clockOffset(mp.createClock()), 0);

const table = mp.openBuzz();
assert.strictEqual(mp.settleBuzz(table, 0), null);
const first = mp.takeBuzz(table, { device: 'a', seq: 1, at: 1000 }, 5000);
assert.deepStrictEqual(first, { ok: true, first: true });
assert.deepStrictEqual(mp.takeBuzz(table, { device: 'a', seq: 2, at: 1005 }, 5010), { ok: false, reason: 'dup' });
assert.strictEqual(mp.settleBuzz(table, 5030), null);
mp.takeBuzz(table, { device: 'b', seq: 1, at: 1010 }, 5040);
assert.deepStrictEqual(mp.settleBuzz(table, 5060), { kind: 'tie' });
assert.deepStrictEqual(mp.takeBuzz(table, { device: 'c', seq: 1, at: 900 }, 5100), { ok: false, reason: 'closed' });

const win = mp.openBuzz();
mp.takeBuzz(win, { device: 'a', seq: 1, at: 2000 }, 100);
mp.takeBuzz(win, { device: 'b', seq: 1, at: 2015 }, 120);
assert.deepStrictEqual(mp.settleBuzz(win, 160), { kind: 'win', device: 'a', at: 2000 });

const close = mp.openBuzz();
mp.takeBuzz(close, { device: 'host', seq: 1, at: 3000 }, 10);
mp.takeBuzz(close, { device: 'gast', seq: 4, at: 3015 }, 40);
assert.strictEqual(mp.settleBuzz(close, 70).kind, 'win');

assert.strictEqual(mp.localBuzzLit({ pressed: true, settled: false, winner: '', self: 'a' }), true);
assert.strictEqual(mp.localBuzzLit({ pressed: true, settled: true, winner: 'a', self: 'a' }), true);
assert.strictEqual(mp.localBuzzLit({ pressed: true, settled: true, winner: 'b', self: 'a' }), false);
assert.strictEqual(mp.localBuzzLit({ pressed: false, settled: false, winner: '', self: 'b' }), false);
assert.strictEqual(mp.localBuzzLit({ pressed: false, settled: true, winner: 'b', self: 'b' }), false);

let order = mp.arrange(['a', 'b', 'c', 'd'], [], []);
assert.deepStrictEqual(order, ['a', 'b', 'c', 'd']);
let locked = mp.lockIn([], 'b');
order = mp.arrange(['a', 'b', 'c', 'd'], locked, order);
assert.deepStrictEqual(order, ['b', 'a', 'c', 'd']);
locked = mp.lockIn(locked, 'd');
order = mp.arrange(['a', 'b', 'c', 'd'], locked, order);
assert.deepStrictEqual(order, ['b', 'd', 'a', 'c']);
order = mp.arrange(['a', 'b', 'c', 'd', 'e'], locked, order);
assert.deepStrictEqual(order, ['b', 'd', 'a', 'c', 'e']);
assert.deepStrictEqual(mp.lockIn(locked, 'b'), locked.concat());
assert.deepStrictEqual(mp.unlockLast(['b', 'd'], 'd'), ['b']);
assert.deepStrictEqual(mp.unlockLast(['b', 'd'], 'b'), ['b', 'd']);

const roster = [
  { id: 1, first: 'Max', last: 'Bausch' },
  { id: 2, first: 'Anna', last: 'Kranz' }
];
assert.ok(mp.duplicateName(roster, 'max', 'bausch', players.normalize, null));
assert.strictEqual(mp.duplicateName(roster, 'José', 'Kranz', players.normalize, null), null);
assert.strictEqual(mp.duplicateName(roster, 'Max', 'Bausch', players.normalize, 1), null);
assert.strictEqual(mp.removalBlock(2, 2, null), 'Diese Person ist gerade dran und kann nicht weg.');
assert.strictEqual(mp.removalBlock(2, 1, 2), 'Diese Person ist gerade dran und kann nicht weg.');
assert.strictEqual(mp.removalBlock(2, 1, 3), '');

const hidden = mp.shareState({
  phase: 'playing',
  players: roster,
  round: { djId: 1, secretTitle: 'Geheim', secretArtist: 'Band', uri: 'spotify:track:abc', lock: true },
  directory: [{ id: 'p_1', first: 'Max', last: 'Bausch' }]
});
assert.strictEqual(hidden.round.secretTitle, '');
assert.strictEqual(hidden.round.secretArtist, '');
assert.strictEqual(JSON.stringify(hidden).indexOf('spotify:track:abc'), -1);
assert.strictEqual(JSON.stringify(hidden).indexOf('Geheim'), -1);

const shown = mp.shareState({
  phase: 'reveal',
  players: [],
  round: { secretTitle: 'Geheim', secretArtist: 'Band', outcome: 'correct', outcomeWho: 'Anna' }
});
assert.strictEqual(shown.round.secretTitle, 'Geheim');
assert.strictEqual(shown.round.outcomeWho, 'Anna');

const bulky = mp.shareState({
  phase: 'setup',
  players: roster,
  directory: new Array(4000).fill({ id: 'p_x', first: 'Maximilian', last: 'Bauschmann' })
});
const packed = mp.pack(bulky);
assert.ok(packed);
assert.strictEqual(packed.directoryOmitted, true);
assert.ok(mp.utf8Bytes(JSON.stringify(packed)) <= mp.MAX_BYTES);
assert.strictEqual(mp.pack({ t: 'no', text: 'x' }).text, 'x');

const kept = mp.normalizeOrder({ v: 1, locked: ['p_a', ''], seen: ['p_b'] });
assert.deepStrictEqual(kept.locked, ['p_a']);
assert.deepStrictEqual(mp.normalizeOrder(null), { v: 1, locked: [], seen: [] });

assert.strictEqual(mp.isBrowserGuest(null), false);
assert.strictEqual(mp.isBrowserGuest({}), false);
assert.strictEqual(mp.isBrowserGuest({ guest: false }), false);
assert.strictEqual(mp.isBrowserGuest({ guest: 'true' }), false);
assert.strictEqual(mp.isBrowserGuest({ guest: true }), true);

const lateFlags = [];
let lateBridge = { guest: false, multiplayer: { onResumed: function (fn) { lateBridge._resume = fn; } } };
const lateTimers = [];
const lateDoc = {
  addEventListener: function (name, fn) {
    assert.strictEqual(name, 'DOMContentLoaded');
    this.fn = fn;
  }
};
mp.armGuestRetry({
  getBridge: function () { return lateBridge; },
  document: lateDoc,
  setTimeout: function (fn) { lateTimers.push(fn); return lateTimers.length; },
  tries: 4,
  gap: 20
}, function (guest) { lateFlags.push(guest); });
assert.strictEqual(lateFlags[0], false);
lateDoc.fn();
assert.strictEqual(lateFlags[lateFlags.length - 1], false);
lateBridge.guest = true;
lateTimers[0]();
assert.strictEqual(lateFlags[lateFlags.length - 1], true);

const afterLoad = [];
let held = null;
mp.armGuestRetry({
  getBridge: function () { return held; },
  document: { addEventListener: function () {} },
  setTimeout: function (fn) { fn(); return 1; },
  tries: 2,
  gap: 1
}, function (guest) { afterLoad.push(guest); });
assert.ok(afterLoad.indexOf(false) !== -1);
held = { guest: true };
assert.strictEqual(mp.isBrowserGuest(held), true);

const resumed = [];
const shim = {
  guest: false,
  multiplayer: {
    onResumed: function (fn) { this.fn = fn; }
  }
};
mp.armGuestRetry({
  getBridge: function () { return shim; },
  document: { addEventListener: function () {} },
  setTimeout: function () { return 0; },
  tries: 0,
  gap: 1
}, function (guest) { resumed.push(guest); });
shim.guest = true;
shim.multiplayer.fn();
assert.strictEqual(resumed[resumed.length - 1], true);

console.log('multiplayer ok');
