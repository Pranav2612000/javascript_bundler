import JestHasteMap from 'jest-haste-map';
import Resolver from 'jest-resolve';
import { DependencyResolver } from 'jest-resolve-dependencies';
import chalk from 'chalk';
import yargs from 'yargs';

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

const resolver = new Resolver.default(moduleMap, {
    extensions: ['.js'],
    hasCoreModules: false,
    rootDir: root
});
const dependencyResolver = new DependencyResolver(resolver, hasteFS);
