const assert = require('assert');
const players = require('../players.js');
const stats = require('../stats.js');

function fixedRandom() {
  let n = 0;
  return function () {
    n += 1;
    return (n % 36) / 36;
  };
}

const max = players.createPlayer('  Maximilian ', ' Bausch ', 1_700_000_000_000, function () { return 0; });
assert.strictEqual(max.first, 'Maximilian');
assert.strictEqual(max.last, 'Bausch');
assert.strictEqual(max.created, 1_700_000_000_000);
assert.strictEqual(max.id, 'p_' + (1_700_000_000_000).toString(36) + '0000');
assert.strictEqual(players.createPlayer('Max', '  '), null);
assert.strictEqual(players.createPlayer('', 'Bausch'), null);

assert.strictEqual(players.normalize('  José '), 'jose');
assert.strictEqual(players.normalize('Müller'), 'muller');
assert.strictEqual(players.normalize('Ångström'), 'angstrom');

const directory = [
  max,
  players.createPlayer('Maria', 'Sommer', 10, fixedRandom()),
  players.createPlayer('Max', 'Sommer', 11, fixedRandom()),
  players.createPlayer('Max', 'Bauer', 12, fixedRandom()),
  players.createPlayer('Anna', 'Kranz', 13, fixedRandom()),
  players.createPlayer('Tamara', 'Holz', 14, fixedRandom())
];

const ma = players.search(directory, 'ma', []);
assert.ok(ma.some((player) => player.id === max.id));
assert.ok(players.search(directory, 'Bausch', []).some((player) => player.id === max.id));
assert.deepStrictEqual(players.search(directory, 'ma', [max.id]).map((player) => player.id).includes(max.id), false);

const ranked = players.search(directory, 'ma', []);
const maxAt = ranked.findIndex((player) => player.id === max.id);
const tamaraAt = ranked.findIndex((player) => player.first === 'Tamara');
assert.ok(maxAt !== -1 && tamaraAt !== -1 && maxAt < tamaraAt, 'Präfix vor Teiltreffer');

const alpha = players.search(directory, '', []).map((player) => player.first + ' ' + player.last);
assert.deepStrictEqual(alpha, alpha.slice().sort((a, b) => players.normalize(a).localeCompare(players.normalize(b), 'de')));

const jose = { id: 'a', first: 'José', last: 'Klein' };
const jose2 = { id: 'b', first: 'Jose', last: 'Groß' };
const labels = players.displayNames([
  { id: 'm1', first: 'Max', last: 'Bausch' },
  { id: 'm2', first: 'Max', last: 'Sommer' },
  { id: 'solo', first: 'Anna', last: 'Kranz' }
]);
assert.deepStrictEqual(labels.map((row) => row.name), ['Max B.', 'Max S.', 'Anna']);

const full = players.displayNames([
  { id: 'm1', first: 'Max', last: 'Bausch' },
  { id: 'm2', first: 'Max', last: 'Bauer' },
  { id: 'm3', first: 'Max', last: 'Sommer' }
]);
assert.deepStrictEqual(full.map((row) => row.name), ['Max Bausch', 'Max Bauer', 'Max S.']);
assert.deepStrictEqual(players.displayNames([jose, jose2]).map((row) => row.name), ['José K.', 'Jose G.']);

function gameFor(id, dj, guesser, track, sec, ptsWrong) {
  const game = stats.createGame([dj, guesser, 'p_other'], 1_000, function () { return 0.5; });
  game.id = id;
  game.events.push(stats.roundEvent(dj, 'spotify:track:' + track, 'Lied ' + track, 'Band'));
  if (ptsWrong) {
    game.events.push(stats.buzzEvent(guesser, 1.2));
    game.events.push(stats.scoreEvent(guesser, false, -1));
  }
  game.events.push(stats.buzzEvent(guesser, sec));
  game.events.push(stats.scoreEvent(guesser, true, 2, sec));
  game.events.push(stats.skipEvent(dj, -3));
  return stats.finishGame(game, 5_000);
}

const dj = 'p_dj';
const fan = 'p_fan';
let history = stats.emptyHistory();
history = stats.ingest(history, gameFor('g1', dj, fan, 'aaa', 4.2, true));
history = stats.ingest(history, gameFor('g2', fan, dj, 'bbb', 8, false));

const fanStats = stats.statsFor(history, fan);
assert.strictEqual(fanStats.points, -2);
assert.strictEqual(fanStats.games, 2);
assert.strictEqual(fanStats.wins, 1);
assert.strictEqual(fanStats.djSongs.length, 1);
assert.strictEqual(fanStats.djSongs[0].id, 'bbb');
assert.strictEqual(fanStats.djSongs[0].count, 1);
assert.strictEqual(fanStats.guessed.length, 1);
assert.strictEqual(fanStats.guessed[0].id, 'aaa');
assert.deepStrictEqual(fanStats.guessed[0].seconds, [4.2]);
assert.strictEqual(fanStats.guessed[0].average, 4.2);

const before = stats.statsFor(history, dj);
const folded = history.games.reduce((doc, game) => stats.ingest(doc, game, 1), stats.emptyHistory());
assert.strictEqual(folded.games.length, 1);
const after = stats.statsFor(folded, dj);
assert.strictEqual(after.points, before.points);
assert.strictEqual(after.games, before.games);
assert.strictEqual(after.wins, before.wins);
assert.strictEqual(after.djSongs[0].count, before.djSongs[0].count);
assert.strictEqual(after.guessed[0].count, before.guessed[0].count);
assert.strictEqual(Math.round(after.guessed[0].average * 10), Math.round(before.guessed[0].average * 10));

const tie = stats.createGame(['p_a', 'p_b'], 1, function () { return 0; });
tie.events.push(stats.roundEvent('p_a', 'spotify:track:z', 'Z', 'Q'));
tie.events.push(stats.missEvent('p_a', -3));
tie.events.push(stats.scoreEvent('p_b', true, 2, 9));
assert.deepStrictEqual(stats.winnerIds(tie), ['p_b']);
tie.events.push(stats.scoreEvent('p_a', true, 5, 3));
assert.deepStrictEqual(stats.winnerIds(stats.finishGame(tie, 2)), []);

const fresh = stats.emptyHistory();
const untouched = JSON.stringify(fresh);
stats.ingest(fresh, gameFor('g3', dj, fan, 'ccc', 3, false));
assert.strictEqual(JSON.stringify(fresh), untouched);

console.log('logic ok');
