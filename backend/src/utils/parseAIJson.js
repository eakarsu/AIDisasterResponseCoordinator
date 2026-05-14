/**
 * 3-strategy AI JSON parser used across all AI endpoints.
 * 1. Try to extract a fenced ```json``` code block
 * 2. Try to find the first balanced { ... } object in the text
 * 3. Try parsing the entire string as JSON
 * Returns { parsed, raw } where parsed may be null if all strategies fail.
 */
function parseAIJson(text) {
  if (text == null) return { parsed: null, raw: text };
  const raw = String(text);

  // Strategy 1: fenced code block (```json ... ``` or ``` ... ```)
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return { parsed: JSON.parse(fenceMatch[1].trim()), raw };
    } catch (_) {
      // fall through
    }
  }

  // Strategy 2: balanced brace scan for the first { ... } block
  let braceDepth = 0;
  let startIdx = -1;
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\' && inString) { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') {
      if (braceDepth === 0) startIdx = i;
      braceDepth++;
    } else if (ch === '}') {
      braceDepth--;
      if (braceDepth === 0 && startIdx !== -1) {
        const candidate = raw.substring(startIdx, i + 1);
        try {
          return { parsed: JSON.parse(candidate), raw };
        } catch (_) {
          startIdx = -1;
          // keep scanning
        }
      }
    }
  }

  // Strategy 3: parse the whole string
  try {
    return { parsed: JSON.parse(raw), raw };
  } catch (_) {
    return { parsed: null, raw };
  }
}

module.exports = { parseAIJson };
