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


<!-- @anchor: log_010 -->
# [本次] 成词/词组结果附「百度翻译」跳转按钮
- 新增 `modules/translate-link.js`（全局 `TranslateLink`，Node 带 `module` 导出）：`translate_link_url` 区块的 `buildUrl()` 拼装 `https://fanyi.baidu.com/mtpe-individual/transText?query=<文本>&lang=en2zh`（`encodeURIComponent` 编码）；`translate_link_detect` 区块的 `isWordPhrase(text, dict)` 优先用 `WordFinder.findWords()` 判定（`scoreRanges ≥ 2` 抑制短词噪声），词典缺失 / 为空时退回「仅字母、含 ≥ 3 字母词」的启发式；词典归一化兼容单档 Set 与分层数组 `[{tier,words}]`（`WeakMap` 缓存合并结果）；`translate_link_button` 区块的 `createButton()` / `attach()` 生成并挂载 `.translate-jump` 小按钮（新窗口 + `noopener noreferrer`）。
- 凯撒页：`caesar.js` 新增 `caesar_row_tools` 区块——命中词典词（`row.score > 0`）的移位结果行追加「🌐 翻译查看含义」按钮，query 为该移位后的文本；提示条文案补充引导；`caesar.html` 脚本区引入 `modules/translate-link.js`；`caesar.css` 新增 `caesar_css_translate` 区块（`.row-tools` / `.translate-jump`）。
- 主页：`index.html` 文本输入区新增 `html_translate_bar`（`#translateBar`）并在脚本区引入 `translate-link.js`；`script.js` 新增 `script_translate` 区块 `updateTranslateBar()`（当前输入成词/词组时显示跳转条、否则隐藏；只增删 `.translate-jump` 不重复累积），接入 `onInputChange` / `onClear` / `script_init`，并在 `loadSmartWordDict()` 两个成功分支中随词典就绪重算；`modules/smart-detect.js` 的 `renderItem()` 增加 `dict` 参数，识别结果成词/词组时在栏目标题栏（`.smart-item-action`）显示翻译按钮（栏内视图切换时同步刷新）；`style.css` 新增 `css_translate` 区块（`.translate-jump` / `.translate-bar` / `.smart-item-action`）。
- 自测：新增 `tmp/test-translate-link.js`（33 断言：URL 编码、分层 / 单档 / 无词典判定、按钮属性、识别栏目内按钮的有无、凯撒页 DOM 桩渲染出按钮且非命中行无按钮）；`tmp/test-integration.js` 扩至 25 断言（脚本串联纳入 `translate-link.js`，验证翻译条显示 / 隐藏 / 不重复累积、识别结果按钮的有无）；`tmp/check-syntax.js` 纳入 `translate-link.js`；全部通过。
- 文档：`PROJECT.md` 架构（跳转工具层与翻译跳转流）、决策（成词/词组一键查义）、约定（模块清单与加载顺序）、限制同步。
<!-- @anchor: log_010_end -->


<!-- @anchor: log_011 -->
# [本次] 新增摩斯 / 猪圈 / ASCII / 进制四类输出卡片，并加入猪圈字形按钮输入
- **数据层**：`cipher-data.js` 新增 `data_morse`（字符 → 点划表）与 `data_pigpen`（26 个字形描述：`grid` 行/列 + `x` 四区 pos + `dot` 加点标记；A–I 第一个九宫格、J–M 第一个交叉格、N–Z 为对应加点字形），并新增 `cipher_data_export` 区块（Node 导出守卫）。
- **新增模块**：`modules/morse.js`（`morse_table` / `morse_encode` / `morse_decode` / `morse_render`：点划结果行 + 逐字符 chips，词间以 `/` 分隔）；`modules/pigpen.js`（`pigpen_map`、`pigpen_geometry` 字形纯几何 + 中文描述、`pigpen_encode` / `pigpen_decode` 字形键 `g00` / `x2` / `g00d`、`pigpen_glyph_svg` 几何 → SVG、`pigpen_render` 字形 + 字母标签）；`modules/ascii.js`（十进制码值行 + 逐字符卡片）；`modules/numeral.js`（`numeral_rows`：字符行 + 二进制 8 位 / 八进制 3 位 / 十六进制 2 位左补零对齐；`encode(text, base)` / `decode(encoded, base)` 可指定进制）。
- **智能识别去重**：`modules/smart-detect.js` 的 `smart_detect_morse` 区块移除本地摩斯表，改为由 `MorseCipher.TABLE` 反查构建 `MORSE_TABLE`（点划表的唯一来源为数据层）。
- **主页**：`index.html` 增至九张输出卡片、新增 `html_pigpen_input` 输入区与第四个输入模式按钮（脚本区按序引入四个新模块）；`script.js` 新增 `script_pigpen_input` 区块（`buildPigpenButtons()` 按字形数据生成四组按钮、点击逐字追加、空格 / 退格 / 清除 / 添加到文本）与 `updatePigpenOutputTextbox()` / `clearPigpenAccumulatedText()`，`switchMode()` 支持 `pigpen`，渲染循环纳入四个新模块；`style.css` 新增 `css_morse_view` / `css_pigpen_view` / `css_ascii_view` / `css_numeral_view` / `css_pigpen_input` 区块与窄屏适配。
- **自测**：新增 `tmp/test-new-ciphers.js`（77 断言：摩斯编解码与表来源、猪圈对应关系 / 字形键 / 几何 / SVG、ASCII、进制对齐行）；`tmp/test-smart-detect.js` 头部改为先载入 `cipher-data.js` 与 `morse.js`（66 断言全绿）；`tmp/test-integration.js` 扩至 48 断言（新卡片渲染、26 个字形按钮含 SVG、模式切换、逐字输入 / 空格 / 退格 / 添加到文本）；新增 `tmp/preview-pigpen.js` 打印 26 个字形 ASCII 点阵供人工核对；`tmp/check-syntax.js` 纳入四个新模块——全部通过。
- **文档**：`PROJECT.md` 的定位 / 架构（九模块、数据层四类映射、猪圈输入流）/ 决策（摩斯表集中、猪圈几何化与取边画法、对应关系、输入设计、四卡片分工）/ 约定（模块清单与加载顺序）/ 限制同步。
<!-- @anchor: log_011_end -->


<!-- @anchor: log_012 -->
# [本次] 对照 temp-explain.txt 修复猪圈对应关系与字形渲染
- **对应关系（数据层 `cipher-data.js` 的 `data_pigpen`）**：A–I 无点九宫格（3×3 读序）；J–R 加点九宫格（同一格位、格心补一点）；S–Z 叉形 8 个扇形区（`pos` = top-left / middle-left / bottom-left / bottom-left-most / top-right / middle-right / bottom-right / bottom-right-most，无加点）；文件头注释同步。
- **字形渲染（`modules/pigpen.js` 的 `pigpen_geometry`）**：九宫格改「无外框取边」画法——只画该格位朝外的边并延伸至整个字形框（角格 2 条 = L 形、边格 3 条、中心 4 条），修正原先「每格 4 条边」导致 C 不成 L 形的问题；叉形改为该区域两侧的辐线（中心 → 正方形边界，共 8 区、左右各 4）；字形键由 `x` + 区号改为 `x-` + 区域名（如 `x-top-left`）。
- **输入层**：`script.js` 的 `buildPigpenButtons()` 按钮分组由四组（九宫格 / 交叉格 × 是否加点）改为三组（九宫格 A–I、加点九宫格 J–R、叉形 S–Z）；`index.html` 猪圈输入提示与卡片副标题、`style.css` 区块说明同步改为「九宫格 / 叉形」。
- **自测**：更新 `tmp/test-new-ciphers.js`（90 断言：A–I / J–R / S–Z 对应关系、字形键与往返、九宫格取边条数 2/3/4、叉形两条辐线）与 `tmp/preview-pigpen.js`（按三组打印字形点阵）；`tmp/check-syntax.js` 全绿。
- **文档**：`PROJECT.md` 的猪圈相关决策 / 约定 / 限制同步。
<!-- @anchor: log_012_end -->


<!-- @anchor: log_013 -->
# [本次] 修复猪圈九宫格字形的位置漂移（字形改为「即所在格位」绘制）
- **问题**：`modules/pigpen.js` 的九宫格字形此前把「朝外取边」的每条边都延伸至整个字形框（上/下边写满 0→S、左/右边写满 0→S），于是右上角 C 的拐角横跨整框、其它边也漂到框边，画出来的不是该格位本来的 L 形 / 边格 / 井字——即「边发生了位置漂移」。
- **修复（`pigpen_geometry`）**：字形改为「即该格位本身」——按 `S/3` 切出该格位的 `x0/x1/y0/y1`，只画朝外（远离画布中心）的边（角格 2 条 = L 形、边格 3 条、中心 4 条 = 井字），且每条边只落在本格位范围内，不再外延到整个字形框；加点仍取格心。叉形（每区两侧辐线，中心 → 边界）保持不变。
- **自测**：`tmp/test-new-ciphers.js` 改为核对「A 上/左边只占左上格、C 上/右边只占右上格、E 四条边都在中央格范围内」（94 断言全绿）；`tmp/preview-pigpen.js` 与新增 `tmp/dump-svg.js` 复核字形点阵与 SVG 坐标；`tmp/test-integration.js`（48）、`tmp/check-syntax.js` 均通过。
- **文档**：`PROJECT.md` 的猪圈渲染决策同步为「字形即格位本身、不外延整框」。
<!-- @anchor: log_013_end -->



<!-- @anchor: log_014 -->
# [本次] 猪圈九宫格字形加 180° 朝向校正（改为「朝内取边」）
- **问题**：上一步把九宫格字形改为「即所在格位」后外形已正确（角格 L 形 / 边格 / 中心井字），但取的是「朝外（远离画布中心）」的边，导致每个字形相对正确的猪圈字形整体**旋转了 180°**（如 C 被画成上边 + 右边，而标准应为下边 + 左边）。
- **修复（`modules/pigpen.js` 的 `pigpen_geometry`）**：九宫格改为「朝内取边」——只画**不属于网格外框**的边（上边当 `r>0`、下边当 `r<2`、左边当 `c>0`、右边当 `c<2` 才画），等价于把整套字形绕各自格心旋转 180°。外形类别不变（角格 2 条 L 形、边格 3 条、中心 4 条、加点在格心），但朝向与标准一致：A = 下边 + 右边、C = 下边 + 左边（L 形），J–R 同理。叉形（每区两侧辐线）朝向本就正确，保持不变。
- **自测**：`tmp/test-new-ciphers.js` 将 A / C 的几何断言改为核对「朝内取边」（A 只含下边 + 右边且不含外框上/左两边、C 只含下边 + 左边，均限于本格位）；`tmp/preview-pigpen.js` 复核点阵；`tmp/test-integration.js`、`tmp/check-syntax.js`、`tmp/check-css.js` 均通过。
- **文档**：`PROJECT.md` 的猪圈渲染决策改写为「即所在格位 + 朝内取边（180° 校正）」。
<!-- @anchor: log_014_end -->

<!-- @anchor: log_015 -->
# [本次] 修正猪圈叉形（X 形）映射：8 个 45° 扇形区 → 4 个 90° 区域
- **问题**：叉形沿用 `temp-explain.txt` 的早期方案（正方形左右各 4 个 45° 扇形区，左上 S / 左中 T / 左下 W / 最左下 X，右侧 U / V / Y / Z），与标准猪圈不符。正确形态是两条对角线把正方形切成 **4 个 90° 区域**：S 开口朝上（V 形）、T 开口朝左（> 形）、U 开口朝右（< 形）、V 开口朝下（^ 形），W / X / Y / Z 为对应区域**加点**的版本。
- **数据层（`cipher-data.js` 的 `data_pigpen`）**：第三组改为 `S` / `T` / `U` / `V` 四个区域（`pos` = top / left / right / bottom，无加点），并新增第四组 `W` / `X` / `Y` / `Z`（同区域 + `dot: true`）；文件头的猪圈说明与对应关系注释同步。
- **模块层（`modules/pigpen.js` 的 `pigpen_geometry`）**：`X_REGIONS` 由「8 个方向」改为「4 个区域」——每区记录该区的两个角点，字形只画「中心 → 该两角」的两条对角线段（**不画正方形外框**，故四个区域分别是 V / > / < / ^ 形）；加点改为落在区域中线上（自中心朝开口方向偏移 1/3 边长 ≈ 三角形重心），取代原先「无加点 + `spokeEnd()` 辐线」的做法，`spokeEnd()` 随之移除；字形键由 `x-` + 方向名变为 `x-` + 区域名，加点追加 `d`（如 `x-top`、`x-topd`）；`describe()` 的位置名改为「朝上开口 / 朝左开口 / 朝右开口 / 朝下开口」。
- **界面层**：猪圈输入按钮由三组改为四组（`script.js` 的 `buildPigpenButtons()`：九宫格 A–I / 加点九宫格 J–R / 叉形 S–V / 加点叉形 W–Z）；`index.html` 的猪圈输入区注释与提示文案、`style.css` 的猪圈输入区块说明同步更新。
- **自测**：`tmp/test-new-ciphers.js` 的叉形断言全部改写（`describe`、字形键、往返编解码、四区图形互不相同、加点位置），`tmp/preview-pigpen.js` 增加第四组点阵预览，`tmp/test-integration.js` 的按钮组数断言 3 → 4 并新增 S / Z 按钮提示校验；`tmp/dump-svg.js` 逐字形核对坐标（S = 中心→左上角 + 右上角、T = 中心→左上角 + 左下角、U / V 同理；W / X / Y / Z 的点分列四条中线上）。全部自测（105 + 50 + 66 + 33 + 23 断言）与 `check-syntax.js`、`check-css.js` 通过。
- **文档**：`PROJECT.md` 的架构（猪圈输入流、字形键说明）、关键决策（新增「叉形取中心 → 区域两角」、改写猪圈对应关系）与已知限制同步；`temp-explain.txt` 的叉形方案标注为已废弃，一切以 `cipher-data.js` 为准。
<!-- @anchor: log_015_end -->


<!-- @anchor: log_016 -->
# [本次] 调整猪圈输入按钮排版（九宫格 3×3、叉形按开口方向摆十字）
- **排版**：猪圈输入区四组字形按钮统一改用 3×3 网格（`.pigpen-glyph-buttons` 由 flex 换行改为 `display:grid`）——九宫格两组（A–I / J–R）的 9 个按钮按行优先自然落位，与字形格位一一对应；叉形两组（S–V / W–Z）的 4 个按钮由脚本按开口方向指定 `grid-row` / `grid-column`（上 = 行1 列2、左 = 行2 列1、右 = 行2 列3、下 = 行3 列2），摆成十字、中心与四角留空。
- **脚本（`script.js` 的 `script_pigpen_input`）**：抽出 `createPigpenGlyphButton()` 生成单个字形按钮；`groupDefs` 增加 `layout` 字段（grid / cross）；叉形组按 `spec.pos` 经 `PIGPEN_CROSS_SLOTS` 定位，其余逻辑（点击追加 / 空格 / 退格 / 添加到文本）不变。
- **样式（`style.css`）**：`css_pigpen_input` 的 `.pigpen-glyph-buttons` 改为 3×3 网格，新增 `.pigpen-layout-grid` / `.pigpen-layout-cross`；响应式补一条「网格无需 max-width」的覆盖；`index.html` 的猪圈输入提示文案与注释同步说明排版规则。
- **自测**：`tmp/test-integration.js` 新增 8 项排版断言（两组 grid 组、A–I / J–R 行优先落位、S/T/U/V 与 W/X 的十字格位）；全套断言（105 + 60 + 66 + 33 + 23）与 `check-syntax.js`、`check-css.js` 全绿。
- **文档**：`PROJECT.md` 的猪圈输入决策与输入流补充「按字形语义排版」说明。
<!-- @anchor: log_016_end -->


<!-- @anchor: log_017 -->
# [本次] 特殊输入键盘快捷键（空格添加 / 退格）与猪圈标志换钢笔
- **键盘快捷键（`script.js` 新增 `script_keyboard_shortcuts` 区块）**：在 `document` 上监听 `keydown`，按 `currentMode` 分派——盲文 / 旗语模式下按空格把当前选好的字母添加到文本；猪圈模式下空格追加空格、退格删除末位。事件目标为 `input` / `textarea` / `select` 或带 Ctrl / Meta / Alt 时不拦截；`preventDefault` 既避免空格滚动页面，也避免重复触发聚焦按钮的默认点击。盲文点阵的原地按键改为只处理回车，空格交给全局快捷键。
- **界面（`index.html`）**：三处猪圈标志由「猪头 🐷」改为「钢笔 🖋️」（模式按钮 / 输入区标题 / 输出卡片图标），取 pigpen 的 pen；盲文 / 旗语 / 猪圈提示文案补充键盘操作说明（空格添加、猪圈 Space / Backspace）。
- **自测（`tmp/test-integration.js`）**：DOM 桩新增 `document` 级事件监听支持；新增 14 项断言——document 级 keydown 已注册、猪圈空格 / 退格键、可键入控件不拦截、盲文点 1 后按空格添加 A 并清空点阵、旗语方向 4+5 后按空格添加 A 并清除选择、文本模式下空格无副作用。全套断言（105 + 74 + 66 + 33 + 23）与 `check-syntax.js`、`check-css.js` 全绿。
- **文档**：`PROJECT.md` 的架构（新增「特殊输入键盘流」）、关键决策与已知限制同步。
<!-- @anchor: log_017_end -->


<!-- @anchor: log_018 -->
# [本次] 进制转换区分「五位二进制（A1Z26）」与「七位二进制（ASCII）」
- **模块（`modules/smart-detect.js` 的 `smart_detect_baseconv` 区块）**：`buildBaseConversion()` 重写——二进制视图由单个笼统的「二进制」拆成两个：`五位二进制（A1Z26）`（各值左补零到 5 位，值 1–26 → 字母）与 `七位二进制（ASCII）`（各值左补零到 7 位，值 32–126 → 字符）；三进制（位数对齐）视图保留。新增 `decodedChars()` 助手，按「译出字符更多者优先（并列取五位）」决定两个二进制视图的先后，使默认展示更契合输入值域；无效 token 的 chips 保持 `?`（不再被左补零）。文件头与区块说明同步。
- **界面**：进制转换栏目内的视图按钮随之为「五位二进制（A1Z26） / 七位二进制（ASCII） / 三进制」（沿用既有并列小按钮切换机制，无新增样式）。
- **自测（`tmp/test-smart-detect.js`）**：更新进制转换相关断言（默认视图随值域切换、5 位 / 7 位补零宽度、三进制结果、栏内三个视图按钮及其切换），断言数增至 82；全套（105 + 74 + 82 + 33 + 23）与 `check-syntax.js`、`check-css.js` 全绿。
- **文档**：`PROJECT.md` 关键决策与已知限制同步。
<!-- @anchor: log_018_end -->

<!-- @anchor: log_019 -->
# [本次] 修复「五位 / 七位二进制」未渲染：二进制数字显式渲染 + 进制卡片补齐两行
- **问题定位**：上一轮把二进制按位宽拆成「五位二进制（A1Z26）」与「七位二进制（ASCII）」时，只改了智能识别「进制转换」栏目的内部视图，且结果行给的是**译出的字母**（二进制数字只在 chips 里）；主翻译区「进制」卡片则仍是笼统的「二进制 8 位」一行。两处都看不到二进制数字，用户侧表现为「五位 / 七位二进制没有渲染」，易被误判为「函数没调用 / 脚本没加载」。
- **智能识别栏目（`modules/smart-detect.js`）**：`buildBaseConversion` 的两个二进制视图改为「结果行 = 对齐后的二进制数字」（与三进制视图口径一致），译出的字母 / 字符改放新增的 `note` 附注（如「A1Z26 字母：HELLO」）；默认视图排序由「结果串译出字符数」改为按 `bin5Letters` / `bin7Chars` 统计（结果行已是数字，不能再据其推断）；`renderItem` 新增附注行 DOM（`.smart-item-note`）并在切换视图时同步，成词判定改为「优先结果行、其次附注」以保留翻译按钮。`style.css` 的 `css_smart_detect` 增附注行样式。
- **主翻译区进制卡片（`modules/numeral.js`）**：展示行由「二进制 8 位 / 八进制 3 位 / 十六进制 2 位」改为「五位二进制（A1Z26，字母 A=1…Z=26，非字母 `?`）/ 七位二进制（ASCII，可打印字符）/ 八进制 3 位 / 十六进制 2 位」，新增 `codeOf(ch, source)` 按行来源取值（`a1z26` 或 `ascii`），卡片说明文案与模块头注释同步。
- **自测**：`test-new-ciphers`（116）、`test-smart-detect`（90）、`test-integration`（86）全绿，并新增「进制转换栏内 3 个视图按钮 + 二进制结果行 + 附注行」与「进制卡片两行二进制」断言；`check-syntax` / `check-css` 通过；锚点索引重建（23 文件 366 锚点）。
- **文档**：`PROJECT.md` 的架构、关键决策与已知限制同步；顺带把 `smart-detect.js` 文件头多出的游离注释并入 intro 文档块。
<!-- @anchor: log_019_end -->


<!-- @anchor: log_020 -->
# [本次] 静态托管健壮性（词典三级回退 + 内置词种子 + 卡片隔离）与空格快捷键冲突修复
- **问题定位（需求 1：托管后部分计算 / 转译卡片加载不到）**：逐项体检（`tmp/audit-static.js`）确认本地引用、脚本顺序、大小写、重复 id、charset 均无问题，卡片不会「加载不到」；真正的失效点是唯一的外部依赖——词典：① `fetch` 用了 `cache: 'force-cache'`，托管更新词表后浏览器可能长期返回旧副本（表现为「新词表 / 新功能没加载」）；② 词表只有两级候选，且 caesar 页首选 2.6 MB 的 `yawl-all.txt`，移动网络或资源漏传时容易取不到而使「A1Z26 分段匹配」「翻译跳转判定」「凯撒词标记」整体失效；③ 卡片渲染未做异常隔离，单个模块抛错会中断整轮渲染，出现「部分卡片空白」。
- **词典三级回退 + 内置词种子**：新增 `modules/word-seed.js`（由 `tmp/build-word-seed.js` 从 `words-tiered.txt` 第 1 档生成，约 1400 个高频词含全部 2–3 字母短词，约 9 KB，敏感词不入种子）。`script.js` 的 `loadSmartWordDict()` 与 `caesar.js` 的 `loadWordDict()` 改为逐级尝试「分层词表 `words-tiered.txt` → 整部词表 `yawl-all.txt` → 内置种子」，并把「词数 < 100」视为无效响应（如 404 返回的 HTML 错误页）继续回退；caesar 页首选改为 152 KB 的分层词表，`yawl-all.txt` 降为备份。`index.html` / `caesar.html` 按序加载 `word-seed.js`。
- **缓存策略**：两页词表请求由 `force-cache` 改为 `no-cache`（带校验的重新请求），托管更新后即时生效。
- **卡片渲染隔离**：`script.js` 抽出 `renderCard(name, text)`，`updateAllCiphers()` 逐模块 try/catch，单卡片失败只显示占位并打印日志；`updateSmartDetection()` / `updateTranslateBar()` 同样包 try/catch。
- **问题定位与修复（需求 2：空格确认与浏览器「空格翻页」冲突）**：原监听里 `isTypingTarget()` 只判断标签名，焦点落在**只读结果框**（各特殊输入模式的结果框是 `readonly input`）时快捷键被跳过且没 `preventDefault`，浏览器于是把空格当翻页——即用户所见冲突。现改为捕获阶段监听（`document.addEventListener('keydown', handler, true)`）+ `isEditableTarget()`（只读 / 禁用控件与聚焦按钮不再放行），空格既确认字母又阻断滚动。
- **自测**：新增 `tmp/test-static-fallback.js`（19 项：fetch 全失败 → 内置种子仍支持 `85121215 → HELLO`、翻译条与凯撒词标记仍工作；分层词典 404 → 回退整部词表；`cache: no-cache`；捕获阶段注册；只读结果框按空格 / 退格生效且 `preventDefault`；可编辑框放行）；`tmp/audit-static.js` 升级为可复跑体检（引用 / 顺序 / 缓存 / Node API / 全局依赖 / 素材体积 / `.nojekyll` 提示）；`test-translate-link`（36）、`test-integration`（86）、`test-smart-detect`（90）、`test-new-ciphers`（116）、`test-tiered-words`（23）、`check-syntax`（17 文件）、`check-css` 全绿。
- **文档**：`PROJECT.md` 的架构（新增 `word-seed` 层、词典加载流改为三级回退、键盘流改为捕获阶段、新增卡片隔离流）、关键决策（三级回退 / no-cache / 内容校验 / 渲染隔离 / 捕获阶段）、规范约定（脚本顺序与词典请求约定）、已知限制（托管注意事项与降级行为）与启动方式（新增「静态托管（GitHub Pages）」一节）同步；锚点索引重建。
<!-- @anchor: log_020_end -->

<!-- @anchor: update_record_anchor -->
<!-- 追加区：后续新记录统一插入本锚点之前 -->
