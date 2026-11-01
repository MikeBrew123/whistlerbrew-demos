#!/usr/bin/env python3
"""Turn a Hazel search-page draft (docs/shadow-content/*-seo-*.md) into a page on mylittleshadow.com.

Usage: python3 scripts/mls-article.py docs/shadow-content/2026-11-01-seo-what-would-my-dog-say.md [...]

Reads the header lines (Title tag, Meta description, H1, URL slug), renders the body (## and ###
headings, paragraphs, lists, **bold**, *italics*, [links](url), > quotes) and the FAQ section, and writes
public/shadow/articles/<slug>.html with Article + FAQPage schema. Then add the slug to
ARTICLES in src/middleware.ts and to public/shadow/sitemap.xml.
"""
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "shadow" / "articles"


def field(text, *names):
    for n in names:
        m = re.search(rf"^\W*{n}\W*:\s*\**\s*(.+?)\s*$", text, re.I | re.M)
        if m:
            return m.group(1).strip().strip("*`\"").strip()
    return None


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{fix_url(m.group(2))}">{m.group(1)}</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    # Bare mentions of the product address become links.
    s = re.sub(r"(?<![\w/\">])(mylittleshadow\.com/tell)\b", r'<a href="/tell">\1</a>', s)
    return s


def fix_url(u):
    u = u.replace("https://mylittleshadow.com", "") or "/"
    return html.escape(u)


def render(lines):
    out, para, items, kind = [], [], [], None

    def flush():
        nonlocal para, items, kind
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para = []
        if items:
            out.append(f"<{kind}>" + "".join(f"<li>{inline(i)}</li>" for i in items) + f"</{kind}>")
            items, kind = [], None

    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            flush()
            continue
        if line.startswith("### "):
            flush(); out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("## "):
            flush(); out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith(">"):
            flush(); out.append(f'<blockquote>{inline(line.lstrip("> "))}</blockquote>')
        elif re.match(r"^\s*[-*] ", line):
            if para or kind == "ol":
                flush()
            kind = "ul"; items.append(re.sub(r"^\s*[-*] ", "", line))
        elif re.match(r"^\s*\d+[.)] ", line):
            if para or kind == "ul":
                flush()
            kind = "ol"; items.append(re.sub(r"^\s*\d+[.)] ", "", line))
        elif line.strip() == "---":
            flush()
        else:
            if items:
                flush()
            para.append(line.strip())
    flush()
    return "\n".join(out)


def split_faq(body_lines):
    """Pulls the FAQ section out of the body: returns (body_without_faq, [(q, a), ...])."""
    start = next((i for i, l in enumerate(body_lines) if re.match(r"^##\s+(FAQ|Frequently)", l, re.I)), None)
    if start is None:
        return body_lines, []
    end = next((i for i in range(start + 1, len(body_lines)) if re.match(r"^##\s", body_lines[i])), len(body_lines))
    faq, q, a = [], None, []
    for l in body_lines[start + 1:end]:
        m = re.match(r"^(?:###\s+|\*\*Q[:.]?\*?\*?\s*|Q[:.]\s+)(.+?)\**\s*$", l)
        if m:
            if q:
                faq.append((q, " ".join(a).strip()))
            q, a = re.sub(r"^\*\*|\*\*$", "", m.group(1)).strip(), []
        elif l.strip():
            a.append(re.sub(r"^(\*\*A[:.]?\*\*|A[:.])\s*", "", l.strip()))
    if q:
        faq.append((q, " ".join(a).strip()))
    return body_lines[:start] + body_lines[end:], faq


def build(src: Path):
    text = src.read_text()
    title = field(text, "Title tag", "Title")
    desc = field(text, "Meta description", "Description")
    h1 = field(text, "H1")
    slug = (field(text, "URL slug", "Slug", "URL") or "").strip("/ ")
    if not all([title, desc, h1, slug]) or not re.fullmatch(r"[a-z0-9-]+", slug):
        sys.exit(f"{src}: missing or bad header (title={title!r} desc={desc!r} h1={h1!r} slug={slug!r})")
    # Body starts after the article's own "# H1" line (the second "# " heading; the first names the draft),
    # or at the first ## heading if there is no such line.
    lines = text.splitlines()
    h1s = [i for i, l in enumerate(lines) if l.startswith("# ")]
    first = h1s[1] + 1 if len(h1s) > 1 else next(i for i, l in enumerate(lines) if l.startswith("## "))
    # Stop before any notes for Brew / the main session.
    stop = next((i for i in range(first, len(lines)) if re.match(r"^##\s+(Notes?|For Brew|Self-check|Checks?)\b", lines[i], re.I)), len(lines))
    body, faq = split_faq(lines[first:stop])
    url = f"https://mylittleshadow.com/{slug}"
    today = date.today().isoformat()
    schema = [{
        "@context": "https://schema.org", "@type": "Article", "headline": h1, "description": desc,
        "url": url, "datePublished": today, "dateModified": today, "image": "https://mylittleshadow.com/shadow/og.jpg",
        "author": {"@type": "Organization", "name": "My Little Shadow", "url": "https://mylittleshadow.com/"},
        "publisher": {"@type": "Organization", "name": "My Little Shadow", "url": "https://mylittleshadow.com/"},
    }]
    if faq:
        schema.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    faq_html = ""
    if faq:
        faq_html = '<h2>Questions people ask</h2>\n' + "\n".join(
            f"<details><summary>{inline(q)}</summary><p>{inline(a)}</p></details>" for q, a in faq)
    page = TEMPLATE.format(
        title=html.escape(title), desc=html.escape(desc, quote=True), url=url, h1=inline(h1),
        body=render(body), faq=faq_html,
        schema="\n".join(f'<script type="application/ld+json">\n{json.dumps(s, indent=1, ensure_ascii=False)}\n</script>' for s in schema),
    )
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{slug}.html").write_text(page)
    print(f"/{slug} -> public/shadow/articles/{slug}.html ({len(faq)} FAQ)")


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://mylittleshadow.com/shadow/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fbefb4">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {{ --ink: #1c2140; --soft: #4a5070; --butter: #fff0a8; --paper: #fffdf6; --sun: #ffd45c; --head: "Bricolage Grotesque", system-ui, sans-serif; }}
  html {{ background: #ffe28f; }}
  body {{ margin: 0; color: var(--ink); font: 18px/1.65 "Figtree", system-ui, sans-serif;
    background: linear-gradient(180deg, #d6ecfa 0, #e9f2ef 500px, #fbefb4 1400px, #ffe28f 2600px) no-repeat #ffe28f; }}
  a {{ color: var(--ink); text-underline-offset: 3px; }}
  a:focus-visible, summary:focus-visible {{ outline: 3px solid var(--ink); outline-offset: 3px; border-radius: 6px; }}
  nav {{ max-width: 720px; margin: 0 auto; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }}
  .brand {{ display: flex; align-items: center; gap: 10px; text-decoration: none; font: 700 19px var(--head); }}
  .cta {{ display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border-radius: 999px; background: var(--ink); color: var(--butter); font-weight: 700; font-size: 16px; text-decoration: none; }}
  main {{ max-width: 720px; margin: 0 auto; padding: 8px 20px 40px; }}
  h1 {{ font: 800 clamp(2.2rem, 7vw, 3.4rem)/1.05 var(--head); letter-spacing: -0.03em; margin: 24px 0 20px; }}
  h2 {{ font: 800 clamp(1.5rem, 4.5vw, 2rem)/1.15 var(--head); letter-spacing: -0.02em; margin: 44px 0 12px; }}
  h3 {{ font: 700 1.25rem/1.25 var(--head); margin: 28px 0 8px; }}
  p, ul, ol {{ margin: 0 0 16px; }}
  blockquote {{ margin: 20px 0; background: var(--paper); border-radius: 24px 24px 24px 6px; padding: 16px 20px; font: 700 1.2rem/1.35 var(--head); box-shadow: 0 12px 26px -18px rgba(28,33,64,.5); }}
  details {{ background: var(--paper); border-radius: 16px; padding: 14px 18px; margin: 0 0 10px; }}
  summary {{ cursor: pointer; font-weight: 700; }}
  details p {{ margin: 10px 0 0; }}
  .try {{ margin: 48px 0 0; background: var(--ink); color: var(--butter); border-radius: 28px; padding: 28px 24px; text-align: center; }}
  .try h2 {{ margin: 0 0 8px; color: #fff; }}
  .try p {{ margin: 0 0 18px; }}
  .try a {{ display: inline-flex; align-items: center; min-height: 52px; padding: 0 26px; border-radius: 999px; background: var(--butter); color: var(--ink); font-weight: 700; text-decoration: none; }}
  footer {{ max-width: 720px; margin: 0 auto; padding: 0 20px 32px; font-size: 14px; color: var(--soft); text-align: center; }}
  footer a {{ margin: 0 8px; }}
</style>
<script>
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {{ dataLayer.push(arguments); }};
  if (location.hostname.endsWith("mylittleshadow.com")) {{
    const ga = document.createElement("script");
    ga.async = true; ga.src = "https://www.googletagmanager.com/gtag/js?id=G-6KL3XFSD8V";
    document.head.appendChild(ga);
    gtag("js", new Date()); gtag("config", "G-6KL3XFSD8V");
  }}
</script>
{schema}
</head>
<body>
<nav aria-label="Main">
  <a class="brand" href="/"><svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true"><circle cx="11" cy="11" r="9" fill="#1c2140"></circle><ellipse cx="27" cy="16" rx="6" ry="5" fill="#1c2140" opacity="0.28"></ellipse></svg>My Little Shadow</a>
  <a class="cta" href="/tell">Hear from yours</a>
</nav>
<main>
<article>
<h1>{h1}</h1>
{body}
{faq}
</article>
<aside class="try">
  <h2>Let your pet get a word in</h2>
  <p>Chat about them for free, then hear what they'd tell you in their own voice. $9.99, and your money back if it doesn't sound like them.</p>
  <a href="/tell">Start their reading</a>
</aside>
</main>
<footer>
  A playful AI experience, never veterinary advice. Health questions go to your vet.<br>
  <a href="/">My Little Shadow</a><a href="/tell">What they'd tell you</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a>
</footer>
</body>
</html>
"""

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        build(Path(arg))
