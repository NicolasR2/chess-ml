import torch
from chessmodel.train import init_from_checkpoint
from chessmodel.model import ChessNet


def test_init_from_checkpoint_loads_weights(tmp_path):
    src = ChessNet(channels=16, blocks=1)
    path = tmp_path / "src.pt"
    torch.save({"channels": 16, "blocks": 1, "state_dict": src.state_dict()}, path)

    dst = ChessNet(channels=16, blocks=1)
    init_from_checkpoint(dst, str(path))

    for (ka, va), (kb, vb) in zip(src.state_dict().items(), dst.state_dict().items()):
        assert ka == kb
        assert torch.equal(va, vb)
