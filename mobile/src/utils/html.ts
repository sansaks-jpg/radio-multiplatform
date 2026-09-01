/**
 * Minimal HTML → plain paragraphs converter for WordPress news bodies.
 * Keeps the MVP dependency-free; swap for react-native-render-html later
 * if rich rendering becomes a requirement (plan §6, decision #2).
 */
export function htmlToParagraphs(html: string): string[] {
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/\s*(h[1-6]|li|div|blockquote)\s*>/gi, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, "");
  return text
    .split(/\n+/)
    .map((chunk) => decodeEntities(chunk).trim())
    .filter((chunk) => chunk.length > 0);
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 10)),
    );
}
