import torch
from chessmodel.model import ChessNet
from chessmodel.encoding import PLANE_COUNT, POLICY_SIZE


def test_forward_shapes_and_value_range():
    net = ChessNet(channels=16, blocks=2)
    net.train(False)
    x = torch.randn(4, PLANE_COUNT, 8, 8)
    policy, value = net(x)
    assert policy.shape == (4, POLICY_SIZE)
    assert value.shape == (4, 1)
    assert torch.all(value <= 1.0) and torch.all(value >= -1.0)
