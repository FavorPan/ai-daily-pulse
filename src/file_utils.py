"""Internal file-system utilities.

Provides atomic writes so a crash mid-write never leaves a truncated JSON
file behind. Ported from Horizon's ``_file_utils._atomic_write_text``.
"""

import os
import tempfile
from pathlib import Path


def atomic_write_text(path: str | Path, content: str) -> None:
    """Write ``content`` to ``path`` via a same-directory temp file + atomic replace.

    - Creates parent directories if missing.
    - On any exception the temp file is removed, leaving the original untouched.
    """
    target = Path(path)
    parent = target.parent
    parent.mkdir(parents=True, exist_ok=True)

    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=parent,
            prefix=f".{target.name}.",
            suffix=".tmp",
            delete=False,
        ) as temp_file:
            temp_path = Path(temp_file.name)
            temp_file.write(content)
        os.replace(temp_path, target)
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
