import json
import pytest
from chessmodel.levelconfig import load_level_config, nearest_level, get_profile
from chessmodel.difficulty import DifficultyProfile


def _write(tmp_path):
    data = {
        "model": "checkpoints/model.pt",
        "levels": {
            "1000": {"sims": 40, "temperature": 1.0, "blunder_rate": 0.25, "top_k": 0},
            "2000": {"sims": 600, "temperature": 0.2, "blunder_rate": 0.01, "top_k": 3},
        },
    }
    p = tmp_path / "lc.json"
    p.write_text(json.dumps(data))
    return p


def test_load_parses_int_levels(tmp_path):
    cfg = load_level_config(str(_write(tmp_path)))
    assert set(cfg["levels"].keys()) == {1000, 2000}
    assert cfg["model"] == "checkpoints/model.pt"


def test_nearest_level_snaps(tmp_path):
    cfg = load_level_config(str(_write(tmp_path)))
    assert nearest_level(cfg, 1190) == 1000
    assert nearest_level(cfg, 1600) == 2000


def test_get_profile_returns_resolved_level_and_profile(tmp_path):
    cfg = load_level_config(str(_write(tmp_path)))
    resolved, prof = get_profile(cfg, 1900)
    assert resolved == 2000
    assert isinstance(prof, DifficultyProfile)
    assert prof.sims == 600 and prof.top_k == 3


def test_malformed_json_raises(tmp_path):
    p = tmp_path / "bad.json"
    p.write_text("{ not json")
    with pytest.raises(ValueError):
        load_level_config(str(p))


def test_shipped_config_is_valid():
    cfg = load_level_config("configs/level_config.json")
    assert set(cfg["levels"].keys()) == {500, 1000, 1200, 1500, 1800, 2000, 2200}
