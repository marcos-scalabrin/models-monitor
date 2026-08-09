#!/usr/bin/env python3
"""Fail the local/CI gate when a likely credential is in a committable file.

This deliberately checks tracked and non-ignored files only: local `.env` files
remain private, while an accidentally added credential is caught before commit.
Only the file, line and rule are reported so a failing gate does not echo a
secret into logs.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


RULES = {
    "private key": re.compile(r"-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    "OpenAI key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"),
    "credential assignment": re.compile(
        r"(?i)\b(?:[a-z0-9]+[_-])*(?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)"
        r"\s*[:=]\s*[\"']?(?!\$\{|<|your_|example|changeme)[A-Za-z0-9_./+=-]{16,}"
    ),
}


def committable_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-co", "--exclude-standard"],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    )
    return [Path(name) for name in result.stdout.splitlines()]


def main() -> int:
    findings: list[str] = []
    for path in committable_files():
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for line_number, line in enumerate(text.splitlines(), start=1):
            for name, pattern in RULES.items():
                if pattern.search(line):
                    findings.append(f"{path}:{line_number}: likely {name}")

    if findings:
        print("Potential secrets found (value intentionally redacted):", file=sys.stderr)
        print("\n".join(findings), file=sys.stderr)
        return 1

    print("secret scan OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
