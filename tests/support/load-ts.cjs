const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function loadTs(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const resolve = name => {
    if (name in mocks) return mocks[name];
    if (name === 'server-only') return {};
    if (name === 'react') return {...require('react'),cache:fn=>fn};
    if (name.startsWith('@/')) return loadTs(path.resolve(name.slice(2)+'.ts'),mocks,globals);
    if (name.startsWith('.')) return loadTs(path.resolve(path.dirname(file),name+'.ts'),mocks,globals);
    return require(name);
  };
  vm.runInNewContext(source,{module,exports:module.exports,require:resolve,process,URL,console,File,FormData,Buffer,crypto:require('node:crypto').webcrypto,...globals},{filename:file});
  return module.exports;
}
module.exports={loadTs};
