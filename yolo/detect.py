import torch
import cv2
from model.yolo import YOLO

model = YOLO(num_classes=80)
model.load_state_dict(torch.load("yolo.pt"))

model.eval()

img = cv2.imread("test.jpg")
img = cv2.resize(img,(416,416))

tensor = torch.tensor(img).permute(2,0,1).float()/255
tensor = tensor.unsqueeze(0)

with torch.no_grad():

    preds = model(tensor)

print(preds[0].shape)