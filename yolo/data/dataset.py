import torch
from torch.utils.data import Dataset
import cv2
import os

class YoloDataset(Dataset):

    def __init__(self,img_dir,label_dir,img_size=416):

        self.img_dir = img_dir
        self.label_dir = label_dir
        self.images = os.listdir(img_dir)
        self.size = img_size

    def __len__(self):
        return len(self.images)

    def __getitem__(self,idx):

        img_path = os.path.join(self.img_dir,self.images[idx])
        label_path = os.path.join(
            self.label_dir,
            self.images[idx].replace(".jpg",".txt")
        )

        img = cv2.imread(img_path)
        img = cv2.resize(img,(self.size,self.size))

        img = img[:,:,::-1]/255
        img = torch.tensor(img).permute(2,0,1).float()

        boxes = []

        with open(label_path) as f:
            for line in f:
                cls,x,y,w,h = map(float,line.split())
                boxes.append([cls,x,y,w,h])

        return img, torch.tensor(boxes)