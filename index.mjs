import JestHasteMap from 'jest-haste-map';
import Resolver from 'jest-resolve';
import { DependencyResolver } from 'jest-resolve-dependencies';
import chalk from 'chalk';
import yargs from 'yargs';
import fs from 'fs';

import { cpus } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// get the entrypoint passed by the user
const options = yargs(process.argv).argv;
const entryPoint = resolve(process.cwd(), options.entryPoint || "");

// get the root of the project
const root = join(dirname(fileURLToPath(import.meta.url)));

// https://github.com/facebook/jest/blob/bb39cb2c617a3334bf18daeca66bd87b7ccab28b/packages/jest-haste-map/src/index.ts#L58
const hasteMapConfig = {
    extensions: ['js'],
    maxWorkers: cpus.length,
    name: 'jest-bundler',
    platforms: [],
    rootDir: root,
    roots: [ root ]
}

const hasteMap = new JestHasteMap.default(hasteMapConfig);

await hasteMap.setupCachePath(hasteMapConfig);

const { hasteFS, moduleMap } = await hasteMap.build();

// verify that the entrypoint passed by the user is a valid file
if (!hasteFS.exists(entryPoint)) {
    throw new Error(
        '`--entry-point` does not exist. Please provide a path to a valid file in this scope'
    );
}

console.log(chalk.bold(`> Building ${chalk.blue(options.entryPoint)}`));

// create dependencyResolver to get the exact paths for each module
const resolver = new Resolver.default(moduleMap, {
    extensions: ['.js'],
    hasCoreModules: false,
    rootDir: root
});
const dependencyResolver = new DependencyResolver(resolver, hasteFS);

// We use a set to keep a track of all the modules that have been processed
// This helps us handle circular dependencies by ensuring that we don't process modules more than once
const processedModules = new Set();

// we store the code and dependencies of the modules we've processed in this map
const modulesMetadata = new Map();

// Used as a generator for the id we'll be assigning to each module - The id helps us in requiring and
// resolving the modules later
let id = 0;

const queue = [ entryPoint ];
while (queue.length) {
    const module = queue.shift();

    // If we have already processed this module before
    // we skip processing for this module
    if (processedModules.has(module)) {
        continue;
    }
    processedModules.add(module);

    console.log(chalk.bold(`>>>> Processing ${chalk.green(module)} file`));
    // Resolve each dependency of the current module and store it in a map
    // containing its name and actual resolved path of its code
    const dependencyMap = new Map(
        hasteFS
            .getDependencies(module) // get all the dependencies of current module
            .map((dependencyName) => [  // and for each return its resolved path
                dependencyName,
                resolver.resolveModule(module, dependencyName)
            ]),
    );

    // read the contents of the current file
    const contents = fs.readFileSync(module, 'utf-8');

    const metadata = {
        id: id++,
        code: contents,
        dependencyMap
    }
    modulesMetadata.set(module, metadata);

    queue.push( ...dependencyMap.values());
}

console.log(chalk.bold(`> Found ${chalk.blue(processedModules.size)} files`));
console.log(Array.from(modulesMetadata.keys()));

// Now we write the actual bundling/processing logic
// We start by traversing the modulesMetadata in reverse order to process entry-point.js last
for (const [module, metadata] of Array.from(modulesMetadata).reverse()) {

    // extract the code for that component from metadata, so that we can modify it later - to
    // change require statements with actual code for the dependency.
    let { code } = metadata;

    // We iterate through all the dependency this module has.
    // This will be empty for root modules and hence this loop will not run for them.
    for (const [dependencyName, dependencyPath] of metadata.dependencyMap) {

        // we use a magic Regular Expression to replace the require statements in
        // the code with actual code,  essentially resolving the dependency.
        code = code.replace(
            new RegExp(
                `require\\(('|")${dependencyName.replace(/[\/.]/g, '\\$&')}\\1\\)`,
            ),
            modulesMetadata.get(dependencyPath).code, // get the actual code to replace the require by from our map
        );
    }

    // Update the code for this module with resolved code. Now all modules which depend on it
    // can use the module name to search the map and will retrive this resolved code
    metadata.code = code;
}

console.log(modulesMetadata.get(entryPoint).code);

if (options.output) {
}
