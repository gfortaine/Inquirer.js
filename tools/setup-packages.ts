import path from 'node:path';
import fs from 'node:fs';
import { globby } from 'globby';

const paths = await globby([
  'packages/**/package.json',
  '!**/node_modules',
  // The inquirer package is not on TS yet; so ignore it for now.
  '!packages/inquirer',
]);

console.log(paths);
paths.forEach(async (pkgPath) => {
  const dir = path.dirname(pkgPath);

  // Set multi-module system builds exports
  const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf-8'));
  pkg.exports = {
    '.': {
      import: {
        types: './dist/esm/types/index.d.ts',
        default: './dist/esm/index.mjs',
      },
      require: {
        types: './dist/cjs/types/index.d.ts',
        default: './dist/cjs/index.js',
      },
    },
  };
  pkg.main = './dist/cjs/index.js';
  pkg.files = ['dist/**/*'];
  delete pkg.typings;
  delete pkg.type;
  pkg.scripts = {
    tsc: 'yarn run tsc:esm && yarn run tsc:cjs',
    'tsc:esm': 'tsc -p ./tsconfig.esm.json && mv dist/esm/index.js dist/esm/index.mjs',
    'tsc:cjs': 'tsc -p ./tsconfig.cjs.json',
  };
  await fs.promises.writeFile(pkgPath, JSON.stringify(pkg, null, 2));

  // Set CJS tsconfig
  const cjsTsconfig = {
    extends: '../../tsconfig.json',
    compilerOptions: {
      lib: ['ES6'],
      target: 'ES6',
      module: 'CommonJS',
      moduleResolution: 'Node',
      outDir: '../dist/cjs',
      declarationDir: '../dist/cjs/types',
    },
  };
  await fs.promises.writeFile(
    path.join(dir, 'tsconfig.cjs.json'),
    JSON.stringify(cjsTsconfig, null, 2)
  );

  // Set ESM tsconfig
  const esmTsconfig = {
    extends: '../../tsconfig.json',
    compilerOptions: {
      lib: ['ES2022'],
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'NodeNext',
      outDir: '../lib/esm',
      declarationDir: '../lib/esm/types',
    },
  };
  await fs.promises.writeFile(
    path.join(dir, 'tsconfig.esm.json'),
    JSON.stringify(esmTsconfig, null, 2)
  );
});
