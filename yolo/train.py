import torch
from torch.utils.data import DataLoader
from model.yolo import YOLO
from data.dataset import YoloDataset
from loss import YoloLoss

dataset = YoloDataset(
    "images",
    "labels"
)

loader = DataLoader(
    dataset,
    batch_size=8,
    shuffle=True
)

model = YOLO(num_classes=80)

loss_fn = YoloLoss(80)

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=1e-4
)

epochs = 50

for epoch in range(epochs):

    for imgs,targets in loader:

        preds = model(imgs)

        loss = loss_fn(preds[0],targets)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    print("epoch:",epoch,"loss:",loss.item())

torch.save(model.state_dict(),"yolo.pt")