import torch

def iou(box1,box2):

    x1 = max(box1[0],box2[0])
    y1 = max(box1[1],box2[1])
    x2 = min(box1[2],box2[2])
    y2 = min(box1[3],box2[3])

    inter = max(0,x2-x1)*max(0,y2-y1)

    area1 = (box1[2]-box1[0])*(box1[3]-box1[1])
    area2 = (box2[2]-box2[0])*(box2[3]-box2[1])

    union = area1+area2-inter

    return inter/union


def nms(boxes,scores,thr=0.5):

    idx = scores.argsort(descending=True)
    keep = []

    while len(idx)>0:

        i = idx[0]
        keep.append(i)

        if len(idx)==1:
            break

        rest = idx[1:]

        ious = torch.tensor([
            iou(boxes[i],boxes[j]) for j in rest
        ])

        idx = rest[ious<thr]

    return keep