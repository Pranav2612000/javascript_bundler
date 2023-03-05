const modules = new Map(); // a map to store all the modules we encounter
const define = (name, moduleFactory) => {
  modules.set(name, moduleFactory);
}

// We also declare another map to keep track of the modules we've already
// imported.
const moduleCache = new Map();

// We create a custom function to handle 'require'
const requireModule = (name) => {

  // if this module has already been `required`, the exports have already been
  // populated and we can just return them
  if (moduleCache.has(name)) {
    return moduleCache.get(name).exports;
  }

  // if the module doesn't exist in the modules map, it most probably does not exist
  if (!modules.has(name)) {
    throw new Error(`Module ${name} does not exist`);
  }

  // We get the module factory for this module
  const moduleFactory = modules.get(name);

  // and populate the module.exports for this module using the module factory
  const module = {
    exports: {}
  };
  moduleFactory(module, module.exports, requireModule);

  // update the moduleCache to ensure we don't populate this module's exports again
  moduleCache.set(module, module);

  return module.exports;
}
