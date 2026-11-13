const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(path.join(directory, entry.name)) : entry.name.endsWith('.tsx') ? [path.join(directory, entry.name)] : []);
}

test('every native press target and switch owns feedback; wheel rows delegate to tick', () => {
  for (const file of files(root)) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        const property = tag === 'Switch' ? 'onValueChange' : ['Pressable', 'Text'].includes(tag) ? 'onPress' : undefined;
        const handler = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.text === property);
        if (handler) {
          const text = handler.initializer.getText(source);
          if (file.endsWith('WorkoutNumberWheel.tsx')) assert.match(text, /onTap\(index\)/);
          else assert.match(text, /feedback\(\)/, `${file}: ${text}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test('shared Button, IconButton and Chip emit exactly one selection per action', () => {
  const source = ts.createSourceFile('ui.tsx', fs.readFileSync(path.join(root, 'ui.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const name of ['Button', 'IconButton', 'Chip']) {
    const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    let ticks = 0, presses = 0;
    const globals = {
      exports: {}, require, Pressable: 'Pressable', Text: 'Text', AppIcon: 'AppIcon', symbolIcons: {},
      feedback: () => ticks++, useTheme: () => ({ colors: {}, styles: {} }),
      useContext: () => null, SheetDismissContext: {},
    };
    const compiled = ts.transpileModule(declaration.getText(source), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const component = new Function(...Object.keys(globals), `${compiled}; return exports.${name};`)(...Object.values(globals));
    const node = component({ label: name, onPress: () => presses++ });
    assert.equal(ticks, 0);
    node.props.onPress();
    assert.equal(ticks, 1, name);
    assert.equal(presses, 1, name);
    if (name !== 'Chip') assert.equal(component({ label: name, disabled: true, onPress() {} }).props.disabled, true);
  }
});
