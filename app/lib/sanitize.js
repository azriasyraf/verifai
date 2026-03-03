const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?/gi,
  /disregard\s+(?:all\s+)?(?:previous|above|prior)\s+instructions?/gi,
  /forget\s+(?:everything|all)\s+(?:above|before|prior)/gi,
  /you\s+are\s+now\s+(?:a\s+)?(?:different|new)/gi,
  /act\s+as\s+(?:a\s+)?(?:different|new|unrestricted)/gi,
  /system\s*prompt/gi,
  /<\/?(?:system|prompt|instruction|override)>/gi,
];

export function sanitizeDocText(text) {
  let out = text;
  for (const p of INJECTION_PATTERNS) out = out.replace(p, '[content removed]');
  return out;
}

export function wrapDocForPrompt(text, docType, fileName) {
  return `<uploaded_document type="${docType}" filename="${fileName}">\n${sanitizeDocText(text)}\n</uploaded_document>`;
}
