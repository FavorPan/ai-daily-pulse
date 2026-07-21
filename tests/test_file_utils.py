"""Tests for atomic_write_text."""
from unittest.mock import patch

import pytest

from src.file_utils import atomic_write_text


def test_writes_content(tmp_path):
    path = tmp_path / "out.json"
    atomic_write_text(str(path), '{"a": 1}')
    assert path.read_text(encoding="utf-8") == '{"a": 1}'


def test_creates_parent_dirs(tmp_path):
    path = tmp_path / "nested" / "deep" / "out.json"
    atomic_write_text(str(path), "hello")
    assert path.read_text(encoding="utf-8") == "hello"


def test_overwrites_existing(tmp_path):
    path = tmp_path / "out.json"
    path.write_text("OLD", encoding="utf-8")
    atomic_write_text(str(path), "NEW")
    assert path.read_text(encoding="utf-8") == "NEW"


def test_no_temp_file_left_on_failure(tmp_path):
    """If os.replace raises, the temp file must be cleaned up and target untouched."""
    path = tmp_path / "out.json"
    path.write_text("ORIGINAL", encoding="utf-8")

    files_before = set(tmp_path.iterdir())
    with patch("src.file_utils.os.replace", side_effect=OSError("boom")):
        with pytest.raises(OSError):
            atomic_write_text(str(path), "NEW")

    # Original content preserved
    assert path.read_text(encoding="utf-8") == "ORIGINAL"
    # No leftover temp files
    files_after = set(tmp_path.iterdir())
    assert files_before == files_after
    assert all(not f.name.startswith(".out.json.") for f in files_after)
