# 白膜软盘模型说明

> 文件：`white_floppy_disk.glb` (934 KB) — Meshy AI 出的"白膜"版，适合 runtime 改色 + HTML 覆盖。

## 4 个 Mesh / 4 个独立材质

| Mesh | 材质 | 当前 baseColor | 改色方式 |
|------|------|---------------|---------|
| 塑料外壳 (body) | `plastic` | 白 rgb(244) | runtime `.color.set('#hex')` |
| 金属滑盖 (shutter) | `Alluminum` | 黑 rgb(0) | 同上 |
| 中间圆盘 (disk) | `disk` | 黑 rgb(0) | 同上 |
| 标签 (label) | `etiquette` | 白 + 贴图 | 改 PNG 或 runtime 改 color |

**4 个材质完全独立**，可分别上色。**不要 prebake 多色 GLB**（PBR+ACES+IBL 下色偏，详见底部踩坑记录）。

## 标签是可换贴图

- 内嵌在 GLB 的 `bufferView[14]`（218 KB PNG, 1024×1024）
- 内容：紫色 KYANOS 横条、Pictures #5 手写体、紫色横线 ×7、INDEX、corner mark
- 绑在 `etiquette` 材质的 `baseColorTexture` 上

**3 种更换方式**：

1. **运行时换贴图**（最灵活）：`THREE.CanvasTexture` 程序化生成，运行时切换
2. **改 PNG 像素**（精确编辑）：解 GLB → PIL 改图 → 重新打包
3. **改 baseColorFactor tint**（整图调色）：粗粒度，会影响所有元素

> 2026-09-10 更新：纸标签已按用户要求恢复，标签面朝向镜头，插入时标签面朝上。不能直接比较不同节点的局部 Z 值：将标签完整变换到 plastic 坐标系后，标签 Z 范围约为 `[-0.000031, 0.002669]`，而外壳前表面在 `0` 和 `0.05`，存在交叠。`prepareFloppy(source)` 现在默认保留标签，将它移到外壳前面并留出 `0.015` 个源模型单位间隙，再统一缩放，同时使用 polygon offset 防止深度冲突。仍可显式传入 `{ includeLabel: false }` 隐藏标签。原始 GLB 和贴图未修改。

## 主体改色

```js
// 例：把外壳改成 brand color
const body = scene.getObjectByName('body');  // 注：本 GLB mesh 是匿名的，按材质名找
const mat = body.material;                    // 4 个独立材质
mat.color.set('#3a7bd5');                     // sRGB hex，three.js 自动转 linear
```

## 推荐 workflow

1. **改色走 runtime**（`.color.set()`），不 prebake
2. **Swatch 6-7 个精选 + 一个 custom color input**（别堆 20+）
3. **默认保留原 design 配色**（黑 body + 紫 KYANOS），不要默认全白膜
4. 主场景不叠加 HTML 标签。需要标签时使用模型材质贴图，并先完成坐标统一和深度分离。

## 踩坑记录（必读）

| 问题 | 解法 |
|------|------|
| `baseColorFactor` 是 **linear 不是 sRGB** | 写 GLB 时 hex→linear：`((c/255+0.055)/1.055)^2.4` |
| PBR+ACES+RoomEnv IBL 下 saturated color 偏粉/淡 | `material.envMapIntensity = 0.2` 减弱 |
| Prebaked 改色 GLB 渲染色偏 | 走 runtime 改色路线 |
| Swatch 太多（21 个）"质量低" | 6-7 个精选 + custom color input |
| 默认白膜没设计感 | 保留原 design 配色（黑 body + 紫 KYANOS） |
| label mesh Z 错位 | 先统一到 plastic 坐标系，再做物理间隙与 polygon offset；不要使用漂浮的 HTML 覆盖层 |

## 配套工具

`../tools/glb-editor.html` — 本地颜色编辑器

- 起服务器：`cd tools && python3 -m http.server 8766 --bind 127.0.0.1`
- 打开：`http://127.0.0.1:8766/glb-editor.html?model=../assets/white_floppy_disk.glb`
- 操作：点模型部件 → 选颜色 → 应用 → 导出 GLB
