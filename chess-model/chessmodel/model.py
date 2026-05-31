import torch
import torch.nn as nn
from chessmodel.encoding import PLANE_COUNT, POLICY_SIZE


class _ResBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.c1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.b1 = nn.BatchNorm2d(c)
        self.c2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.b2 = nn.BatchNorm2d(c)

    def forward(self, x):
        y = torch.relu(self.b1(self.c1(x)))
        y = self.b2(self.c2(y))
        return torch.relu(x + y)


class ChessNet(nn.Module):
    def __init__(self, channels=64, blocks=6, policy_size=POLICY_SIZE):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(PLANE_COUNT, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels), nn.ReLU())
        self.res = nn.Sequential(*[_ResBlock(channels) for _ in range(blocks)])
        self.p_conv = nn.Sequential(
            nn.Conv2d(channels, 32, 1, bias=False), nn.BatchNorm2d(32), nn.ReLU())
        self.p_fc = nn.Linear(32 * 8 * 8, policy_size)
        self.v_conv = nn.Sequential(
            nn.Conv2d(channels, 32, 1, bias=False), nn.BatchNorm2d(32), nn.ReLU())
        self.v_fc1 = nn.Linear(32 * 8 * 8, 256)
        self.v_fc2 = nn.Linear(256, 1)

    def forward(self, x):
        x = self.res(self.stem(x))
        p = self.p_fc(self.p_conv(x).flatten(1))
        v = torch.relu(self.v_fc1(self.v_conv(x).flatten(1)))
        v = torch.tanh(self.v_fc2(v))
        return p, v
