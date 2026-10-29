# 奶蛙弹幕祭 · Naiwa Danmaku Festival

东方 Project 风格的单人弹幕射击游戏：大奶蛙吐小奶蛙，去打屏幕上方那个疯狂摇头的敌人。
纯前端（Canvas 2D + 原生 ES Module），零构建、零依赖、无后端，可直接托管在 GitHub Pages。

## 在线玩

`https://<你的 GitHub 用户名>.github.io/naiwa-danmaku/`

也可以直接下载 `play-standalone.html`（单文件版，双击即玩，图片和音乐全部内联）。

## 操作

| 操作 | 键盘 | 触摸 |
| --- | --- | --- |
| 移动 | `↑ ↓ ← →` / `WASD` | 手指按住拖动 |
| 发射小奶蛙 | `Z` / `J` / 空格 | 按住即自动开火 |
| 放符（清屏炸弹） | `X` / `K` | — |
| 慢速 + 显示判定点 | `Shift` | — |
| 暂停 / 重开 / 回标题 | `P` / `R` / `Esc` | — |
| 静音（音效 + 背景音乐） | `M` | — |

判定点只有肚子上那颗小红点（半径 3.2px），贴弹擦过会加分（擦弹 / Graze）。

## 内容

- 3 个难度：Easy 散步 / Normal 正经 / Lunatic 想不开
- Boss 三张符卡：开场符「笑到打鸣」、混乱符「摇头大旋风」、终符「笑到模糊」，按血量切换阶段
- 系统：3 命 2 符、受击无敌、符卡清屏、Boss 血条、擦弹计分、最高分（localStorage）、通关结算
- 背景音乐：《屋顶上的东南山》（`assets/bgm.mp3`，循环，首次点击后开始播放）

## 本地运行

```bash
node serve.mjs 8123     # 然后打开 http://127.0.0.1:8123
```

`index.html` 用 ES Module，必须走 HTTP（`file://` 下浏览器不允许加载模块）；不想起服务器就用 `play-standalone.html`。

## 目录

```
index.html            入口
style.css             界面 / 标题 / 结算样式
src/main.js           主循环、状态机、HUD、autotest
src/player.js         大奶蛙：移动 / 射击 / 判定 / 擦弹 / 放符
src/enemy.js          Boss + 小怪 + 三张符卡
src/bullets.js        弹幕池、粒子、飘字、绘制
src/assets.js         图片预加载
src/audio.js          WebAudio 合成音效
src/music.js          背景音乐
src/input.js          键盘 / 指针输入
assets/               精灵图 + bgm.mp3
play-standalone.html  单文件版（内联全部资源）
GAME.md               完整玩法 / 调参说明
```

## 调参

- 难度曲线：`src/enemy.js` 顶部 `DIFFS`
- 玩家手感：`src/player.js` 顶部 `NORMAL_SPEED` / `FOCUS_SPEED` / `SHOT_INTERVAL` / `GRAZE_R`
- 符卡节奏：`src/enemy.js` 里 `Boss.update()` 的三个分支
- 配色：`src/bullets.js` 的 `BULLET_COLORS`

## 素材

主角动画取自桌宠 `naixiaowa.exe` 运行时释放的帧（`f0001.webp … f0432.webp`），敌人为用户提供的摇头蛙图。
