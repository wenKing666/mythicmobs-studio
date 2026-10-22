# -*- coding: utf-8 -*-
"""生成应用图标 build/icon.ico（electron-builder 用）与 docs/img/icon.png（README 用）。
纯 Pillow 几何绘制：深色圆角底 + 风格化骷髅 + 红眼，跟编辑器的工具风一致。
用法: python tools/make_icon.py
"""
import os
from PIL import Image, ImageDraw

S = 512
BG = (29, 35, 43, 255)        # 深色底（跟 UI 的 --panel 一个调子）
BONE = (232, 230, 223, 255)   # 骨白
DARK = (29, 35, 43, 255)      # 骷髅上的"镂空"色 = 背景色
EYE = (214, 69, 65, 255)      # 红眼
GREEN = (106, 190, 106, 255)  # 点缀绿（Minecraft 感）

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# 圆角底
d.rounded_rectangle([16, 16, S - 16, S - 16], radius=96, fill=BG)

cx = S // 2
# 头骨：主圆 + 下颌圆角矩形
head_r = 150
d.ellipse([cx - head_r, 96, cx + head_r, 96 + head_r * 2], fill=BONE)
d.rounded_rectangle([cx - 108, 300, cx + 108, 396], radius=44, fill=BONE)

# 眼窝
for ex in (cx - 62, cx + 62):
    d.ellipse([ex - 40, 190, ex + 40, 268], fill=DARK)
    d.ellipse([ex - 16, 214, ex + 16, 246], fill=EYE)

# 鼻孔（倒三角）
d.polygon([(cx, 282), (cx - 16, 318), (cx + 16, 318)], fill=DARK)

# 牙缝
for i, tx in enumerate(range(cx - 78, cx + 79, 26)):
    x0 = tx + (13 if i % 2 == 0 else 0)
    d.rectangle([x0 - 2, 344, x0 + 2, 392], fill=DARK)

# 下颌两侧留两颗尖牙的错觉：把牙缝画在骨色上即可，上面循环已做

# 左上一颗小小的"编辑星"：绿色四角星，代表这是一把编辑器
def star4(x, y, r, color):
    d.polygon([(x, y - r), (x + r * 0.28, y - r * 0.28), (x + r, y),
               (x + r * 0.28, y + r * 0.28), (x, y + r),
               (x - r * 0.28, y + r * 0.28), (x - r, y),
               (x - r * 0.28, y - r * 0.28)], fill=color)

star4(96, 108, 34, GREEN)

os.makedirs("build", exist_ok=True)
img.save("build/icon.png")
sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
img.save("build/icon.ico", sizes=sizes)
os.makedirs("docs/img", exist_ok=True)
img.resize((128, 128), Image.LANCZOS).save("docs/img/icon.png")
print("build/icon.ico + build/icon.png + docs/img/icon.png 完成")
