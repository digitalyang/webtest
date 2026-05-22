import DOMPurify from "dompurify";
import { marked } from "marked";

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul"
];

const allowedAttributes = {
  a: ["href", "title", "target", "rel"]
};

marked.use({
  breaks: true,
  gfm: true
});

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripRawHtml(value) {
  if (typeof document === "undefined") {
    return String(value || "").replace(/<[^>]*>/g, "");
  }

  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return template.content.textContent || "";
}

function removeUnsafeLinks(html) {
  return html.replace(/<a\s+([^>]*href=["']?(?:javascript|data):[^>]*)>(.*?)<\/a>/gis, "$2");
}

function addSafeLinkAttributes(html) {
  if (typeof document === "undefined") {
    return html.replace(/<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi, (_match, attributes) => {
      const withoutTarget = attributes
        .replace(/\s+target=["'][^"']*["']/gi, "")
        .replace(/\s+rel=["'][^"']*["']/gi, "");
      return `<a ${withoutTarget} target="_blank" rel="noopener noreferrer">`;
    });
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  for (const link of template.content.querySelectorAll("a[href]")) {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }

  return template.innerHTML;
}

export function renderMarkdown(content) {
  const markdown = escapeHtml(stripRawHtml(content));
  const parsed = marked.parse(markdown);
  const sanitized = typeof document === "undefined"
    ? removeUnsafeLinks(parsed)
    : DOMPurify.sanitize(parsed, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttributes,
      ALLOW_DATA_ATTR: false
    });

  return addSafeLinkAttributes(sanitized);
}
