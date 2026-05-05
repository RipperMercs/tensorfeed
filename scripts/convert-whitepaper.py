"""
One-time markdown → JSX conversion for the AFTA whitepaper.

Reads specs/AFTA-WHITEPAPER.md (gitignored, local-only per public-repo
policy) and emits a TSX content fragment that the /whitepaper page
component imports. The generated file is committed to the public repo
so the page works without runtime markdown parsing or new deps.

Handles:
  - h1/h2/h3 from #/##/### with auto-generated id slugs
  - paragraphs with prose-custom class
  - GitHub-style tables (| header | header |)
  - fenced code blocks (```lang ... ```)
  - inline code with backticks
  - bold (**...**) and italic (*...*)
  - links [text](url) → external get target=_blank, internal use Link
  - lists (- item) → ul/li
  - JSX entity escaping: ' → &apos;, " → &quot;, & → &amp; (not inside
    code blocks)
  - Em-dash audit: refuses to emit if source has any em or en dashes

Run:
  python scripts/convert-whitepaper.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List, Tuple


SRC = Path("specs/AFTA-WHITEPAPER.md")
OUT = Path("src/app/whitepaper/_content.tsx")


def slugify(text: str) -> str:
    """Convert heading text to a stable id slug."""
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[\s_-]+", "-", text).strip("-")
    return text or "section"


def escape_jsx_text(s: str) -> str:
    """Escape characters that JSX text nodes choke on: apostrophes,
    quotes, ampersands, < and >, and curly braces. JSX uses { } for
    expression delimiters, so unescaped braces in literal text break
    the parser."""
    # Order matters: & first, otherwise we'd double-encode.
    s = s.replace("&", "&amp;")
    s = s.replace("<", "&lt;")
    s = s.replace(">", "&gt;")
    s = s.replace("'", "&apos;")
    s = s.replace('"', "&quot;")
    s = s.replace("{", "&#123;")
    s = s.replace("}", "&#125;")
    return s


def convert_inline(text: str) -> str:
    """Convert markdown inline elements to JSX. Operates on a single
    paragraph or list item.

    Order of operations is delicate: extract code spans first, then
    links, then bold/italic, then escape remaining text. Code spans
    are placeholdered so their content is not affected by escaping or
    bold/italic processing.
    """
    code_spans: List[str] = []

    def stash_code(m: re.Match) -> str:
        code_spans.append(m.group(1))
        return f"\x00CODE{len(code_spans) - 1}\x00"

    text = re.sub(r"`([^`]+)`", stash_code, text)

    # Links: [text](url). External (http://, https://) get target=_blank.
    # Internal (starts with /) use a plain anchor so we do not need
    # next/link inside the converter; the page wrapper imports Link
    # if needed.
    def render_link(m: re.Match) -> str:
        label = m.group(1)
        url = m.group(2)
        is_external = url.startswith("http://") or url.startswith("https://")
        # Escape the label since it lands in JSX text
        label_escaped = escape_jsx_text(label)
        if is_external:
            return (
                f'<a href="{url}" target="_blank" rel="noopener noreferrer" '
                f'className="text-accent-primary hover:underline">{label_escaped}</a>'
            )
        else:
            return (
                f'<a href="{url}" '
                f'className="text-accent-primary hover:underline">{label_escaped}</a>'
            )

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", render_link, text)

    # Bold and italic. Bold first to avoid ambiguity with single asterisk.
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)

    # Now escape the remaining plain-text segments. Need to find segments
    # outside any HTML/JSX tags we already produced.
    parts: List[str] = []
    in_tag = False
    buf: List[str] = []
    for ch in text:
        if ch == "<":
            if buf:
                parts.append(escape_jsx_text("".join(buf)))
                buf = []
            in_tag = True
            parts.append(ch)
        elif ch == ">":
            in_tag = False
            parts.append(ch)
        elif in_tag:
            parts.append(ch)
        else:
            buf.append(ch)
    if buf:
        parts.append(escape_jsx_text("".join(buf)))
    text = "".join(parts)

    # Restore code spans last, untouched by escaping. The code content
    # itself still needs JSX-safe escaping for backticks-inside-strings.
    def restore_code(m: re.Match) -> str:
        idx = int(m.group(1))
        content = code_spans[idx]
        # Escape the content for JSX text inside <code>
        content = escape_jsx_text(content)
        return f'<code className="font-mono text-sm bg-bg-secondary px-1 py-0.5 rounded text-text-primary">{content}</code>'

    text = re.sub(r"\x00CODE(\d+)\x00", restore_code, text)
    return text


def parse_table_block(lines: List[str]) -> str:
    """Render a GitHub markdown table to JSX. Expects lines like:
    | h1 | h2 |
    | --- | --- |
    | r1c1 | r1c2 |
    """
    if len(lines) < 2:
        return ""
    header_cells = [c.strip() for c in lines[0].strip().strip("|").split("|")]
    rows = []
    for line in lines[2:]:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append(cells)

    out = ['<div className="overflow-x-auto my-6">',
           '  <table className="w-full text-sm border border-border rounded-lg">',
           '    <thead className="bg-bg-secondary">',
           '      <tr>']
    for h in header_cells:
        out.append(
            f'        <th className="text-left px-3 py-2 text-text-primary font-semibold">{convert_inline(h)}</th>'
        )
    out.append('      </tr>')
    out.append('    </thead>')
    out.append('    <tbody className="divide-y divide-border">')
    for row in rows:
        out.append('      <tr>')
        for cell in row:
            out.append(f'        <td className="px-3 py-2 align-top">{convert_inline(cell)}</td>')
        out.append('      </tr>')
    out.append('    </tbody>')
    out.append('  </table>')
    out.append('</div>')
    return "\n".join(out)


def convert(md: str) -> str:
    """Top-level converter. Returns a JSX body fragment (children of an
    <article> in the page wrapper)."""
    out: List[str] = []
    lines = md.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip horizontal rules (just visual separators in markdown)
        if line.strip() == "---":
            out.append('<hr className="my-10 border-border" />')
            i += 1
            continue

        # Fenced code block
        if line.startswith("```"):
            lang = line[3:].strip() or "text"
            j = i + 1
            code_lines: List[str] = []
            while j < len(lines) and not lines[j].startswith("```"):
                code_lines.append(lines[j])
                j += 1
            code_text = "\n".join(code_lines)
            # Use a JS string literal {`...`} so backticks inside need
            # to be escaped. Use template-string syntax.
            escaped_code = code_text.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")
            out.append(
                '<pre className="my-6 overflow-x-auto bg-bg-secondary border border-border rounded-lg p-4 text-sm">'
            )
            out.append(
                f'  <code className="font-mono text-text-secondary" data-language="{lang}">{{`{escaped_code}`}}</code>'
            )
            out.append('</pre>')
            i = j + 1
            continue

        # Headings
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            hashes = m.group(1)
            text = m.group(2).strip()
            level = len(hashes)
            slug = slugify(text)
            converted = convert_inline(text)
            tag = f"h{level}"
            classes = {
                1: "text-3xl sm:text-4xl font-bold text-text-primary mt-12 mb-6 leading-tight",
                2: "text-2xl sm:text-3xl font-bold text-text-primary mt-12 mb-5 leading-tight scroll-mt-24",
                3: "text-xl sm:text-2xl font-semibold text-text-primary mt-8 mb-4 leading-snug scroll-mt-24",
                4: "text-lg font-semibold text-text-primary mt-6 mb-3",
            }[level]
            out.append(f'<{tag} id="{slug}" className="{classes}">{converted}</{tag}>')
            i += 1
            continue

        # Table block
        if line.lstrip().startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|[\s\-:|]+\|\s*$", lines[i + 1]):
            j = i
            tlines: List[str] = []
            while j < len(lines) and lines[j].lstrip().startswith("|"):
                tlines.append(lines[j])
                j += 1
            out.append(parse_table_block(tlines))
            i = j
            continue

        # Bullet list
        if re.match(r"^\s*-\s+", line):
            j = i
            items: List[str] = []
            while j < len(lines) and re.match(r"^\s*-\s+", lines[j]):
                item = re.sub(r"^\s*-\s+", "", lines[j])
                items.append(item)
                j += 1
            out.append('<ul className="list-disc list-inside space-y-2 my-5 text-text-secondary">')
            for it in items:
                out.append(f'  <li className="leading-relaxed">{convert_inline(it)}</li>')
            out.append('</ul>')
            i = j
            continue

        # Numbered list
        if re.match(r"^\s*\d+\.\s+", line):
            j = i
            items = []
            while j < len(lines) and re.match(r"^\s*\d+\.\s+", lines[j]):
                item = re.sub(r"^\s*\d+\.\s+", "", lines[j])
                items.append(item)
                j += 1
            out.append('<ol className="list-decimal list-inside space-y-2 my-5 text-text-secondary">')
            for it in items:
                out.append(f'  <li className="leading-relaxed">{convert_inline(it)}</li>')
            out.append('</ol>')
            i = j
            continue

        # Blank line
        if line.strip() == "":
            i += 1
            continue

        # Paragraph: collect consecutive non-empty, non-special lines.
        j = i
        plines: List[str] = []
        while j < len(lines):
            cur = lines[j]
            if cur.strip() == "":
                break
            if cur.startswith("#"):
                break
            if cur.startswith("```"):
                break
            if cur.lstrip().startswith("|"):
                break
            if re.match(r"^\s*-\s+", cur) or re.match(r"^\s*\d+\.\s+", cur):
                break
            if cur.strip() == "---":
                break
            plines.append(cur)
            j += 1
        para = " ".join(p.strip() for p in plines)
        if para:
            out.append(
                f'<p className="my-4 text-text-secondary leading-relaxed">{convert_inline(para)}</p>'
            )
        i = j
    return "\n".join(out)


def main() -> int:
    if not SRC.exists():
        print(f"ERROR: {SRC} not found.", file=sys.stderr)
        return 1
    md = SRC.read_text(encoding="utf-8")

    if "—" in md or "–" in md:
        print("ERROR: source contains em-dash (—) or en-dash (–); fix before converting.",
              file=sys.stderr)
        return 1

    body = convert(md)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out_text = (
        "// AUTO-GENERATED from specs/AFTA-WHITEPAPER.md by\n"
        "// scripts/convert-whitepaper.py. Do not edit by hand; edit the\n"
        "// markdown source and re-run the script.\n\n"
        "import { ReactElement } from 'react';\n\n"
        "export default function WhitepaperBody(): ReactElement {\n"
        "  return (\n"
        "    <>\n"
        + body + "\n"
        "    </>\n"
        "  );\n"
        "}\n"
    )
    OUT.write_text(out_text, encoding="utf-8")
    print(f"Wrote {OUT} ({len(out_text)} bytes, {len(body.splitlines())} body lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
