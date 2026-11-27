const assert = require('assert');
const history = require('../songhistory.js');

const noted = {};
const first = history.shouldRecord({ uri: 'spotify:track:1', title: ' Blaue Stunde ', artist: ' Mia ' }, noted);
assert.ok(first);
assert.deepStrictEqual(first.payload, { title: 'Blaue Stunde', artist: 'Mia' });
history.markRecorded(noted, first.key);
assert.strictEqual(history.shouldRecord({ uri: 'spotify:track:1', title: 'Blaue Stunde', artist: 'Mia' }, noted), null);

const other = history.shouldRecord({ uri: 'spotify:track:2', title: 'Nur Titel' }, noted);
assert.deepStrictEqual(other.payload, { title: 'Nur Titel' });
assert.strictEqual(history.searchQuery({ title: 'Blaue Stunde', artist: 'Mia' }), 'Blaue Stunde Mia');
assert.strictEqual(history.searchQuery({ title: 'Nur Titel' }), 'Nur Titel');

const sources = [
  { source: 'imposter', sourceName: 'Imposter-Dance-Songs', count: 2 },
  { source: 'leer', sourceName: 'Leer', count: 0 },
  { source: 'wolf', sourceName: 'Werwolf', count: 1 }
];
const songs = {
  imposter: [
    { title: 'A', artist: 'B', source: 'imposter' },
    { title: '  ', artist: 'Weg' }
  ],
  leer: [],
  wolf: [{ title: 'Mond', source: 'wolf' }]
};
const groups = history.groupSources(sources, songs);
assert.deepStrictEqual(groups.map((row) => row.sourceName), ['Imposter-Dance-Songs', 'Werwolf']);
assert.strictEqual(groups[0].songs.length, 1);
assert.strictEqual(history.presentation([]).mode, 'hidden');
assert.strictEqual(history.presentation(groups).mode, 'buttons');

const many = [];
for (let i = 0; i < history.SELECT_AT; i += 1) {
  many.push({ source: 's' + i, sourceName: 'Quelle ' + i, songs: [{ title: 'T' + i }] });
}
assert.strictEqual(history.presentation(many).mode, 'select');

assert.strictEqual(history.showPanel(false), false);
assert.strictEqual(history.hasApi(null), false);
assert.strictEqual(history.hasApi({ songHistory: { add: function () {}, list: function () {} } }), false);
assert.strictEqual(history.hasApi({
  songHistory: { add: function () {}, list: function () {}, sources: function () {} }
}), true);
assert.strictEqual(history.showPanel(history.hasApi(null)), false);

console.log('songhistory ok');
