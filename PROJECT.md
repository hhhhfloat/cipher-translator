<!-- @anchor: project_md_intro -->
<!-- 项目说明：定位、架构、关键决策、约定与限制 -->
# PROJECT - 古典密码互译器

<!-- @anchor: proj_overview -->
## 项目定位
纯前端零依赖的古典密码学习工具：输入英文文本即可实时看到盲文、A1Z26、敲击码、旗语、北约音标五种编码结果，并额外支持从这几种编码反向输入还原字母；附带凯撒移位页面展示 ROT1~ROT25 全部移位。面向密码学入门演示与教学，双击 `index.html` 即可使用，无需服务器、构建或网络。
<!-- @anchor: proj_overview_end -->

<!-- @anchor: proj_arch -->
## 整体架构
- `index.html`：主页结构层，无内联样式与逻辑。包含头部导航、四种输入模式区（文本 / 盲文点阵 / A1Z26 数字 / 旗语九宫格）与五张密码输出卡片。
- `style.css`：主页表现层，按区块组织：变量与重置、模式选择器、四类专用输入区、五类输出卡片、响应式适配。
- `cipher-data.js`：数据层，`CipherData` 集中存放盲文点阵与旗语方向对两类映射，改数据即改规则。
- `modules/*.js`：算法层，每个密码一个 IIFE 模块（braille / a1z26 / tapcode / semaphore / nato-phonetic）。
- `script.js`：协调层，缓存 DOM、管理模式切换与四种输入状态，把文本分发给各模块渲染。
- `caesar.html` / `caesar.css` / `caesar.js`：凯撒移位页面（原独立项目 `caesar-shift` 并入），与主页同目录，展示 ROT1~ROT25 全部移位，与主页双向导航。

### 数据流
文本输入（或盲文/A1Z26/旗语解码得到字母并追加到文本框）→ `input` 事件 → `updateAllCiphers()` → 分别调用五模块的 `render()` → 写入各自输出容器。

### 模块接口
每个密码模块返回 `{ encode, decode, render }`：`encode(text)` 编码字符串、`decode(encoded)` 解码字符串、`render(container, text)` 在容器内渲染可视化（盲文模块额外提供 `getDots`，旗语模块额外提供 `toMask` 与 `reverseMap`）。
- `modules/cantor.js`：映射工具层，把 `1234` 的 24 种排列按升序映射到 `A`–`X`（康托展开），供智能识别调用。
- `modules/smart-detect.js`：启发式识别层，分析数字型输入（A1Z26 / 敲击码 / ASCII / 康托展开）并在文本输入块内渲染可切换栏目。


- 智能识别流：文本 → `updateSmartDetection()` → `SmartDetect.detect()` 判定 → `render()` 在 `#smartDetectBody` 渲染栏目（多于一项时下拉切换）。

<!-- @anchor: proj_arch_end -->

<!-- @anchor: proj_decisions -->
## 关键决策
- **数据与逻辑分离**：盲文/旗语的字母映射全部集中在 `cipher-data.js`，模块只负责算法与渲染；新增或修改映射无需触碰逻辑代码。
- **统一模块契约**：五个模块都暴露 `{ encode, decode, render }`，`script.js` 用统一的 `modules` 表按名取用，缺失模块以 `null` 兜底，加载顺序不影响健壮性。
- **旗语用掩码查表**：把一对方向索引转为 8-bit 掩码做逆向查找，天然忽略双手顺序；九宫格输入只要求点选两个方向即可定位字母。
- **盲文输入直接驱动解码**：点阵输入按 `0x2800 + 位` 合成 Unicode 字符，复用 `decode()` 反查字母，避免维护第二张映射表。
- **输入与输出同源**：特殊输入模式把还原出的字母追加进同一个文本框并派发 `input` 事件，复用了唯一的渲染入口，不额外维护渲染分支。
- **凯撒移位并列成页而非第六张卡片**：25 行结果表体积较大，做成同级页面 `caesar.html`（相对链接 `caesar.html` / `index.html`），避免主页面卡片区被撑长，也避免跨目录引用。
- **数字型输入的启发式识别**：文本输入块内嵌「智能识别」面板，仅对「数字 + 空格」输入生效——默认给 A1Z26；全部为两位合法数位时追加敲击码；`≥65` 的数字占比超过 2/3 时改用 ASCII 码（此时不显示 A1Z26）；全部为 `1234` 的排列时独占给出康托展开。结果多于一项即渲染为下拉选项框切换，便于后续扩充栏目。
- **识别规则与渲染解耦**：`SmartDetect.detect()` 只做纯判定并返回结果对象数组，`SmartDetect.render()` 负责构建下拉框与栏目 DOM；新增识别规则只需扩展 `detect()`。

<!-- @anchor: proj_decisions_end -->

<!-- @anchor: proj_conventions -->
## 规范约定
- 文件命名固定：主页三件套 `index.html` / `style.css` / `script.js` + 数据 `cipher-data.js` + `modules/` 下每密码一文件；凯撒页面为同级三件套 `caesar.html` / `caesar.css` / `caesar.js`。
- 锚点命名：`模块_功能`（如 `braille_encode`、`script_mode_switch`、`caesar_shift_char`），每个文件首个锚点为 `<页面/文件>_intro`（如主页 `index_intro`、脚本 `script_intro`、凯撒页 `caesar_md_intro` / `caesar_script_intro`）；功能块用 `xxx` / `xxx_end` 成对包裹，锚点行下一行写职责注释。
- 密码模块一律用 IIFE 包裹并返回 `{ encode, decode, render }`，不向全局泄露内部函数。
- 所有渲染先 `container.innerHTML = ''` 再重建，空输入统一显示 `.placeholder` 占位。
- 页面间一律使用同目录相对链接（不使用上级目录跳转），保持零构建、双击可用的约束。
- 字符上限 60，超出即截断；输入框与计数提示保持同步。
- 用户可见文案中空格用 `␣`、旗语空格用 `·` 表示，保持各卡片视觉一致。
- `modules/` 除五个密码模块外，另含映射工具 `cantor.js` 与启发式识别 `smart-detect.js`；后者为纯判定 + 渲染，不接入五卡片渲染循环，由 `script.js` 的 `updateSmartDetection()` 单独驱动。

<!-- @anchor: proj_conventions_end -->

<!-- @anchor: proj_limits -->
## 已知限制与坑
- 仅处理英文 A-Z，不支持中文或其它语言；非字母字符在各密码中原样保留。
- 全局 60 字符上限，且特殊输入的累积文本框只增不减（清空需用对应「清除翻译结果」按钮）。
- 敲击码采用 5×5 Polybius 方格，I/J 合并，解码时 I/J 一律返回 `I/J`，无法区分。
- 旗语方向数据为信号员自身视角的「原形态」，不做镜像翻转；若调整需同步 `cipher-data.js` 与模块方向角度常量。
- 盲文为标准 6 点盲文，非 Grade 2 缩写盲文；数字、标点未建映射。
- 视觉裁剪：敲击码详细方格最多显示前 10 个字符、旗语人物最多 16 个，超出部分以 `…(+N个字符)` 省略。
- 半智能识别仅针对「数字 + 空格」输入；数字串本身有歧义（如 `12` 既是 A1Z26 的 L 又是敲击码 1,2 的 B），故可能同时给出多解，需人工判断。
- 康托展开当前固定为 `1234` 的 24 种排列，映射字母仅 `A`–`X`，不覆盖其它数字集合。

<!-- @anchor: proj_limits_end -->

<!-- @anchor: proj_start -->
## 启动方式
无需依赖与构建：浏览器直接打开 `cipher-translator/index.html`；凯撒移位页面为同目录下的 `cipher-translator/caesar.html`，也可从主页头部「🔄 凯撒移位」按钮进入。
<!-- @anchor: proj_start_end -->
