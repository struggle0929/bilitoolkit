import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import util from 'node:util'
import ts from 'typescript'

const source = readFileSync(new URL('../src/shared/utils/log-redact.ts', import.meta.url), 'utf8')
const moduleCode = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const url = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`
const { redactForLog, redactLogText } = await import(url)
const inspect = (value) => util.inspect(redactForLog(value), { depth: null })

test('nested credentials are hidden without changing frozen API data', () => {
  const userCookie = Object.freeze({ uid: 123, cookie: 'SESSDATA=fixture-session; bili_jct=fixture-csrf' })
  const data = Object.freeze({
    mid: 123,
    name: '账号',
    userCookie,
    headers: Object.freeze({ Authorization: 'Bearer fixture-auth' }),
    context: Object.freeze({
      accessToken: 'fixture-access',
      refresh_token: 'fixture-refresh',
      password: 'fixture-password',
    }),
  })
  const text = inspect(data)
  for (const secret of [
    'fixture-session',
    'fixture-csrf',
    'fixture-auth',
    'fixture-access',
    'fixture-refresh',
    'fixture-password',
  ])
    assert.equal(text.includes(secret), false)
  assert.match(text, /mid: 123/)
  assert.match(text, /账号/)
  assert.equal(data.userCookie, userCookie)
  assert.equal(data.userCookie.cookie, 'SESSDATA=fixture-session; bili_jct=fixture-csrf')
})

test('credentials embedded in messages, URLs and escaped JSON are hidden', () => {
  const values = [
    'request failed Cookie: SESSDATA=fixture-session; bili_jct=fixture-csrf; other=fixture-other',
    'SESSDATA=fixture-session; bili_jct=fixture-csrf; custom=fixture-other',
    'GET https://example.test/?access_token=fixture-access&refresh_token=fixture-refresh&next=42',
    'password="fixture password with spaces" access_key=fixture-access',
    '{"Authorization":"Bearer fixture-auth","message":"failed"}',
    String.raw`{\"refresh_token\":\"fixture-refresh\"}`,
    'authentication failed: Bearer fixture-auth',
  ]
  for (const value of values)
    assert.equal(/fixture[- ](?:session|csrf|other|access|refresh|auth|password)/.test(redactLogText(value)), false)
  assert.match(redactLogText('GET https://example.test/?access_token=fixture-access&next=42'), /next=42/)
  assert.equal(redactLogText('ordinary diagnostic status=200'), 'ordinary diagnostic status=200')
})

test('Error message, stack, causes and custom sensitive fields are sanitized', () => {
  const error = new Error('fetch failed with SESSDATA=fixture-session')
  error.cause = new Error('Authorization: Bearer fixture-auth')
  error.refreshToken = 'fixture-refresh'
  Object.defineProperty(error, 'stack', {
    value: 'Error: access_token=fixture-access\n at request (test.ts:42)',
    configurable: true,
  })
  const text = inspect(error)
  assert.equal(text.includes('fixture-'), false)
  assert.match(text, /request \(test.ts:42\)/)
  assert.equal(error.refreshToken, 'fixture-refresh')
  assert.match(error.stack, /fixture-access/)
})

test('cycle handling does not execute getters or custom inspection hooks', () => {
  let invoked = 0
  const data = { value: 42, password: 'fixture-password' }
  data.self = data
  Object.defineProperty(data, 'danger', {
    enumerable: true,
    get() {
      invoked++
      throw new Error('getter ran')
    },
  })
  data[util.inspect.custom] = () => {
    invoked++
    return 'fixture-session'
  }
  const text = inspect(data)
  assert.equal(invoked, 0)
  assert.match(text, /Circular/)
  assert.match(text, /Accessor omitted/)
  assert.equal(text.includes('fixture-'), false)
})

test('binary payloads are summarized rather than traversed or decoded', () => {
  const payload = Buffer.from('fixture-session')
  const data = {
    payload,
    bytes: new Uint8Array(payload),
    view: new DataView(payload.buffer),
    blob: new ArrayBuffer(4096),
  }
  const text = inspect(data)
  assert.equal(text.includes('fixture-session'), false)
  assert.match(text, /Binary view: 15 bytes/)
  assert.match(text, /ArrayBuffer: 4096 bytes/)
  assert.equal(payload.toString(), 'fixture-session')
})

test('Map and Set entries are sanitized; hostile proxies fail closed', () => {
  const value = new Map([
    ['access_token', 'fixture-access'],
    ['diagnostic', new Set(['SESSDATA=fixture-session'])],
  ])
  const text = inspect(value)
  assert.equal(text.includes('fixture-'), false)
  assert.match(text, /diagnostic/)
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('fixture-password')
      },
    },
  )
  assert.equal(redactForLog(hostile), '[Uninspectable value]')
})

test('the real API logging path sanitizes large file logs and leaves request and reply identities intact', async () => {
  const windowSource = ts.createSourceFile(
    'window-manager.ts',
    readFileSync(new URL('../src/main/window/window-manager.ts', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
  const handler = windowSource.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'handleLogger',
  )
  const manager = windowSource.statements.find(
    (node) => ts.isClassDeclaration(node) && node.name?.text === 'WindowManager',
  )
  const method = manager.members.find(
    (node) => ts.isMethodDeclaration(node) && node.name?.getText(windowSource) === 'handlePluginApiInvoke',
  )
  assert.ok(handler && method)
  const code = ts.transpileModule(
    `import util from 'node:util'; import {redactForLog,redactLogText} from '${url}';
    const state=globalThis.logRedactionRegression;
    const mainLogger=state.logger, mainConsoleLogger=state.logger, mainFileLogger=state.logger;
    const LOG_IGNORED_API_SET=new Set(),LOG_IGNORED_API_REGEXP=[];
    const formatUnitSize=size=>({text:String(size)}), isCanceledError=()=>false;
    const execBiz=async callback=>({success:true,data:await callback()});
    class BiliApiBusinessError extends Error{}; class AppError extends Error{};
    ${handler.getFullText(windowSource)}
    export class Fixture {
      apiDispatcher={handle:async (_event,options)=>{state.seen=options;return state.reply}};
      getApiCallerContext(){return {envType:'host',isDialogWebContents:false}};
      ${method.getFullText(windowSource)}
    }`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
  ).outputText
  const lines = []
  const options = {
    module: 'user',
    name: 'switchUser',
    args: [{ cookie: 'SESSDATA=fixture-session', diagnostic: 'x'.repeat(500) }],
  }
  const reply = { name: '账号', userCookie: { cookie: 'SESSDATA=fixture-session' } }
  globalThis.logRedactionRegression = {
    logger: { info: (...args) => lines.push(args), error: (...args) => lines.push(args) },
    reply,
  }
  try {
    const { Fixture } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
    const result = await new Fixture().handlePluginApiInvoke(options, {})
    assert.equal(result.data, reply)
    assert.equal(globalThis.logRedactionRegression.seen, options)
    assert.equal(options.args[0].cookie, 'SESSDATA=fixture-session')
    assert.equal(reply.userCookie.cookie, 'SESSDATA=fixture-session')
    assert.equal(lines.flat().join(' ').includes('fixture-session'), false)
    assert.ok(lines.some((line) => String(line[0]).includes('arg size:')))
    assert.ok(lines.some((line) => String(line[1]).includes('[REDACTED]')))
  } finally {
    delete globalThis.logRedactionRegression
  }
})
