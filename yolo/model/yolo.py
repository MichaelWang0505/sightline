import torch.nn as nn
from .backbone import Backbone
from .head import DetectHead

class YOLO(nn.Module):

    def __init__(self,num_classes):

        super().__init__()

        self.backbone = Backbone()

        anchors = [
            [(10,13),(16,30),(33,23)],
            [(30,61),(62,45),(59,119)],
            [(116,90),(156,198),(373,326)]
        ]

        self.head_small = DetectHead(64,anchors[0],num_classes)
        self.head_medium = DetectHead(128,anchors[1],num_classes)
        self.head_large = DetectHead(256,anchors[2],num_classes)

    def forward(self,x):

        p3,p4,p5 = self.backbone(x)

        out_small = self.head_small(p3)
        out_medium = self.head_medium(p4)
        out_large = self.head_large(p5)

        return [out_small,out_medium,out_large]