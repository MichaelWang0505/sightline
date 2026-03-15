import torch.nn as nn
from .blocks import Conv, Residual

class Backbone(nn.Module):

    def __init__(self):
        super().__init__()

        self.layer1 = nn.Sequential(
            Conv(3,32,3,2),
            Residual(32)
        )

        self.layer2 = nn.Sequential(
            Conv(32,64,3,2),
            Residual(64),
            Residual(64)
        )

        self.layer3 = nn.Sequential(
            Conv(64,128,3,2),
            Residual(128),
            Residual(128)
        )

        self.layer4 = nn.Sequential(
            Conv(128,256,3,2),
            Residual(256),
            Residual(256)
        )

    def forward(self,x):

        x1 = self.layer1(x)
        x2 = self.layer2(x1)
        x3 = self.layer3(x2)
        x4 = self.layer4(x3)

        return x2,x3,x4