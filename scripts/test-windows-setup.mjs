import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// No real dependency installation or application launch. All changes stay in
// a newly-created project-local fixture; never touch the user's node_modules.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
fs.mkdirSync(path.join(root, 'temp'), {recursive:true})
const fixture = fs.mkdtempSync(path.join(root, 'temp', 'windows-setup-test-'))
fs.mkdirSync(path.join(fixture, 'scripts'))
fs.mkdirSync(path.join(fixture, 'bin'))
fs.copyFileSync(path.join(root, 'scripts/start-windows.ps1'), path.join(fixture, 'scripts/start-windows.ps1'))
fs.copyFileSync(path.join(root, 'scripts/run-windows-dev.ps1'), path.join(fixture, 'scripts/run-windows-dev.ps1'))
fs.writeFileSync(path.join(fixture, 'package-lock.json'), '{"fixture":1}\n')
fs.writeFileSync(path.join(fixture, 'bin/npm.cmd'), '@node.exe "%~dp0mock-npm.cjs" %*\r\n')
fs.writeFileSync(path.join(fixture, 'bin/mock-npm.cjs'), `
const fs = require('node:fs'); const path = require('node:path');
const args = process.argv.slice(2); const command = args.join(' ');
const log = 'attempts.jsonl';
const entries = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\\n').filter(Boolean).map(JSON.parse) : [];
fs.appendFileSync(log, JSON.stringify({command, ffmpeg:process.env.FFMPEG_BINARIES_URL || null, electron:process.env.ELECTRON_MIRROR || null})+'\\n');
const make = p => {fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p,'fixture');};
if (process.env.TEST_FAIL === 'install' && args[0] === 'ci') process.exit(7);
if (process.env.TEST_FAIL === 'first-install' && args[0] === 'ci' && !entries.some(e=>e.command.startsWith('ci '))) process.exit(7);
if (process.env.TEST_FAIL === 'build' && command === 'run build:all') process.exit(8);
if (process.env.TEST_FAIL === 'native' && command === 'run rebuild:native') process.exit(9);
if(args[0] === 'ci') ['node_modules/.bin/vite.cmd','node_modules/electron/dist/electron.exe','node_modules/ffmpeg-static/ffmpeg.exe'].forEach(make);
if(command === 'run build:all') ['public/preloads/plugin-preload.cjs','public/preloads/dialog-app-preload.cjs','public/workers/task-plugin.worker.js','public/recommended-plugins.json'].forEach(make);
if(command === 'run rebuild:native') make('node_modules/better-sqlite3/build/Release/better_sqlite3.node');
console.log('fixture '+command);
`)
const ps = path.join(process.env.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe')
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !['path','psmodulepath','test_fail','ffmpeg_binaries_url','electron_mirror'].includes(k.toLowerCase())))
env.PATH = [path.join(fixture,'bin'),path.dirname(process.execPath),process.env.PATH || process.env.Path].join(path.delimiter)
const run = async (options = {}) => {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(ps, ['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(fixture,'scripts/start-windows.ps1'),'-NonInteractive','-NoLaunch','-DownloadSource',options.source || 'mirror'], {cwd:fixture, env:{...env, ...options.env}, timeout:60000})
    let stdout = '', stderr = ''
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
    child.stdout.on('data', data => { stdout += data }); child.stderr.on('data', data => { stderr += data })
    child.on('error', reject); child.on('close', status => resolve({status, stdout, stderr}))
  })
  assert.equal(result.status, options.code || 0, result.stdout+'\n'+result.stderr)
  return result
}
const entries = () => fs.readFileSync(path.join(fixture,'attempts.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
const marker = path.join(fixture,'.bilitoolkit-setup-complete')
const receipt = path.join(fixture,'node_modules/.bilitoolkit-setup-state')
let savedFixtureFile = 0
// Preserve fixture files instead of deleting them when simulating missing files.
const drop = p => { if(fs.existsSync(p)) fs.renameSync(p, p+'.fixture-saved-'+(++savedFixtureFile)) }
const resetLog = () => fs.writeFileSync(path.join(fixture,'attempts.jsonl'),'')
const changeLock = () => fs.appendFileSync(path.join(fixture,'package-lock.json'),' ')
const cases = []
async function test(name, fn) { await fn(); cases.push(name); console.log('PASS '+name) }

await test('fresh setup runs install, build, native and writes matching receipts', async () => {
  await run(); assert.equal(entries().length,3); assert.equal(fs.readFileSync(marker,'utf8'),fs.readFileSync(receipt,'utf8'))
  assert.match(entries()[0].command,/--foreground-scripts/)
})
await test('second launch skips all setup steps without dist-electron preload', async () => {
  assert.equal(fs.existsSync(path.join(fixture,'dist-electron/preload.js')),false)
  assert.match((await run()).stdout,/REUSE_READY/); assert.equal(entries().length,3)
})
await test('deleted root marker is recovered without redownloading', async () => {
  drop(marker); assert.match((await run()).stdout,/REUSE_READY/); assert.equal(entries().length,3); assert.ok(fs.existsSync(marker))
})
await test('deleted marker plus changed lock still triggers installation', async () => {
  drop(marker); changeLock(); resetLog(); await run(); assert.equal(entries().length,3)
})
await test('missing build resource rebuilds without npm ci', async () => {
  drop(path.join(fixture,'public/preloads/plugin-preload.cjs')); resetLog()
  assert.match((await run()).stdout,/REUSE_DEPENDENCIES/); assert.deepEqual(entries().map(e=>e.command),['run build:all','run rebuild:native'])
})
await test('missing dependency triggers full setup', async () => {
  drop(path.join(fixture,'node_modules/ffmpeg-static/ffmpeg.exe')); resetLog(); await run(); assert.equal(entries().length,3)
})
await test('mirror failure retries caller default and preserves both attempt logs', async () => {
  changeLock(); resetLog(); await run({env:{TEST_FAIL:'first-install',FFMPEG_BINARIES_URL:'https://example.invalid/ffmpeg',ELECTRON_MIRROR:'https://example.invalid/electron'}})
  assert.equal(entries().length,4); assert.match(entries()[0].ffmpeg,/npmmirror/); assert.equal(entries()[1].ffmpeg,'https://example.invalid/ffmpeg')
  const dirs=fs.readdirSync(path.join(fixture,'.bilitoolkit-setup-logs')).sort(); const latest=dirs.at(-1)
  assert.ok(fs.existsSync(path.join(fixture,'.bilitoolkit-setup-logs',latest,'1-step-1.err.log')))
  assert.ok(fs.existsSync(path.join(fixture,'.bilitoolkit-setup-logs',latest,'2-step-1.err.log')))
})
await test('default source failure retries mirror', async () => {
  changeLock(); resetLog(); await run({source:'default',env:{TEST_FAIL:'first-install'}})
  assert.equal(entries()[0].ffmpeg,null); assert.match(entries()[1].ffmpeg,/npmmirror/)
})
await test('two installation failures stop before build and invalidate receipts', async () => {
  changeLock(); resetLog(); await run({code:1,env:{TEST_FAIL:'install'}})
  assert.equal(entries().length,2); assert.equal(fs.readFileSync(marker,'utf8').trim(),'incomplete'); assert.equal(fs.readFileSync(receipt,'utf8').trim(),'incomplete')
})
await test('build failure does not run native or mark success', async () => {
  resetLog(); await run({code:1,env:{TEST_FAIL:'build'}})
  assert.equal(entries().length,2); assert.equal(fs.readFileSync(marker,'utf8').trim(),'incomplete'); assert.equal(fs.readFileSync(receipt,'utf8').trim(),'incomplete')
})
await test('native failure leaves only incomplete receipts', async () => {
  resetLog(); await run({code:1,env:{TEST_FAIL:'native'}})
  assert.equal(entries().length,3); assert.equal(fs.readFileSync(marker,'utf8').trim(),'incomplete'); assert.equal(fs.readFileSync(receipt,'utf8').trim(),'incomplete')
})
await test('recovery after failure runs all steps and then skips on repeat', async () => {
  resetLog(); await run(); await run(); assert.equal(entries().length,3); assert.ok(fs.existsSync(marker))
})
await test('required locked package missing or wrong version forces setup', async () => {
  const manifest = path.join(fixture,'node_modules/fixture-package/package.json')
  fs.mkdirSync(path.dirname(manifest),{recursive:true})
  fs.writeFileSync(manifest, JSON.stringify({version:'1.0.0'}))
  fs.writeFileSync(path.join(fixture,'package-lock.json'), JSON.stringify({packages:{'node_modules/fixture-package':{version:'1.0.0'},'node_modules/optional-fixture':{version:'1.0.0',optional:true}}}))
  resetLog(); await run(); assert.equal(entries().length,3)
  drop(manifest); resetLog(); await run({code:1}); assert.equal(entries().length,3)
  fs.writeFileSync(manifest, JSON.stringify({version:'0.9.0'}))
  resetLog(); await run({code:1}); assert.equal(entries().length,3)
  fs.writeFileSync(manifest, JSON.stringify({version:'1.0.0'}))
  resetLog(); await run(); await run(); assert.equal(entries().length,3)
})
const result = {passed:cases.length,cases,fixture,finishedAt:new Date().toISOString(),scope:'mock npm; real Windows PowerShell 5.1 process runner; no network or GUI'}
fs.writeFileSync(path.join(fixture,'results.json'),JSON.stringify(result,null,2))
console.log(JSON.stringify(result,null,2))
