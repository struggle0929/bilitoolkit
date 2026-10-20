const REDACTED = '[REDACTED]'
const MAX_DEPTH = 24
const MAX_ENTRIES = 200
const MAX_STRING_LENGTH = 20000

const sensitiveKey = (key: string) => {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return (
    /cookie|authorization|password|passwd|credential|clientsecret|privatekey/.test(normalized) ||
    /(?:token|secret|apikey|accesskey)$/.test(normalized) ||
    ['sessdata', 'bilijct', 'csrf', 'csrftoken', 'sessionid', 'sid', 'pwd'].includes(normalized)
  )
}

/** Redact known credential labels even when nested inside URLs, messages or stack traces. */
export function redactLogText(input: string): string {
  const text = input.length > MAX_STRING_LENGTH ? input.slice(0, MAX_STRING_LENGTH) + ' [truncated]' : input
  const cookieString = /(?:^|[;\s])(?:SESSDATA|bili_jct|DedeUserID|buvid[34]|sid)\s*=/i.test(text)
  // Messages may contain JSON which has already been escaped by another logger.
  let safe = text
    .replace(/\\+(["'])/g, '$1')
    .replace(
      /(\b(?:set[-_]?cookie|cookie|proxy[-_]?authorization|authorization)\b[\\"']*\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\r\n]*)/gi,
      '$1' + REDACTED,
    )
    .replace(
      /(\b(?:SESSDATA|bili_jct|csrf(?:_token)?|access[_-]?(?:token|key)|refresh[_-]?token|id[_-]?token|api[_-]?key|client[_-]?secret|password|passwd|pwd|session[_-]?(?:id|token))\b[\\"']*\s*(?:[:=]|%3[dDaA])\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s;&,"'\\]+)/gi,
      '$1' + REDACTED,
    )
    .replace(/\b(Bearer|Basic)\s+[a-z0-9_+/.=~%-]+/gi, '$1 ' + REDACTED)
  if (cookieString) {
    safe = safe.replace(/(\b[\w.-]+\s*=\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^;\s,]+)/g, '$1' + REDACTED)
  }
  return safe
}

/**
 * Produce a log-only snapshot. Never mutate API arguments/results, invoke accessors or
 * retain custom inspect methods. Binary values are summarized, not traversed.
 */
export function redactForLog(value: unknown): unknown {
  const seen = new WeakSet<object>()
  function visit(item: unknown, depth: number): unknown {
    if (typeof item === 'string') return redactLogText(item)
    if (typeof item === 'symbol') return redactLogText(String(item))
    if (typeof item === 'function') return '[Function]'
    if (item === null || typeof item !== 'object') return item
    if (depth > MAX_DEPTH) return '[Depth limit]'
    if (seen.has(item)) return '[Circular or repeated reference]'
    seen.add(item)
    try {
      if (ArrayBuffer.isView(item)) return `[Binary view: ${item.byteLength} bytes]`
      if (item instanceof ArrayBuffer) return `[ArrayBuffer: ${item.byteLength} bytes]`
      if (typeof SharedArrayBuffer !== 'undefined' && item instanceof SharedArrayBuffer)
        return `[SharedArrayBuffer: ${item.byteLength} bytes]`
      if (item instanceof Date) return Number.isNaN(item.getTime()) ? '[Invalid Date]' : item.toISOString()
      if (item instanceof Map) {
        const entries: unknown[] = []
        let count = 0
        for (const [key, entry] of Map.prototype.entries.call(item)) {
          if (count++ >= MAX_ENTRIES) {
            entries.push('[Entries truncated]')
            break
          }
          entries.push([
            visit(key, depth + 1),
            typeof key === 'string' && sensitiveKey(key) ? REDACTED : visit(entry, depth + 1),
          ])
        }
        return { type: 'Map', entries }
      }
      if (item instanceof Set) {
        const values: unknown[] = []
        let count = 0
        for (const entry of Set.prototype.values.call(item)) {
          if (count++ >= MAX_ENTRIES) {
            values.push('[Entries truncated]')
            break
          }
          values.push(visit(entry, depth + 1))
        }
        return { type: 'Set', values }
      }
      const descriptors = Object.getOwnPropertyDescriptors(item)
      if (Array.isArray(item)) {
        const result: unknown[] = []
        const length = Math.min(item.length, MAX_ENTRIES)
        for (let index = 0; index < length; index++) {
          const property = descriptors[String(index)]
          result.push(property && 'value' in property ? visit(property.value, depth + 1) : '[Accessor or empty]')
        }
        if (item.length > length) result.push('[Entries truncated]')
        return result
      }
      const result: Record<string, unknown> = Object.create(null)
      if (item instanceof Error) result.name = 'Error'
      let count = 0
      for (const [key, property] of Object.entries(descriptors)) {
        if (count++ >= MAX_ENTRIES) {
          result['[truncated]'] = true
          break
        }
        result[redactLogText(key)] = sensitiveKey(key)
          ? REDACTED
          : 'value' in property
            ? visit(property.value, depth + 1)
            : '[Accessor omitted]'
      }
      return result
    } catch {
      return '[Uninspectable value]'
    }
  }
  return visit(value, 0)
}
