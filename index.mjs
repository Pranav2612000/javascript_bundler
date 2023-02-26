import JestHasteMap from 'jest-haste-map';
import { cpus } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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
console.log(hasteFS.getAllFiles(), moduleMap);
