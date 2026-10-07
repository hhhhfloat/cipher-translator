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


<!-- @anchor: log_005 -->
# [本次] 旗语只画双臂 & 凯撒页隐藏玩法「词典词标记」
- 旗语可视化精简：`modules/semaphore.js` 去掉圆形头部与身体竖线，只保留两条持旗手臂（双臂同发自画布中心的肩点），画布由 75×95 缩为 72×72；`style.css` 的 `css_semaphore_view` 同步收紧内边距。新增 `semaphore_export` 区块（Node 自测用 module 导出，对页面无副作用）。
- 新增 `modules/word-finder.js`（词典工具层，纯逻辑）：`parseDictionary()` 把词表解析为小写词集合，`findWords()` 在文本中按「最左最长」匹配出词及其字符区间，`scoreRanges()` 给出命中得分 `Σ(词长-2)`。
- 凯撒页隐藏玩法 `caesar_word_dict` / `caesar_find_words` / `caesar_word_toggle`：按需 `fetch('resources/yawl-all.txt')` 建词表；每个 ROT 结果命中可信词（得分 ≥ 2，可抑制短词噪声）时，命中的词用 `<mark>` 高亮 + 行置顶（得分降序、同分按移位量升序），并在结果区顶部提示条说明命中数；双击页面标题可开关该玩法，`file://` 下词典加载失败则静默降级。
- 页面与样式：`caesar.html` 结果区加入 `#wordHint` 提示条、脚本按序加载 `modules/word-finder.js`；`caesar.css` 的 `caesar_css_results` 新增 `.word-hint` / `.row-hasword` / `.word-hit` / `.word-chip` 样式。
- 自测：60 项断言全部通过（word-finder 逻辑 19 项、凯撒 DOM 渲染 25 项、旗语绘制与编解码回归 16 项，均使用真实词表/最小 DOM 桩）。
<!-- @anchor: log_005_end -->




<!-- @anchor: log_006 -->
# [本次] 移除 A1Z26 输入栏 & 智能识别扩展（十六进制 / 七位二进制 / 进制转换）
- 移除 A1Z26 专用输入模式：`index.html` 删除模式按钮与 `html_a1z26_input` 输入区；`script.js` 删除 A1Z26 DOM 引用、状态、输出文本框刷新、`script_a1z26_input` 区块与初始化调用，模式切换仅保留 文本 / 盲文 / 旗语 三种；`style.css` 删除 `css_a1z26_input` 区块与响应式中的相关选择器（A1Z26 输出卡片不受影响）。
- `modules/smart-detect.js` 扩展：`parseTokens()` 改为允许十六进制字符（要求含数字，避免纯英文词误判）；新增 `buildHex`（十六进制 → 1–26 字母）、`buildBinary7`（7 位二进制 → ASCII）；`detect()` 判定顺序为 摩斯 → 康托 → 七位二进制 → 五位二进制 → 十六进制（各自独占，二进制/十六进制追加进制转换）→（通用数字）A1Z26/ASCII + 敲击码/三进制追加 + 进制转换。
- 新增「进制转换」栏目 `buildBaseConversion()`：把各 token 按来源进制取值，转为二进制 / 三进制（左补零到统一宽度以对齐位数）与 7 位二进制（ASCII）三个视图；`renderItem()` 支持栏目内 `views` 二级下拉切换。
- 页面与样式：`index.html` 文本输入 `maxlength` 与计数改 120，提示文案与智能识别区说明更新；`script.js` 引入 `MAX_LEN` 常量并替换各处硬编码 60；`style.css` 新增 `.smart-item-result.smart-num`（等宽对齐）与 `.smart-view-select`。
- 自测：新建 `tmp/test-smart-detect.js`（最小 DOM 桩 + 真实 cantor/tapcode 模块），42 项断言全部通过（不误判、A1Z26/进制对齐、5/7 位二进制、十六进制、康托、ASCII 阈值、敲击码/三进制追加、摩斯、7 位 ASCII 视图、渲染下拉）。
- 文档：`PROJECT.md` 架构 / 决策 / 约定 / 限制同步（输入模式三种、栏目与进制转换、字符上限 120、十六进制与二进制判定约束）。
<!-- @anchor: log_006_end -->


<!-- @anchor: log_007 -->
# [本次] 智能识别：自动择优 + 并列按钮 + 无空格数字串词典分段
- `modules/smart-detect.js` 新增 `smart_detect_digitwords` 区块：`findDigitWords()` 对「无空格、纯数字、长度 > 5」的整串做 DFS 枚举所有 1–2 位 A1Z26 分段（剪枝：剩余每位至少 1 字母、超出词长上限即回溯，长度 ≤ 48、解数 ≤ 12），仅当整串恰能译成词典词时返回；`buildDigitWords()` 生成「A1Z26 分段匹配」栏目。
- `detect()` 增加 `dict` 参数与词典分段判定（仅单个 token 时尝试）；`render()`/`renderItem()` 重构：过滤「可解码 token 占比 ≤ 1/2」的候选、自动选中「译出字母最多」的一项，多候选与栏内进制视图一律改用并列小按钮（`.smart-tab`）切换，不再使用 `<select>` 下拉框。
- `script.js` 新增 `script_word_dict` 区块：`loadSmartWordDict()` 异步 `fetch` `resources/yawl-all.txt` → `WordFinder.parseDictionary`，词典就绪后重算当前输入；`updateSmartDetection()` 传入词典；`script_init` 调用加载。
- 页面与样式：`index.html` 引入 `modules/word-finder.js`，更新文本输入提示与智能识别区说明及占位示例；`style.css` 的 `css_smart_detect` 区块删除下拉框样式，新增 `.smart-tabs` / `.smart-tab` / `.smart-tab-sm` 并列按钮样式。
- 自测：`tmp/test-smart-detect.js` 扩至 55 项断言（新增分段匹配、过滤与自动择优、按钮切换用例）；新增 `tmp/test-integration.js`（最小 DOM 桩串联全部主页脚本，含 fetch 词典加载链路）8 项断言、`tmp/check-syntax.js` 全脚本语法校验，均通过。
- 文档：`PROJECT.md` 架构 / 决策 / 约定 / 限制同步（分段成词、择优 + 按钮、脚本加载顺序、词典双处引用等）。
<!-- @anchor: log_007_end -->


## [本次] 去除文本输入长度限制 & A1Z26 无空格数字串递归分段
- **去除长度限制**：`script.js` 删除 `MAX_LEN` 常量与所有截断逻辑，`appendToTextInput()` 不再限长、`onInputChange()`/`onClear()` 的字符计数改为「N 字符」；`index.html` 移除 `maxlength="120"` 与「0 / 120」，提示文案标注「输入不设长度上限」。
- **A1Z26 分段升级（同时优化）**：重写 `modules/smart-detect.js` 的 `smart_detect_digitwords` 区块——从头部取「能译成词典词」的子串并递归分解剩余部分；以词典最长词作为单个词的枚举长度上限；新增 `getDictCtx()`（按词典对象用 `WeakMap` 缓存最长词长度与词前缀集合）与 `wordBlocksAt()`（词前缀集合剪枝，抑制组合爆炸）；`buildDigitWords()` 改为以栏内多视图（`views`）呈现多解，段数少优先。例：`91419945` → `INSIDE`（单段）与 `IN SIDE`（`in` + `side`）。
- **词典加载**：`script.js` 的 `loadSmartWordDict()` 由 `parseDictionary(text, 3, 24)` 改为 `parseDictionary(text, 2, 64)`（保留 2 字母词并覆盖最长词）。
- **测试**：`tmp/test-smart-detect.js`（66 断言）与 `tmp/test-integration.js`（12 断言）全绿，含 `91419945` 多解、无法成词负例、全 1 长串不卡死、长输入不截断等用例。

## [本次] resources 优化：20k 词表按频率分层 + 分段检索短词限最高频档
- **新增素材**：临时脚本 `tmp/build-tiered-words.js` 读取 `resources/20k.txt`（20000 词，全为纯小写字母、无重复、无超长词），按使用频率每 5000 词一档写入新文件 `resources/words-tiered.txt`——以 `# tier=N a-b` 注释行标记 4 个档位，行序即频率序。`20k.txt` 原文件未被改动。
- **词典解析**：`modules/word-finder.js` 新增 `word_finder_parse_tiered` 区块 `parseTieredDictionary(text, minLen, maxLen)`：解析分层词表为 `[{tier, words:Set}]`；无 `# tier` 标记的纯词表整体视为单档（兼容 `yawl-all.txt` 回退）；已加入 `WordFinder` 导出。
- **分段检索升级**：`modules/smart-detect.js` 的 `smart_detect_digitwords` 区块重写——`dictTiers()` 归一化词典为分层数组；`getDictCtx()` 构建「可分词集合 + 词→最低档位 + 词前缀集合 + 最长词长度」；**长度 ≤ 3 的短词只取自第 1 档（前 5k 高频词）**（常量 `SHORT_WORD_MAX_LEN` / `SHORT_WORD_TIERS`），≥4 字母词不限档；`wordBlocksAt()` 按「档位靠前优先、同档取更长」枚举分段，`findDigitWords()` 结果按「段数少 → 来源档位和更小 → 字母更多」排序（仍以词典最长词为单词枚举上限、前缀集合剪枝 + 节点预算）。
- **加载链路**：`script.js` 的 `loadSmartWordDict()` 改为 `fetch resources/words-tiered.txt` → `parseTieredDictionary(…, 2, 64)`；失败回退 `yawl-all.txt`（单档），仍失败静默降级。
- **效果**：`91419945` 在分层词典下给出 `INSIDE` / `IN SIDE`，且不再出现 `yawl-all` 中的 `INS IDE` 噪声命中；高频短词（`in` 等）仍可参与分段。
- **测试**：新增 `tmp/test-tiered-words.js`（23 断言：分层解析计数、短词档位限制、档位 / 段数排序、单档 Set 回退）；`tmp/test-smart-detect.js`（66 断言，词典改用分层文件）、`tmp/test-integration.js`（14 断言，fetch 改为 URL 感知、校验实际请求 `words-tiered.txt` 且无 `INS IDE`）与 `tmp/check-syntax.js` 全部通过。
- **文档**：`PROJECT.md` 架构（resources 层、词典加载流）、决策（频率分层、短词限档、排序规则）、限制同步。


<!-- @anchor: update_record_anchor -->
<!-- 追加区：后续新记录统一插入本锚点之前 -->
