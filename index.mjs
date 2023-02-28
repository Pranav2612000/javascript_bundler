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

    // and extract the modules defined in this file
    const moduleBody = contents.match(/module\.exports\s+=\s+(.*?);/)?.[1] || '';

    const metadata = {
        code: moduleBody || contents,
        dependencyMap
    }
    modulesMetadata.set(module, metadata);

    queue.push( ...dependencyMap.values());
}

console.log(chalk.bold(`> Found ${chalk.blue(processedModules.size)} files`));
console.log(Array.from(modulesMetadata.keys()));
