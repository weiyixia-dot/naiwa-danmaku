# 奶蛙弹幕祭 · Naiwa Danmaku Festival

一个能在任何现代浏览器里跑的单人弹幕射击游戏（东方 Project 风格）。主角是「大奶蛙」，一发一发吐出小奶蛙去揍屏幕上方那个疯狂摇头的敌人。

- 纯前端：HTML + CSS + 原生 ES Module + Canvas 2D，零依赖、零构建步骤（打包版甚至零服务器）。
- 素材全部本地化：主角动画来自 `D:\AV\naixiaowa.exe`（奶小蛙桌宠 v1.2.0）自带的表情帧，敌人是用户提供的摇头蛙图。

## 怎么玩

| 操作 | 键盘 | 触摸 |
| --- | --- | --- |
| 移动 | `↑ ↓ ← →` / `WASD` | 手指按住拖动 |
| 发射小奶蛙 | `Z` / `J` / `空格` | 按住即自动开火 |
| 放符（清屏炸弹） | `X` / `K` | — |
| 慢速 + 显示判定点 | `Shift` | — |
| 暂停 / 继续 | `P` | — |
| 重开 | `R` | — |
| 回标题 | `Esc` | — |
| 静音 | `M` | — |

> 判定点只有角色肚子上那颗小红点（半径 3.2px），贴着子弹擦过去会加分：**擦弹（Graze）**。擦得越多分越高。

## 打开方式

**方式一：直接双击 `play-standalone.html`**  
单文件版，图片和 JS 全部内联，`file://` 也能跑，发给别人就能玩。

**方式二：跑源码（方便改）**

```bash
# 任选一种静态服务器，然后打开 http://127.0.0.1:8123
node serve.mjs 8123
# 或 python -m http.server 8123
```

`index.html` 用的是 ES Module，必须经 HTTP 打开（浏览器不允许 `file://` 下加载模块）。

**方式三：丢到公网**

整个文件夹是纯静态资源（无后端、无构建），上传到任意静态托管即可，手机电脑都能直接打开：
GitHub Pages / Cloudflare Pages / Netlify Drop（把文件夹拖进网页就上线）/ Vercel / 对象存储 + CDN。

**方式四：本机一键开公网链接（临时）**

```bat
tools\share.cmd            :: 默认 8123 端口
tools\share.cmd 9000       :: 换端口
```

脚本会起本地服务器 + Cloudflare 快速隧道，几秒后打印一个 `https://xxx.trycloudflare.com` 链接，
任何设备点开就能玩（含背景音乐）。**关掉窗口链接即失效**；Cloudflare 免费隧道不保证在线时长，
要长期链接请用方式三上传到静态托管。

## 游戏内容

- **3 个难度**：Easy 散步 / Normal 正经 / Lunatic 想不开（弹密度、弹速、Boss 血量、得分倍率都不同）。
- **Boss 三张符卡**，按血量进入下一阶段，每张符卡有 34 / 32 / 36 秒计时：
  1. 开场符「笑到打鸣」——扇形瞄准弹 + 缓慢环形弹；
  2. 混乱符「摇头大旋风」——三臂旋转螺旋，方向周期性反转；
  3. 终符「笑到模糊」——带缺口的弹幕墙 + 瞄准弹 + 大环。
- **小怪**：Boss 阶段之间从上方压下，三连瞄准弹，掉命符道具（概率 16%）。
- **系统**：3 命 2 符（Easy 4 命 3 符）、受击后 2.4s 无敌并清屏、符卡清屏 + 1.7s 无敌、Boss 血条、得分与最高分（localStorage）、通关结算。
- **音效**：WebAudio 现场合成（射击 / 命中 / 擦弹 / 爆炸 / 放符 / 符卡宣言），不加载任何音频文件。
- **背景音乐**：`assets/bgm.mp3`（《屋顶上的东南山》，循环播放，音量 0.34，`M` 一键静音）。
  浏览器要求先有一次点击/按键才会出声，所以标题页按一下开始键音乐就起来了。

## 目录

```
naixiaowa-danmaku/
├── index.html              # 入口（ES Module 版）
├── play-standalone.html    # 单文件版（双击即玩）
├── style.css               # 界面、标题、结算样式
├── serve.mjs               # 30 行静态服务器
├── src/
│   ├── main.js             # 主循环、状态机、HUD、autotest
│   ├── player.js           # 大奶蛙：移动 / 射击 / 判定 / 擦弹 / 放符
│   ├── enemy.js            # Boss + 小怪 + 三张符卡
│   ├── bullets.js          # 弹幕池、粒子、飘字、绘制
│   ├── assets.js           # 图片预加载
│   ├── audio.js            # WebAudio 合成音效
│   ├── music.js            # 背景音乐（bgm.mp3，首次交互后播放）
│   └── input.js            # 键盘 / 指针 / 自动驾驶注入
├── assets/
│   ├── bgm.mp3             # 背景音乐
│   ├── player/             # idle / shoot / hurt / down / shot / ring
│   └── enemy/              # hamster / hamster_small / hamster_dark
└── tools/
    ├── build_assets.py     # 从桌宠运行时帧裁出游戏精灵图
    ├── bundle.py           # 生成 play-standalone.html（含 mp3 内联）
    └── share.cmd           # 本机一键开公网链接（cloudflared 隧道）
```

> `tools/share.cmd` 需要 `cloudflared.exe`：放在本目录上一级的 `_bin\` 里，或装进 PATH。
> 下载地址：<https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe>

## 调参入口

- 难度曲线：`src/enemy.js` 顶部 `DIFFS`（血量、弹速、密度、命数、得分倍率）。
- 玩家手感：`src/player.js` 顶部 `NORMAL_SPEED` / `FOCUS_SPEED` / `SHOT_INTERVAL` / `GRAZE_R`。
- 符卡节奏：`src/enemy.js` 里 `Boss.update()` 的三个分支（改 `bulletTimer` 间隔与 `emitFan/emitRing` 参数最直接）。
- 画面配色：`src/bullets.js` 的 `BULLET_COLORS`。

## 自测模式

URL 加参数即可用内置自动驾驶跑一局并把指标打到左上角（同时写入 `window.__TEST__`）：

```
http://127.0.0.1:8123/?autotest=60          # 同步模拟 60 秒
http://127.0.0.1:8123/?autotest=240&god=1  # 无敌模式，用来验收三张符卡与通关结算
```

一次 45 秒模拟约 3.6k 步、单步 0.05ms 左右，可用于回归验证弹幕密度（`peakBullets`）与阶段推进（`samples[].phase`）。

## 素材说明

- 主角 `assets/player/*.png`：`naixiaowa.exe` 运行时释放到 `%TEMP%\_MEI*/assets/laugh/f0001.webp … f0432.webp` 的动画帧中挑选并裁切（站立 / 挥手 / 抱头 / 躺倒），`shot.png` 是从头部裁出的圆形「小奶蛙」弹丸。
- 敌人 `assets/enemy/hamster*.png`：用户提供的摇头蛙图，抠掉白底、按需缩放与调色。
- 字体用系统自带中文字体（Noto Sans SC / 苹方 / 微软雅黑回退），无网络请求。

## 已知边界

- 单一场景，无限循环打同一个 Boss（Boss 血量随符卡阶段重置），没有关卡流程。
- 命中率按「子弹数」统计，三向散射时侧弹常打空，所以结算里的命中率偏低是正常的。
- 只做了键盘 + 指针，没有做移动端虚拟按键。
