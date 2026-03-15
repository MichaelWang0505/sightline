import torch.nn as nn
from .blocks import Conv

class DetectHead(nn.Module):

    def __init__(self, in_c, anchors, num_classes):
        super().__init__()

        self.num_anchors = len(anchors)
        self.num_classes = num_classes

        self.pred = nn.Conv2d(
            in_c,
            self.num_anchors*(num_classes+5),
            1
        )

    def forward(self,x):

        out = self.pred(x)
        return out