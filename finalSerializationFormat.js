const modules = new Map();
const define = (name, moduleFactory) => {
      modules.set(name, moduleFactory);
};

const moduleCache = new Map();
const requireModule = (name) => {
      if (moduleCache.has(name)) {
              return moduleCache.get(name).exports;
            }

      if (!modules.has(name)) {
              throw new Error(`Module '${name}' does not exist.`);
            }

      const moduleFactory = modules.get(name);
      const module = {
              exports: {},
            };
      moduleCache.set(name, module);
      moduleFactory(module, module.exports, requireModule);
      return module.exports;
};

// tomato.js
define(2, function (module, exports, require) {
  module.exports = 'tomato';
});

// melon.js
define(1, function (module, exports, require) {
  module.exports = 'melon';
});

// kiwi.js
define(0, function (module, exports, require) {
  module.exports = 'kiwi ' + require(1) + ' ' + require(2);
});
const output = requireModule(0);
console.log(output);
