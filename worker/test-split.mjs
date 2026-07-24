import { splitForTelegram } from './src/index.js';
import assert from 'assert';

console.log('Running Telegram message splitter tests...\n');

let testsPassed = 0;

try {
  // Test 1: 50 000-char text splits into parts each <= 4096
  const linePattern = 'Cette ligne contient du texte de soumission pour le test de découpage.\n';
  const longText = linePattern.repeat(Math.ceil(50000 / linePattern.length));
  assert(longText.length >= 50000, 'Test 1 setup: text should be at least 50k chars');

  const parts1 = splitForTelegram(longText, 3900);
  assert(parts1.length > 1, 'Test 1: long text should produce multiple parts');
  parts1.forEach((part, i) => {
    assert(part.length <= 4096, `Test 1: part ${i + 1} length (${part.length}) exceeds 4096`);
  });
  console.log(`[PASS] Test 1: 50,000-char text split into ${parts1.length} parts, all <= 4096 chars.`);
  testsPassed++;

  // Test 2: Single 10 000-char line with no newlines yields parts each <= 4096
  const singleLongLine = 'X'.repeat(10000);
  const parts2 = splitForTelegram(singleLongLine, 3900);
  assert(parts2.length > 1, 'Test 2: long single line should produce multiple parts');
  parts2.forEach((part, i) => {
    assert(part.length <= 4096, `Test 2: part ${i + 1} length (${part.length}) exceeds 4096`);
  });
  console.log(`[PASS] Test 2: 10,000-char single line split into ${parts2.length} parts, all <= 4096 chars.`);
  testsPassed++;

  // Test 3: Short text yields exactly one part with no (partie ...) marker
  const shortText = '📚 Nouvelle soumission\n👤 Étudiant: Jean Dupont\n\n1. Question?\n✍️ Réponse';
  const parts3 = splitForTelegram(shortText, 3900);
  assert.strictEqual(parts3.length, 1, 'Test 3: short text should yield exactly 1 part');
  assert(!parts3[0].includes('(partie '), 'Test 3: single part should not have part marker');
  assert.strictEqual(parts3[0], shortText, 'Test 3: content should match exactly');
  console.log('[PASS] Test 3: Short text yields 1 part without part marker.');
  testsPassed++;

  // Test 4: Rejoining parts (minus markers) preserves original content
  const stripMarker = (part) => part.replace(/^\(partie \d+\/\d+\)\n/, '');

  const rejoined1 = parts1.map(stripMarker).join('');
  assert.strictEqual(rejoined1, longText, 'Test 4a: rejoined 50k text must equal original long text');

  const rejoined2 = parts2.map(stripMarker).join('');
  assert.strictEqual(rejoined2, singleLongLine, 'Test 4b: rejoined 10k single line must equal original line');

  console.log('[PASS] Test 4: Rejoining parts minus markers preserves exact original content.');
  testsPassed++;

  // Test 5: a hard cut must never land inside an HTML entity emitted by esc().
  // A part ending in a dangling "&amp" fragment makes Telegram reject the whole
  // message with "can't parse entities".
  const entityLine = 'Les arbres &amp; les fleurs &amp; la nature '.repeat(400);
  const parts5 = splitForTelegram(entityLine, 3900);
  assert(parts5.length > 1, 'Test 5: setup should produce multiple parts');
  parts5.forEach((part, i) => {
    assert(part.length <= 4096, `Test 5: part ${i + 1} exceeds 4096`);
    const tail = part.slice(-12);
    const amp = tail.lastIndexOf('&');
    assert(
      amp === -1 || tail.slice(amp).includes(';'),
      `Test 5: part ${i + 1} ends with a truncated HTML entity: ${JSON.stringify(tail)}`
    );
  });
  assert.strictEqual(parts5.map(stripMarker).join(''), entityLine, 'Test 5: content must be preserved');
  console.log(`[PASS] Test 5: ${parts5.length} parts, no part ends inside an HTML entity.`);
  testsPassed++;

  // Test 6: a hard cut must never split a surrogate pair (emoji) in half.
  const emojiLine = '🎓 réponse de l’étudiant 📚 '.repeat(600);
  const parts6 = splitForTelegram(emojiLine, 3900);
  assert(parts6.length > 1, 'Test 6: setup should produce multiple parts');
  parts6.forEach((part, i) => {
    assert(part.length <= 4096, `Test 6: part ${i + 1} exceeds 4096`);
    const last = part.charCodeAt(part.length - 1);
    assert(!(last >= 0xd800 && last <= 0xdbff), `Test 6: part ${i + 1} ends on a lone high surrogate`);
    const first = part.charCodeAt(0);
    assert(!(first >= 0xdc00 && first <= 0xdfff), `Test 6: part ${i + 1} starts on a lone low surrogate`);
  });
  assert.strictEqual(parts6.map(stripMarker).join(''), emojiLine, 'Test 6: content must be preserved');
  console.log(`[PASS] Test 6: ${parts6.length} parts, no part splits a surrogate pair.`);
  testsPassed++;

  console.log(`\nALL ${testsPassed} TESTS PASSED!`);
} catch (err) {
  console.error('\n[FAIL] Test failed:', err);
  process.exit(1);
}
