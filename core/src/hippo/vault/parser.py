"""Best-effort metadata extraction from captured, free-form Markdown."""

import json
import math
import re
from datetime import date, datetime
from pathlib import PurePosixPath

import yaml
from markdown_it import MarkdownIt
from markdown_it.token import Token
from yaml.events import AliasEvent, CollectionEndEvent, CollectionStartEvent, ScalarEvent

from hippo.vault.models import ParsedNote
from hippo.vault.source import MAX_NOTE_BYTES

PROCESSOR_VERSION = "markdown-v3"
_MAX_FRONTMATTER_BYTES = 64 * 1024
_MAX_YAML_DEPTH = 50
_MAX_YAML_EVENTS = 10_000

type JsonValue = None | bool | int | float | str | list[JsonValue] | dict[str, JsonValue]


def _json_value(value: object) -> JsonValue:
    """Convert safe YAML values to strict JSON; reject ambiguous object types."""
    if isinstance(value, str):
        value.encode("utf-8")
        return value
    if value is None or isinstance(value, (bool, int)):
        return value
    if isinstance(value, float) and math.isfinite(value):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_json_value(item) for item in value]
    if isinstance(value, dict):
        result: dict[str, JsonValue] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise ValueError("Frontmatter keys must be strings")
            key.encode("utf-8")
            result[key] = _json_value(item)
        return result
    raise ValueError("Frontmatter contains a value that cannot be represented as JSON")


def _load_frontmatter(source: str) -> dict[str, JsonValue]:
    """Bound YAML work before construction; aliases never need expansion."""
    depth = 0
    has_scalar = False
    for count, event in enumerate(yaml.parse(source, Loader=yaml.SafeLoader), start=1):
        if count > _MAX_YAML_EVENTS or isinstance(event, AliasEvent):
            raise ValueError("Frontmatter exceeds parsing limits or uses YAML aliases")
        if isinstance(event, CollectionStartEvent):
            depth += 1
            if depth > _MAX_YAML_DEPTH:
                raise ValueError("Frontmatter is nested too deeply")
        elif isinstance(event, CollectionEndEvent):
            depth -= 1
        elif isinstance(event, ScalarEvent):
            has_scalar = True
    loaded = yaml.safe_load(source)
    # Empty YAML (including comments only) has no metadata.
    if loaded is None and not has_scalar:
        return {}
    normalized = _json_value(loaded)
    if not isinstance(normalized, dict):
        raise ValueError("Frontmatter must be a mapping")
    return normalized


def _frontmatter(content: str) -> tuple[dict[str, JsonValue], str]:
    """Remove only recognized metadata; malformed/unsupported YAML remains body text."""
    lines = content.split("\n")
    if lines[0].rstrip() != "---":
        return {}, content
    size = 0
    for index, line in enumerate(lines[1:], start=1):
        size += len(line.encode("utf-8")) + 1
        if size > _MAX_FRONTMATTER_BYTES:
            break
        if line.rstrip() in {"---", "..."}:
            try:
                metadata = _load_frontmatter("\n".join(lines[1:index]))
            except (yaml.YAMLError, ValueError, OverflowError):
                break
            return metadata, "\n".join(lines[index + 1 :])
    return {}, content


def _tags(metadata: dict[str, JsonValue]) -> list[str]:
    """Recognize string/list tags without imposing a schema on other metadata."""
    value = metadata.get("tags")
    candidates = re.split(r"[\s,]+", value) if isinstance(value, str) else value
    if not isinstance(candidates, list):
        return []
    tags: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        if isinstance(candidate, str):
            tag = candidate.strip().lstrip("#")
            if tag and tag not in seen:
                seen.add(tag)
                tags.append(tag)
    return tags


def _inline_text(tokens: list[Token]) -> str:
    """Retain visible text, code and image alt text, without Markdown delimiters."""
    pieces: list[str] = []
    for token in tokens:
        if token.type in {"softbreak", "hardbreak"}:
            pieces.append("\n")
        elif token.children is not None:
            pieces.append(_inline_text(token.children))
        elif token.type in {"text", "code_inline", "html_inline"}:
            pieces.append(token.content)
    return "".join(pieces)


def _links(tokens: list[Token]) -> list[dict[str, JsonValue]]:
    """Extract destinations, labels, and kinds without storing source positions."""
    links: list[dict[str, JsonValue]] = []
    for index, token in enumerate(tokens):
        if token.type == "link_open":
            target = token.attrGet("href")
            end = index + 1
            while end < len(tokens) and tokens[end].type != "link_close":
                end += 1
            label = _inline_text(tokens[index + 1 : end])
            kind = "link"
        elif token.type == "image":
            target = token.attrGet("src")
            label = _inline_text(token.children or [])
            kind = "image"
        else:
            continue
        if isinstance(target, str):
            links.append(
                {
                    "target": target,
                    "label": label,
                    "kind": kind,
                }
            )
    return links


def _json(value: JsonValue) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False)


def _searchable_text(body: str, spans: list[tuple[int, int, str]]) -> str:
    """Keep source gaps too, including syntax beyond the Markdown parser's limits."""
    lines = body.split("\n")
    pieces: list[str] = []
    next_line = 0
    for start, end, text in spans:
        if start > next_line:
            pieces.append("\n".join(lines[next_line:start]).rstrip("\n"))
        pieces.append(text)
        next_line = max(next_line, end)
    if next_line < len(lines):
        pieces.append("\n".join(lines[next_line:]).rstrip("\n"))
    return "\n".join(pieces)


def parse_note(content: str, relative_path: str) -> ParsedNote:
    """Parse optional metadata without requiring a note template.

    Title preference: nonblank YAML title, first nonblank H1, filename stem.
    CommonMark headings, links and images are recognized; other syntax remains
    ordinary text. Valid frontmatter is removed from the searchable body. Invalid,
    unterminated or unsupported frontmatter remains ordinary Markdown. Headings
    store only their level and text; source ranges are used internally to keep
    searchable text complete.

    Input must be valid UTF-8 text within the source reader's 10 MiB limit. Parsing
    normalizes a leading BOM and line endings without changing captured content.
    No files or database records are read or written.
    """
    try:
        size = len(content.encode("utf-8"))
    except UnicodeEncodeError as error:
        raise ValueError("Source note must contain valid UTF-8") from error
    if size > MAX_NOTE_BYTES:
        raise ValueError("Source note exceeds 10 MiB")
    normalized = content.removeprefix("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    metadata, body = _frontmatter(normalized)
    tokens = MarkdownIt("commonmark").parse(body)
    headings: list[JsonValue] = []
    links: list[JsonValue] = []
    text_spans: list[tuple[int, int, str]] = []
    first_h1 = ""
    for index, token in enumerate(tokens):
        if token.type == "inline":
            children = token.children or []
            text = _inline_text(children)
            if token.map is None:
                continue
            text_range = token.map
            links.extend(_links(children))
            previous = tokens[index - 1] if index else None
            if previous is not None and previous.type == "heading_open":
                level = int(previous.tag[1:])
                heading_range = previous.map or token.map
                text_range = heading_range
                headings.append(
                    {
                        "level": level,
                        "text": text,
                    }
                )
                if level == 1 and not first_h1:
                    first_h1 = text.strip()
            text_spans.append((text_range[0], text_range[1], text))
        elif token.type in {"fence", "code_block", "html_block"}:
            if token.map is not None:
                text_spans.append((token.map[0], token.map[1], token.content.rstrip("\n")))
    yaml_title = metadata.get("title")
    title = yaml_title.strip() if isinstance(yaml_title, str) else ""
    return ParsedNote(
        title=title or first_h1 or PurePosixPath(relative_path).stem,
        frontmatter_json=_json(metadata),
        tags_json=_json(list(_tags(metadata))),
        headings_json=_json(headings),
        links_json=_json(links),
        searchable_text=_searchable_text(body, text_spans),
    )
