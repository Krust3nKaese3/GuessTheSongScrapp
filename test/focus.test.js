const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const handler = html.slice(html.indexOf("app.addEventListener('pointerdown'"), html.indexOf('app.addEventListener(\'pointerdown\', onBuzzDown)'));
assert.ok(handler.includes('!isTypingTarget(event)'), 'Namensfeld-Tipp darf requestAwake/unlockBuzzer nicht auslösen');
assert.ok(handler.indexOf('!isTypingTarget(event)') < handler.indexOf('unlockBuzzer()'));
assert.ok(handler.indexOf('!isTypingTarget(event)') < handler.indexOf('requestAwake(true)'));

const unlock = html.slice(html.indexOf('function unlockBuzzer()'), html.indexOf('function bytesFromDataUri'));
assert.ok(unlock.includes('focusedTypingField()'), 'Stummes Buzzer-play() nicht während einer Texteingabe');

const wake = html.slice(html.indexOf('function playWakeVideo()'), html.indexOf('function requestAwake'));
assert.ok(wake.indexOf('focusedTypingField()') < wake.indexOf('video.play()'), 'Wake-Video nicht abspielen, solange ein Feld fokussiert ist');

assert.ok(!/addEventListener\(\s*['"]resize['"]/.test(html));
assert.ok(!/visualViewport/.test(html));
