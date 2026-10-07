<!-- @anchor: cipher_update_intro -->
<!-- cipher-translator 更新记录：仅追加，不修改历史条目 -->
# cipher-translator — 更新记录

<!-- @anchor: log_001 -->
# [初始] 古典密码互译器
- 五种密码输出：盲文、A1Z26、敲击码（Polybius 5×5）、旗语（Canvas 人物）、北约音标。
- 四种输入模式：文本输入、盲文 2×3 点阵输入、A1Z26 数字解码输入、旗语九宫格输入。
- 数据集中：`cipher-data.js` 存放盲文点阵与旗语方向对映射。
- 模块化：`modules/` 下每个密码一个 IIFE 模块，统一 `{ encode, decode, render }` 接口。
- 交互：60 字符上限、实时字符计数、添加到文本、示例自动载入 "HELLO"、响应式布局。
<!-- @anchor: log_001_end -->

<!-- @anchor: log_002 -->
# [本次] 纳入标准项目管理模式并并入凯撒移位
- 规范化：为全部源文件补齐 `<页面/文件>_intro` 头锚点，功能块统一改用 `模块_功能` / `_end` 成对锚点（index.html、style.css、script.js、cipher-data.js、modules/*.js）。
- 文档：`PROJECT.md` 按标准骨架（定位 / 架构 / 关键决策 / 规范约定 / 已知限制 / 启动方式）重写；新增本 `UPDATE.md` 追加式更新记录。
- 合并：将原独立项目 `caesar-shift` 以同级三件套 `caesar.html` / `caesar.css` / `caesar.js` 并入本目录（不使用上级目录引用），主页与凯撒页双向导航链接已更新为同目录相对路径。
<!-- @anchor: log_002_end -->

<!-- @anchor: log_003 -->
# [本次] 文本输入块半智能数字识别
- 新增 `modules/cantor.js`：`1234` 的 24 种排列升序 ↔ `A`–`X`（康托展开）。
- 新增 `modules/smart-detect.js`：启发式判定数字型输入——A1Z26（1–26）/ 敲击码（两位合法数位，追加）/ ASCII（`≥65` 占比超 2/3，替代 A1Z26）/ 康托展开（1234 排列，独占）；结果多于一项时渲染为下拉选项框切换的栏目。
- 接入：文本输入块内新增「智能识别」面板（`#smartDetectBody`），`script.js` 于输入/清空时调用 `updateSmartDetection()`；`index.html` 按序加载 cantor 与 smart-detect。
- 样式：`style.css` 新增 `css_smart_detect` 区块（识别面板、下拉框、结果与 chips）。
- 文档：`PROJECT.md` 补充架构（cantor/smart-detect）、识别决策、约定与限制；`tapcode.js` 增加 Node 测试导出守卫。
<!-- @anchor: log_003_end -->


<!-- @anchor: log_004 -->
# [本次] 识别扩展（摩斯 / 五位二进制 / 三进制）与敲击码预览精简
- 智能识别新增三种形态：摩斯点划（`.` `-`，空格分字母、`/` 分单词）、五位二进制（5 位 0/1 → 十进制 1–26 → 字母）、三进制（0–2 → 十进制 1–26 → 字母）；摩斯与五位二进制、康托展开同为独占形态，「数字 + 空格」下的敲击码与三进制为追加多解。
- `modules/smart-detect.js`：新增 `smart_detect_morse` 区块与 `buildMorse` / `buildBinary` / `buildTernary`；`detect()` 判定顺序调整为 摩斯 → 康托展开 → 五位二进制 → A1Z26/ASCII → 追加敲击码 / 三进制；占位文案同步支持点划提示。
- 敲击码输出卡片去除 5×5 方格预览，改为一行紧凑的「字母 → 行,列」chips（最多 40 字符）；`modules/tapcode.js` 的 `render()` 与 `style.css` 的 `css_tapcode_view` 同步精简。
- 主页文案：`index.html` 文本输入提示与占位示例补充摩斯 / 二进制 / 三进制说明。
- 自测：32 项分支用例（含摩斯、二进制、三进制、回归项与渲染精简）全部通过。
<!-- @anchor: log_004_end -->


<!-- @anchor: update_record_anchor -->
<!-- 追加区：后续新记录统一插入本锚点之前 -->
