from chessmodel.evaluate import GameResult, results_to_pgn, tally


def test_results_to_pgn_and_tally():
    results = [
        GameResult(white="model", black="sf-1", result="1-0"),
        GameResult(white="sf-1", black="model", result="1-0"),
        GameResult(white="model", black="sf-1", result="1/2-1/2"),
    ]
    pgn = results_to_pgn(results)
    assert pgn.count("[Result") == 3
    score = tally(results, "model")
    # model: win + loss + draw -> 1.0 + 0.0 + 0.5 = 1.5 of 3
    assert score["points"] == 1.5
    assert score["games"] == 3
