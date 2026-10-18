export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

const KNOWN_HTML_TAGS = new Set([
  "div",
  "span",
  "p",
  "a",
  "b",
  "i",
  "u",
  "em",
  "strong",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "tr",
  "td",
  "th",
  "tbody",
  "thead",
  "tfoot",
  "ul",
  "ol",
  "li",
  "img",
  "br",
  "hr",
  "pre",
  "code",
  "blockquote",
  "section",
  "article",
  "nav",
  "header",
  "footer",
  "form",
  "input",
  "button",
  "select",
  "option",
  "textarea",
  "label",
  "fieldset",
  "legend",
  "video",
  "audio",
  "canvas",
  "iframe",
  "script",
  "style",
  "link",
  "meta",
  "title",
  "html",
  "head",
  "body",
  "svg",
  "math",
  "details",
  "summary",
  "object",
  "embed",
  "marquee",
  "template",
  "dialog",
]);

const HTML_TAG_PATTERN = new RegExp(
  `<(${Array.from(KNOWN_HTML_TAGS).join("|")})\\b`,
  "i",
);

export function hasHtmlTagPattern(str: string): boolean {
  return HTML_TAG_PATTERN.test(str);
}

export function isProbablyHTML(text: string) {
  const cleanedStr = text.trim().toLowerCase();

  if (
    cleanedStr.startsWith("<!doctype html>") &&
    hasHtmlTagPattern(cleanedStr)
  ) {
    return true;
  }

  if (!hasHtmlTagPattern(text)) {
    return false;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanedStr, "text/html");

  const elements = [
    ...Array.from(doc.head.childNodes),
    ...Array.from(doc.body.childNodes),
  ].filter((node) => node.nodeType === 1) as Element[];

  if (elements.length === 0) {
    return false;
  }

  return elements.some((element) => {
    const tagName = element.tagName.toLowerCase();
    return KNOWN_HTML_TAGS.has(tagName);
  });
}

// mock: escapes everything instead of an allowlist sanitizer
export function sanitizeHtml(htmlString: string): string {
  return htmlString.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
