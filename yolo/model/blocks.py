import torch
import torch.nn as nn

class Conv(nn.Module):

    def __init__(self, in_c, out_c, k=3, s=1):
        super().__init__()

        self.conv = nn.Conv2d(in_c, out_c, k, s, k//2, bias=False)
        self.bn = nn.BatchNorm2d(out_c)
        self.act = nn.SiLU()

    def forward(self, x):
        return self.act(self.bn(self.conv(x)))


class Residual(nn.Module):

    def __init__(self, channels):
        super().__init__()

        self.block = nn.Sequential(
            Conv(channels, channels),
            Conv(channels, channels)
        )

    def forward(self, x):
        return x + self.block(x)