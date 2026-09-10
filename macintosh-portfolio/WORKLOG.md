# 工作记录 — 2026-08-23 ~ 2026-08-24

项目：3D 收藏品 portfolio 网站（向 Steve Jobs 致敬，见 `CONCEPT.md`）

## 目标

- 准备可换色、精确的 Macintosh 128K 电脑 + 软盘 3D 模型
- 集成进 `index.html`，加交互

## 投入

模型准备：~6 小时（含选源、Meshy AI 调整、贴图、染色验证）

## 进度

### ✅ 已完成 — 模型准备

| 模型 | 文件 | 大小 | 状态 |
|------|------|------|------|
| Macintosh 128K 电脑 | `assets/macintosh_128k_computer_1984_trimmed.glb` | 3.5 MB | 可换色、几何精确 |
| 软盘（白膜） | `assets/white_floppy_disk.glb` | 934 KB | 4 mesh / 4 独立材质 / 1 可换贴图 |

**两件都按"白膜"思路准备**：几何位置准确、材质互相独立、baseColor 接近中性色，方便前端 runtime 改色。

### ✅ 已完成 — 工具

- `tools/glb-editor.html` — 本地 GLB 颜色编辑器（点部件选色 + 导出）
- `assets/README.md` — 软盘模型使用说明（贴图位置、改色方式、踩坑记录）

### ⏳ 进行中 — 集成 + 交互

- 把 GLB 加载进 `index.html`（Three.js）
- 设计 swatch 选色面板（6-7 个精选 + custom color input）
- label 区域叠加 HTML 信息层（KYANOS / INDEX / Pictures #5）
- 电脑 + 软盘 各自的交互场景

## 关键技术决策

1. **Runtime 改色，不 prebaked 多色 GLB** — 之前踩过坑，PBR+ACES+IBL 下 prebaked 颜色渲染色偏
2. **软盘 label 用 HTML 元素覆盖** — 比改 baked 贴图灵活，支持动态内容
3. **Meshy AI 出图 → 手工 trim 缩放 → 白膜化处理** — 保证 node matrix 干净、贴图独立

## 已知问题（不影响当前进度，但需注意）

| 问题 | 影响 | 处理 |
|------|------|------|
| 软盘 label mesh Z 飘在 body 外 0.65 单位空气里 | 编辑器点不到 label；改色不影响（绑在材质上） | HTML 覆盖对位用 CSS transform 算 |
| `baseColorFactor` 是 linear 不是 sRGB | 写 GLB 时 hex 必须转 linear float | 写一份转换函数备用 |
| Prebaked 改色 GLB 色偏 | 容易在交接时引入 | 严格走 runtime 改色路线 |

## 配套命令

```bash
# 启动本地 GLB 颜色编辑器
cd tools && python3 -m http.server 8766 --bind 127.0.0.1
# → http://127.0.0.1:8766/glb-editor.html?model=../assets/white_floppy_disk.glb
```

## 下一步 TODO

- [ ] Three.js 加载 GLB 到 `index.html`
- [ ] 软盘 swatch 选色面板（黑/白/红/蓝/紫/品牌色 + custom）
- [ ] label 区域 HTML 覆盖层（KYANOS 横条 + INDEX + Pictures #5）
- [ ] 电脑 swatch 选色（外壳色 + 屏幕色）
- [ ] 交互场景：拖拽软盘进出电脑？点击触发信息层？
- [ ] 移动端适配

## 旧资产（参考用，不参与集成）

- `models/floppy_disk.glb` (833 KB) — 旧版软盘，prebaked 黑底
- `models/floppy_box.glb` (228 KB) — 软盘盒
- `img/floppies/` — 实物软盘照片（参考素材）
