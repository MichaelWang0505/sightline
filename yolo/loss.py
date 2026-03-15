import torch
import torch.nn as nn

class YoloLoss(nn.Module):

    def __init__(self,num_classes):

        super().__init__()

        self.mse = nn.MSELoss()
        self.bce = nn.BCEWithLogitsLoss()
        self.ce = nn.CrossEntropyLoss()

        self.num_classes = num_classes

    def forward(self,pred,target):

        box_pred = pred[...,:4]
        obj_pred = pred[...,4]
        cls_pred = pred[...,5:]

        box_target = target[...,:4]
        obj_target = target[...,4]
        cls_target = target[...,5]

        box_loss = self.mse(box_pred,box_target)
        obj_loss = self.bce(obj_pred,obj_target)
        cls_loss = self.ce(cls_pred,cls_target.long())

        return box_loss+obj_loss+cls_loss