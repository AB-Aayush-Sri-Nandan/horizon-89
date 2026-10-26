"""Credential-pattern scan of versionable project files. Never print matched values.
Heuristic only: cannot prove absence of secrets. Excludes local secrets/caches/assets.
"""
from pathlib import Path
import re
import subprocess

patterns = [re.compile(r'\b(?:sk-(?:proj-)?|gsk_)[A-Za-z0-9_-]{20,}'),
            re.compile(r'\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}'),
            re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
            re.compile(r'\bAKIA[A-Z0-9]{16}\b'),
            re.compile(r'VITE_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*=\s*[\'\"]?[^\s\'\"#]{8,}')]
paths = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z']).decode().split('\0')
failures = []
scanned = 0
for filename in sorted(set(filter(None, paths))):
    p = Path(filename)
    if not p.is_file() or p.is_symlink() or p.stat().st_size > 2_000_000:
        continue
    try:
        content = p.read_text()
    except UnicodeDecodeError:
        continue
    scanned += 1
    if any(pattern.search(content) for pattern in patterns):
        failures.append(filename)
for filename in failures:
    print(f'Potential credential pattern: {filename} (value redacted)')
print(f'Credential-pattern scan: {scanned} text files; {len(failures)} flagged files. Heuristic, not a security certification.')
raise SystemExit(bool(failures))
