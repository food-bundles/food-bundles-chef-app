"""Step 1b helpers: pull the chef-facing reply out of a streamed JSON answer, and format SSE.

The Assistant answers in a JSON object (structured output). While it streams, only the
`reply_text` string is shown to the chef; the rest (action, params) is validated by the
server at the end, exactly like the non-streaming path.
"""

from __future__ import annotations

import json
from typing import Any

_ESCAPES = {'"': '"', "\\": "\\", "/": "/", "b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t"}


class ReplyTextExtractor:
    """Incremental reader of one JSON string field (default `reply_text`).

    Feed raw text chunks; each call returns the newly decoded characters of the field's value
    (empty until the field starts, and after it ends). Handles escapes split across chunks.
    """

    def __init__(self, field: str = "reply_text") -> None:
        self._key = f'"{field}"'
        self._buffer = ""
        self._pos = 0  # next index to read once inside the value
        self._state = "seek"  # seek → colon → value → done
        self._pending_escape = ""

    def feed(self, chunk: str) -> str:
        self._buffer += chunk
        out: list[str] = []
        while True:
            if self._state == "seek":
                found = self._buffer.find(self._key, self._pos)
                if found == -1:
                    # Keep enough tail to match a key split across chunks.
                    self._pos = max(self._pos, len(self._buffer) - len(self._key))
                    return ""
                self._pos = found + len(self._key)
                self._state = "colon"
            if self._state == "colon":
                while self._pos < len(self._buffer) and self._buffer[self._pos] in " \t\r\n:":
                    self._pos += 1
                if self._pos >= len(self._buffer):
                    return "".join(out)
                if self._buffer[self._pos] != '"':
                    self._state = "done"  # not a string value: nothing to show
                    return "".join(out)
                self._pos += 1
                self._state = "value"
            if self._state == "value":
                while self._pos < len(self._buffer):
                    ch = self._buffer[self._pos]
                    if self._pending_escape:
                        seq = self._pending_escape + ch
                        if seq.startswith("\\u"):
                            if len(seq) < 6:
                                self._pending_escape = seq
                                self._pos += 1
                                continue
                            try:
                                out.append(chr(int(seq[2:], 16)))
                            except ValueError:
                                pass
                        else:
                            out.append(_ESCAPES.get(ch, ch))
                        self._pending_escape = ""
                        self._pos += 1
                        continue
                    if ch == "\\":
                        self._pending_escape = "\\"
                        self._pos += 1
                        continue
                    if ch == '"':
                        self._state = "done"
                        self._pos += 1
                        return "".join(out)
                    out.append(ch)
                    self._pos += 1
                return "".join(out)
            return "".join(out)


def sse(event: str, data: Any) -> str:
    """One Server-Sent Events message."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"
