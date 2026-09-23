const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(resolve(__dirname, '../src/features/cards/points.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api });
const rewards = [
  { id: 'burger', threshold: 5 },
  { id: 'menu', threshold: 10 },
  { id: 'pizza', threshold: 15 },
];
assert.equal(api.maximumQuantity(15, 5), 3);
assert.equal(api.selectionCost(rewards, { burger: 3 }), 15);
assert.equal(api.selectionCost(rewards, { burger: 1, menu: 1 }), 15);
assert.equal(api.selectionCost(rewards, { pizza: 1 }), 15);
assert.equal(api.selectionCost(rewards, { burger: 1, pizza: 1 }) > 15, true);
assert.equal(api.selectionCost(rewards, {}), 0);
assert.equal(api.selectionCost(rewards, { removedReward: 99 }), 0);
assert.equal(api.maximumQuantity(4, 5), 0);
assert.equal(api.maximumQuantity(16, 5), 3);
assert.equal(16 - api.selectionCost(rewards, { burger: 3 }), 1);
console.log('10 vérifications des choix de récompenses réussies.');
