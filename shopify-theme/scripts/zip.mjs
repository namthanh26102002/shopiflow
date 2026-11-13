// Packages base/ into an uploadable Shopify theme ZIP and refuses to write one
// Shopify would reject.
//
// The validation here is deliberately the same set of checks the admin theme
// builder will run before it lets anyone publish a build, so a ZIP that passes
// locally passes there too. Keep the two in step.
//
// Usage: node scripts/zip.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const themeDir = join(root, 'base');
const outDir = join(root, 'dist');

// Shopify rejects a theme ZIP over 50 MB.
const MAX_BYTES = 50 * 1024 * 1024;

// Paths are compared as forward-slash relative paths, so these only need to
// handle "/". Dev-only dotfiles at the theme root (.theme-check.yml and
// friends) are dropped too: the merchant never needs them.
const EXCLUDED = [
  /(^|\/)\.shopify(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)\.reference(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.DS_Store$/,
  /\.zip$/,
  /^\.[^/]+$/,
];

// Shopify will not install a theme without these.
const REQUIRED = ['layout/theme.liquid', 'config/settings_schema.json'];

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const files = walk(themeDir)
  .map((full) => ({ full, rel: relative(themeDir, full).split(sep).join('/') }))
  .filter(({ rel }) => !EXCLUDED.some((pattern) => pattern.test(rel)));

const problems = [];

for (const name of REQUIRED) {
  if (!files.some((file) => file.rel === name)) {
    problems.push(`missing required file: ${name}`);
  }
}

// A template referencing a section that does not exist renders an error page on
// the merchant's live store, so catch it here rather than after they publish.
const sectionTypes = new Set(
  files
    .filter((file) => file.rel.startsWith('sections/'))
    .map((file) => file.rel.replace(/^sections\//, '').replace(/\.(liquid|json)$/, ''))
);

for (const file of files) {
  if (!file.rel.endsWith('.json')) continue;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file.full, 'utf8'));
  } catch (error) {
    problems.push(`invalid JSON in ${file.rel}: ${error.message}`);
    continue;
  }

  const isTemplate = file.rel.startsWith('templates/');
  const isSectionGroup = file.rel.startsWith('sections/');
  if (!isTemplate && !isSectionGroup) continue;

  for (const section of Object.values(parsed.sections ?? {})) {
    if (section && section.type && !sectionTypes.has(section.type)) {
      problems.push(`${file.rel} references unknown section "${section.type}"`);
    }
  }
}

// Every icon a section offers in an "icon" select must exist in
// snippets/icon.liquid, or the merchant picks it and gets an empty space.
const iconFile = files.find((file) => file.rel === 'snippets/icon.liquid');
if (iconFile) {
  const drawn = new Set();
  for (const match of readFileSync(iconFile.full, 'utf8').matchAll(/when\s+((?:'[^']+'\s*,?\s*)+)/g)) {
    for (const name of match[1].matchAll(/'([^']+)'/g)) drawn.add(name[1]);
  }
  for (const file of files.filter((f) => f.rel.startsWith('sections/') && f.rel.endsWith('.liquid'))) {
    const schema = readFileSync(file.full, 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/);
    if (!schema) continue;
    let parsed;
    try {
      parsed = JSON.parse(schema[1]);
    } catch (error) {
      problems.push(`invalid schema JSON in ${file.rel}: ${error.message}`);
      continue;
    }
    const settings = [...(parsed.settings ?? []), ...(parsed.blocks ?? []).flatMap((block) => block.settings ?? [])];
    for (const setting of settings) {
      if (setting.type !== 'select' || !/^icon/.test(setting.id ?? '')) continue;
      for (const option of setting.options) {
        if (option.value !== 'none' && !drawn.has(option.value)) {
          problems.push(`${file.rel}: icon "${option.value}" offered in ${setting.id} but not drawn in snippets/icon.liquid`);
        }
      }
    }
  }
}

const entries = Object.fromEntries(
  files.map(({ full, rel }) => [rel, new Uint8Array(readFileSync(full))])
);
const zipped = zipSync(entries, { level: 9 });

if (zipped.byteLength > MAX_BYTES) {
  const mb = (zipped.byteLength / 1024 / 1024).toFixed(1);
  problems.push(`zip is ${mb} MB, over Shopify's 50 MB limit`);
}

if (problems.length > 0) {
  console.error('Theme is not publishable:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const schema = JSON.parse(readFileSync(join(themeDir, 'config/settings_schema.json'), 'utf8'));
const info = schema.find((group) => group.name === 'theme_info');
const slug = String(info.theme_name)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const outPath = join(outDir, `${slug}-${info.theme_version}.zip`);

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, zipped);

console.log(`${info.theme_name} v${info.theme_version}`);
console.log(`${files.length} files, ${(zipped.byteLength / 1024).toFixed(0)} KB`);
console.log(relative(root, outPath));
