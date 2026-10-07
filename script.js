// @anchor: script_intro
// 主脚本：协调输入事件，把文本分发给各密码模块渲染；并管理四种输入模式（文本 / 盲文 / 旗语 / 猪圈）的切换与解码
/**
 * 古典密码互译器 — 主脚本
 * 协调输入事件，把文本分发给各密码模块（盲文 / A1Z26 / 敲击码 / 旗语 / 北约音标 / 摩斯 / 猪圈 / ASCII / 进制）渲染。
 * 同时管理输入模式切换：文本输入 / 盲文点阵输入 / 旗语九宫格输入 / 猪圈字形输入。
 */


(function () {
    'use strict';


    // @anchor: script_dom_refs
    // 缓存页面 DOM 引用（输入控件、模式区、各密码输出容器、模块引用）
    // --- DOM 引用 ---
    const textInput = document.getElementById('textInput');
    const clearBtn = document.getElementById('clearBtn');
    const charCount = document.getElementById('charCount');

    // 四个输入区域
    const textInputSection = document.getElementById('textInputSection');
    const brailleInputSection = document.getElementById('brailleInputSection');
    const semaphoreInputSection = document.getElementById('semaphoreInputSection');
    const pigpenInputSection = document.getElementById('pigpenInputSection');

    // 模式选择器
    const modeSelector = document.getElementById('modeSelector');

    // 盲文点阵输入 DOM
    const brailleDotInput = document.getElementById('brailleDotInput');
    const brailleInputChar = document.getElementById('brailleInputChar');
    const brailleInputLetter = document.getElementById('brailleInputLetter');
    const brailleAddBtn = document.getElementById('brailleAddBtn');
    const brailleClearDotsBtn = document.getElementById('brailleClearDotsBtn');
    const brailleClearTextBtn = document.getElementById('brailleClearTextBtn');
    const brailleOutputTextbox = document.getElementById('brailleOutputTextbox');

    // 旗语九宫格输入 DOM
    const semaphoreGrid = document.getElementById('semaphoreGrid');
    const semaphoreCenterLetter = document.getElementById('semaphoreCenterLetter');
    const semaphoreAddBtn = document.getElementById('semaphoreAddBtn');
    const semaphoreClearBtn = document.getElementById('semaphoreClearBtn');
    const semaphoreClearTextBtn = document.getElementById('semaphoreClearTextBtn');
    const semaphoreOutputTextbox = document.getElementById('semaphoreOutputTextbox');

    // 猪圈字形输入 DOM
    const pigpenGlyphGroups = document.getElementById('pigpenGlyphGroups');
    const pigpenOutputTextbox = document.getElementById('pigpenOutputTextbox');
    const pigpenAddBtn = document.getElementById('pigpenAddBtn');
    const pigpenSpaceBtn = document.getElementById('pigpenSpaceBtn');
    const pigpenBackspaceBtn = document.getElementById('pigpenBackspaceBtn');
    const pigpenClearTextBtn = document.getElementById('pigpenClearTextBtn');

    // 密码模块输出容器
    const containers = {
        braille:   document.getElementById('braille-output'),
        a1z26:     document.getElementById('a1z26-output'),
        tapcode:   document.getElementById('tapcode-output'),
        semaphore: document.getElementById('semaphore-output'),
        nato:      document.getElementById('nato-output'),
        morse:     document.getElementById('morse-output'),
        pigpen:    document.getElementById('pigpen-output'),
        ascii:     document.getElementById('ascii-output'),
        numeral:   document.getElementById('numeral-output')
    };

    // 密码模块引用（由外部脚本定义）
    const modules = {
        braille:   typeof BrailleCipher !== 'undefined'   ? BrailleCipher   : null,
        a1z26:     typeof A1Z26Cipher !== 'undefined'     ? A1Z26Cipher     : null,
        tapcode:   typeof TapCodeCipher !== 'undefined'   ? TapCodeCipher   : null,
        semaphore: typeof SemaphoreCipher !== 'undefined' ? SemaphoreCipher : null,
        nato:      typeof NATOPhoneticCipher !== 'undefined' ? NATOPhoneticCipher : null,
        morse:     typeof MorseCipher !== 'undefined'     ? MorseCipher     : null,
        pigpen:    typeof PigpenCipher !== 'undefined'    ? PigpenCipher    : null,
        ascii:     typeof AsciiCipher !== 'undefined'     ? AsciiCipher     : null,
        numeral:   typeof NumeralCipher !== 'undefined'   ? NumeralCipher   : null
    };
    // 半智能识别结果容器
    const smartDetectBody = document.getElementById('smartDetectBody');



    // 翻译跳转条容器（当前输入成词/词组时显示）
    const translateBar = document.getElementById('translateBar');

    // @anchor: script_dom_refs_end

    // @anchor: script_state
    // 运行时状态：当前输入模式、盲文点阵与累积文本、旗语双臂选择、猪圈累积字形文本
    // --- 当前输入模式 ---
    var currentMode = 'text'; // 'text' | 'braille' | 'semaphore' | 'pigpen'

    // --- 盲文点阵输入状态 ---
    var brailleDotsState = [false, false, false, false, false, false];
    var brailleAccumulatedText = '';

    // --- 旗语九宫格输入状态 ---
    var semaphoreRightArm = null; // 右手方向索引 (0-7)，null 表示未选
    var semaphoreLeftArm = null;  // 左手方向索引 (0-7)，null 表示未选
    var semaphoreAccumulatedText = '';

    // --- 猪圈字形输入状态 ---
    var pigpenAccumulatedText = '';

    // @anchor: script_state_end

    // @anchor: script_mode_switch
    // 切换输入模式：高亮按钮、切换输入区显示、重置对应输入状态
    /**
     * 切换到指定输入模式
     * @param {string} mode - 'text' | 'braille' | 'semaphore' | 'pigpen'
     */
    function switchMode(mode) {
        if (currentMode === mode) return;
        currentMode = mode;

        // 更新模式按钮高亮
        var btns = modeSelector.querySelectorAll('.mode-btn');
        btns.forEach(function (btn) {
            if (btn.getAttribute('data-mode') === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 切换输入区域显示
        textInputSection.style.display = (mode === 'text') ? '' : 'none';
        brailleInputSection.style.display = (mode === 'braille') ? '' : 'none';
        semaphoreInputSection.style.display = (mode === 'semaphore') ? '' : 'none';
        if (pigpenInputSection) {
            pigpenInputSection.style.display = (mode === 'pigpen') ? '' : 'none';
        }

        // 切换模式时重置对应输入状态
        if (mode === 'braille') {
            clearBrailleDots();
        } else if (mode === 'semaphore') {
            clearSemaphoreSelection();
        } else if (mode === 'pigpen') {
            clearPigpenAccumulatedText();
        }
    }

    // 模式按钮点击事件
    if (modeSelector) {
        modeSelector.addEventListener('click', function (e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            var mode = btn.getAttribute('data-mode');
            if (mode) {
                switchMode(mode);
            }
        });
    }

    // @anchor: script_mode_switch_end

    // @anchor: script_output_textbox
    // 各输入模式「翻译结果」累积文本框的刷新与清空
    function updateBrailleOutputTextbox() {
        if (brailleOutputTextbox) {
            brailleOutputTextbox.value = brailleAccumulatedText;
        }
    }

    function clearBrailleAccumulatedText() {
        brailleAccumulatedText = '';
        updateBrailleOutputTextbox();
    }

    function updateSemaphoreOutputTextbox() {
        if (semaphoreOutputTextbox) {
            semaphoreOutputTextbox.value = semaphoreAccumulatedText;
        }
    }

    function clearSemaphoreAccumulatedText() {
        semaphoreAccumulatedText = '';
        updateSemaphoreOutputTextbox();
    }

    // 猪圈输入：刷新翻译结果文本框与「添加到文本」按钮可用态；清空累积字形文本
    function updatePigpenOutputTextbox() {
        if (pigpenOutputTextbox) {
            pigpenOutputTextbox.value = pigpenAccumulatedText;
        }
        if (pigpenAddBtn) {
            pigpenAddBtn.disabled = (pigpenAccumulatedText.length === 0);
        }
    }

    function clearPigpenAccumulatedText() {
        pigpenAccumulatedText = '';
        updatePigpenOutputTextbox();
    }

    // @anchor: script_output_textbox_end


    // @anchor: script_braille_input
    // 盲文点阵输入：点阵状态换算 Unicode 与字母、点选切换、添加到文本与事件绑定
    // 键盘：盲文模式下按空格即可把当前字母添加到文本（见 script_keyboard_shortcuts），回车在点阵内切换点位
    /**
     * 根据当前点阵状态计算盲文 Unicode 字符和对应字母
     * @returns {{ brailleChar: string, letter: string }}
     */
    function computeBrailleFromDots() {
        var cp = 0x2800;
        if (brailleDotsState[0]) cp |= 0x01;
        if (brailleDotsState[1]) cp |= 0x02;
        if (brailleDotsState[2]) cp |= 0x04;
        if (brailleDotsState[3]) cp |= 0x08;
        if (brailleDotsState[4]) cp |= 0x10;
        if (brailleDotsState[5]) cp |= 0x20;
        var brailleChar = String.fromCodePoint(cp);

        var letter = '';
        if (modules.braille && cp !== 0x2800) {
            letter = modules.braille.decode(brailleChar);
            if (letter === brailleChar || letter.length !== 1) {
                letter = '';
            }
        }

        return { brailleChar: brailleChar, letter: letter };
    }

    function updateBrailleInputUI() {
        var dotEls = brailleDotInput.querySelectorAll('.braille-input-dot');
        dotEls.forEach(function (el) {
            var idx = parseInt(el.getAttribute('data-index'), 10);
            if (brailleDotsState[idx]) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        var result = computeBrailleFromDots();
        brailleInputChar.textContent = result.brailleChar;
        brailleInputLetter.textContent = result.letter || '-';

        if (result.letter && result.letter.length === 1 && /[A-Z]/.test(result.letter)) {
            brailleAddBtn.disabled = false;
        } else {
            brailleAddBtn.disabled = true;
        }
    }

    function toggleBrailleDot(index) {
        brailleDotsState[index] = !brailleDotsState[index];
        updateBrailleInputUI();
    }

    function clearBrailleDots() {
        for (var i = 0; i < 6; i++) {
            brailleDotsState[i] = false;
        }
        updateBrailleInputUI();
    }

    function addBrailleToText() {
        var result = computeBrailleFromDots();
        if (result.letter && result.letter.length === 1 && /[A-Z]/.test(result.letter)) {
            appendToTextInput(result.letter);
            // 累积到输出文本框
            brailleAccumulatedText += result.letter;
            updateBrailleOutputTextbox();
            clearBrailleDots();
        }
    }

    // --- 盲文点阵事件绑定 ---
    if (brailleDotInput) {
        brailleDotInput.addEventListener('click', function (e) {
            var dot = e.target.closest('.braille-input-dot');
            if (!dot) return;
            var idx = parseInt(dot.getAttribute('data-index'), 10);
            if (!isNaN(idx) && idx >= 0 && idx <= 5) {
                toggleBrailleDot(idx);
            }
        });

        // 回车在点阵内切换点位；空格由全局快捷键统一处理（把当前字母添加到文本）
        brailleDotInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var dot = e.target.closest('.braille-input-dot');
                if (dot) {
                    var idx = parseInt(dot.getAttribute('data-index'), 10);
                    if (!isNaN(idx) && idx >= 0 && idx <= 5) {
                        toggleBrailleDot(idx);
                    }
                }
            }
        });
    }

    if (brailleAddBtn) {
        brailleAddBtn.addEventListener('click', addBrailleToText);
    }

    if (brailleClearDotsBtn) {
        brailleClearDotsBtn.addEventListener('click', clearBrailleDots);
    }

    if (brailleClearTextBtn) {
        brailleClearTextBtn.addEventListener('click', clearBrailleAccumulatedText);
    }

    // @anchor: script_braille_input_end

    // @anchor: script_semaphore_input
    // 旗语九宫格输入：按两次点击选择双臂方向、解码字母、添加到文本与事件绑定
    /**
     * 根据当前选择的双臂方向查找对应的字母
     * 利用 SemaphoreCipher.decode 进行反向查找
     * @returns {string} 字母，或空字符串
     */
    function computeSemaphoreLetter() {
        if (semaphoreRightArm === null || semaphoreLeftArm === null) {
            return '';
        }
        if (!modules.semaphore) {
            return '';
        }
        // 使用 decode 方法：传入 "rightDir,leftDir" 格式
        var encoded = semaphoreRightArm + ',' + semaphoreLeftArm;
        var decoded = modules.semaphore.decode(encoded);
        if (decoded && decoded.length === 1 && /[A-Z]/.test(decoded)) {
            return decoded;
        }
        return '';
    }

    /**
     * 更新旗语九宫格 UI
     */
    function updateSemaphoreUI() {
        // 清除所有格子的高亮
        var cells = semaphoreGrid.querySelectorAll('.semaphore-cell');
        cells.forEach(function (cell) {
            cell.classList.remove('right-arm', 'left-arm');
        });

        // 高亮右手选择
        if (semaphoreRightArm !== null) {
            var rightCell = semaphoreGrid.querySelector('.semaphore-cell[data-dir="' + semaphoreRightArm + '"]');
            if (rightCell) {
                rightCell.classList.add('right-arm');
            }
        }

        // 高亮左手选择
        if (semaphoreLeftArm !== null) {
            var leftCell = semaphoreGrid.querySelector('.semaphore-cell[data-dir="' + semaphoreLeftArm + '"]');
            if (leftCell) {
                leftCell.classList.add('left-arm');
            }
        }

        // 更新中心字母显示
        var letter = computeSemaphoreLetter();
        if (letter) {
            semaphoreCenterLetter.textContent = letter;
            semaphoreCenterLetter.classList.add('result-ready');
            semaphoreAddBtn.disabled = false;
        } else {
            semaphoreCenterLetter.textContent = '-';
            semaphoreCenterLetter.classList.remove('result-ready');
            semaphoreAddBtn.disabled = true;
        }
    }

    /**
     * 处理旗语格子点击
     * 第一次点击 → 右手（红），第二次点击 → 左手（蓝）
     * 如果点击已选中的格子则取消选择
     * @param {number} dir - 方向索引 0-7
     */
    function handleSemaphoreCellClick(dir) {
        // 如果点击的是右手已选中的格子 → 取消右手
        if (semaphoreRightArm === dir) {
            semaphoreRightArm = null;
            updateSemaphoreUI();
            return;
        }
        // 如果点击的是左手已选中的格子 → 取消左手
        if (semaphoreLeftArm === dir) {
            semaphoreLeftArm = null;
            updateSemaphoreUI();
            return;
        }

        // 如果右手未选 → 先选右手
        if (semaphoreRightArm === null) {
            semaphoreRightArm = dir;
            updateSemaphoreUI();
            return;
        }

        // 如果左手未选 → 选左手
        if (semaphoreLeftArm === null) {
            // 不能和右手选同一个方向
            if (dir === semaphoreRightArm) return;
            semaphoreLeftArm = dir;
            updateSemaphoreUI();
            return;
        }

        // 两手都已选 → 重新开始：新点击变为右手，清除左手
        semaphoreRightArm = dir;
        semaphoreLeftArm = null;
        updateSemaphoreUI();
    }

    /**
     * 清除旗语选择
     */
    function clearSemaphoreSelection() {
        semaphoreRightArm = null;
        semaphoreLeftArm = null;
        updateSemaphoreUI();
    }

    /**
     * 将当前旗语对应的字母添加到文本输入框
     */
    function addSemaphoreToText() {
        var letter = computeSemaphoreLetter();
        if (letter) {
            appendToTextInput(letter);
            // 累积到输出文本框
            semaphoreAccumulatedText += letter;
            updateSemaphoreOutputTextbox();
            clearSemaphoreSelection();
        }
    }

    // --- 旗语九宫格事件绑定 ---
    if (semaphoreGrid) {
        semaphoreGrid.addEventListener('click', function (e) {
            var cell = e.target.closest('.semaphore-cell');
            if (!cell) return;
            var dir = parseInt(cell.getAttribute('data-dir'), 10);
            if (!isNaN(dir) && dir >= 0 && dir <= 7) {
                handleSemaphoreCellClick(dir);
            }
        });
    }

    if (semaphoreAddBtn) {
        semaphoreAddBtn.addEventListener('click', addSemaphoreToText);
    }

    if (semaphoreClearBtn) {
        semaphoreClearBtn.addEventListener('click', clearSemaphoreSelection);
    }

    if (semaphoreClearTextBtn) {
        semaphoreClearTextBtn.addEventListener('click', clearSemaphoreAccumulatedText);
    }
    // @anchor: script_semaphore_input_end

    // @anchor: script_pigpen_input
    // 猪圈字形输入：按「九宫格（无点 / 加点）/ 叉形（无点 / 加点）」四组生成字形按钮，点击逐字追加；支持空格、退格与整体写入文本框
    // 排版：九宫格按钮按 3×3 格位排列（与字形一一对应）；叉形按钮按开口方向（上 / 左 / 右 / 下）摆成十字，使按钮位置直观对应字形
    // 生成单个字形按钮（字形取自 PigpenCipher）
    function createPigpenGlyphButton(letter) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pigpen-glyph-btn';
        btn.setAttribute('data-letter', letter);
        btn.title = letter + '（' + PigpenCipher.describe(letter) + '）';
        btn.setAttribute('aria-label', '猪圈字形 ' + letter);

        var glyph = PigpenCipher.createGlyph(letter, 34);
        if (glyph) {
            btn.appendChild(glyph);
        } else {
            btn.textContent = '?';
        }
        return btn;
    }

    // 叉形开口方向 → 3×3 网格中的 [行, 列]：上 / 左 / 右 / 下摆成十字，中心与四角留空
    var PIGPEN_CROSS_SLOTS = { top: [1, 2], left: [2, 1], right: [2, 3], bottom: [3, 2] };

    // 生成四组字形按钮（分组、字形与摆位均取自 PigpenCipher 的映射数据，未收录字形不生成按钮）
    function buildPigpenButtons() {
        if (!pigpenGlyphGroups) return;
        pigpenGlyphGroups.innerHTML = '';
        if (typeof PigpenCipher === 'undefined' || !PigpenCipher) return;

        var letters = PigpenCipher.LETTERS || [];
        var groupDefs = [
            { label: '九宫格 · A–I', shape: 'grid', dot: false, layout: 'grid' },
            { label: '加点九宫格 · J–R', shape: 'grid', dot: true, layout: 'grid' },
            { label: '叉形 · S–V', shape: 'x', dot: false, layout: 'cross' },
            { label: '加点叉形 · W–Z', shape: 'x', dot: true, layout: 'cross' }
        ];

        groupDefs.forEach(function (def) {
            var groupEl = document.createElement('div');
            groupEl.className = 'pigpen-glyph-group';

            var titleEl = document.createElement('span');
            titleEl.className = 'pigpen-group-title';
            titleEl.textContent = def.label;
            groupEl.appendChild(titleEl);

            var btnRow = document.createElement('div');
            btnRow.className = 'pigpen-glyph-buttons pigpen-layout-' + def.layout;

            letters.forEach(function (letter) {
                var spec = PigpenCipher.spec(letter);
                if (!spec || spec.shape !== def.shape || !!spec.dot !== def.dot) return;

                var btn = createPigpenGlyphButton(letter);

                // 九宫格：按字母顺序（行优先）自然落成 3×3；叉形：按开口方向定位到十字格
                if (def.layout === 'cross') {
                    var slot = PIGPEN_CROSS_SLOTS[spec.pos];
                    if (slot) {
                        btn.style.gridRow = String(slot[0]);
                        btn.style.gridColumn = String(slot[1]);
                    }
                }

                btnRow.appendChild(btn);
            });

            groupEl.appendChild(btnRow);
            pigpenGlyphGroups.appendChild(groupEl);
        });
    }

    // 点击字形按钮 → 对应字母追加到翻译结果
    function handlePigpenGlyphClick(e) {
        var btn = (e.target && e.target.closest) ? e.target.closest('.pigpen-glyph-btn') : null;
        if (!btn) return;
        var letter = btn.getAttribute('data-letter');
        if (!letter) return;
        pigpenAccumulatedText += letter;
        updatePigpenOutputTextbox();
    }

    // 追加空格（猪圈字形不含空格，单独提供）
    function addPigpenSpace() {
        pigpenAccumulatedText += ' ';
        updatePigpenOutputTextbox();
    }

    // 退格：删除翻译结果末尾的一个字形
    function pigpenBackspace() {
        if (!pigpenAccumulatedText) return;
        pigpenAccumulatedText = pigpenAccumulatedText.slice(0, -1);
        updatePigpenOutputTextbox();
    }

    // 把猪圈翻译结果整体写入文本输入框
    function addPigpenToText() {
        if (!pigpenAccumulatedText) return;
        appendToTextInput(pigpenAccumulatedText);
        pigpenAccumulatedText = '';
        updatePigpenOutputTextbox();
    }

    // --- 猪圈字形事件绑定 ---
    if (pigpenGlyphGroups) {
        pigpenGlyphGroups.addEventListener('click', handlePigpenGlyphClick);
    }
    if (pigpenAddBtn) {
        pigpenAddBtn.addEventListener('click', addPigpenToText);
    }
    if (pigpenSpaceBtn) {
        pigpenSpaceBtn.addEventListener('click', addPigpenSpace);
    }
    if (pigpenBackspaceBtn) {
        pigpenBackspaceBtn.addEventListener('click', pigpenBackspace);
    }
    if (pigpenClearTextBtn) {
        pigpenClearTextBtn.addEventListener('click', clearPigpenAccumulatedText);
    }

    // @anchor: script_pigpen_input_end

    // @anchor: script_keyboard_shortcuts
    // 键盘快捷键：盲文 / 旗语模式下按空格把当前字母添加到文本；猪圈模式下空格加空格、退格删末位。
    // 采用「捕获阶段 + preventDefault」：既阻止浏览器把空格当作滚动 / 翻页的默认行为，又避免重复触发
    // 聚焦按钮的默认点击；只在事件目标是「真正可编辑的控件」时放行按键（只读的结果框不算，
    // 否则用户点过结果框后再按空格只会滚动页面而不触发快捷键）。
    /**
     * 判断事件目标是否为可编辑控件（需要放行按键）
     * @param {Element} target
     * @returns {boolean}
     */
    function isEditableTarget(target) {
        if (!target || !target.tagName) return false;
        if (target.isContentEditable) return true;
        var tag = String(target.tagName).toUpperCase();
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
        if (target.disabled || target.readOnly) return false;
        // 非文本模式下，共享文本框已隐藏，不应再视为可编辑目标
        if (target === textInput && currentMode !== 'text') return false;
        return true;
    }

    /**
     * 全局键盘处理：把空格 / 退格映射为当前特殊输入模式的操作
     * @param {KeyboardEvent} e
     */
    function handleSpecialKeydown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (isEditableTarget(e.target)) return;
        var isSpace = e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space';

        if (currentMode === 'braille') {
            if (isSpace) {
                e.preventDefault();
                addBrailleToText();
            }
        } else if (currentMode === 'semaphore') {
            if (isSpace) {
                e.preventDefault();
                addSemaphoreToText();
            }
        } else if (currentMode === 'pigpen') {
            if (isSpace) {
                e.preventDefault();
                addPigpenSpace();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                pigpenBackspace();
            }
        }
    }

    // 捕获阶段注册：早于其它监听与浏览器默认行为，确保空格不会滚动页面
    document.addEventListener('keydown', handleSpecialKeydown, true);

    // @anchor: script_keyboard_shortcuts_end



    // @anchor: script_append_text
    // 通用文本追加：把单个字母写入文本框并派发 input 事件（不设长度上限）
    /**
     * 向文本输入框追加字符并触发更新
     * @param {string} char - 要追加的单个字母
     */
    function appendToTextInput(char) {
        textInput.value += char;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // @anchor: script_append_text_end

    // @anchor: script_render_ciphers
    // 把文本分发给各密码模块渲染到各自容器；逐模块隔离异常——任一模块出错只让自身卡片显示占位，
    // 不会中断后续模块，避免出现「部分卡片空白 / 无法加载」的连锁失败
    function renderCard(name, text) {
        var mod = modules[name];
        var container = containers[name];
        if (!mod || !container || typeof mod.render !== 'function') { return; }
        try {
            mod.render(container, text);
        } catch (err) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('卡片渲染失败：' + name, err);
            }
            container.innerHTML = '<p class="placeholder">该卡片渲染失败（' + name + '）</p>';
        }
    }

    function updateAllCiphers(text) {
        var trimmed = text.trim();
        Object.keys(modules).forEach(function (name) {
            renderCard(name, trimmed);
        });
    }

    // @anchor: script_render_ciphers_end

    // @anchor: script_smart_detect
    // 半智能识别：把文本与已加载的词典交给 SmartDetect 渲染栏目；异常只记录日志，不影响其它卡片
    function updateSmartDetection(text) {
        if (typeof SmartDetect === 'undefined' || !smartDetectBody) { return; }
        try {
            SmartDetect.render(smartDetectBody, text, smartWordDict);
        } catch (err) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('智能识别渲染失败', err);
            }
        }
    }

    // @anchor: script_smart_detect_end

    // @anchor: script_translate
    // 翻译跳转条：当前输入成词/词组时，在文本输入区显示跳转百度翻译的小按钮；判定或渲染异常时静默隐藏
    function updateTranslateBar(text) {
        if (!translateBar) { return; }
        try {
            var existing = translateBar.querySelector('.translate-jump');
            if (existing) { translateBar.removeChild(existing); }

            var trimmed = (text || '').trim();
            if (typeof TranslateLink === 'undefined' || !TranslateLink || !trimmed
                || !TranslateLink.isWordPhrase(trimmed, smartWordDict)) {
                translateBar.style.display = 'none';
                return;
            }

            translateBar.appendChild(TranslateLink.createButton(trimmed, '🌐 百度翻译'));
            translateBar.style.display = '';
        } catch (err) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('翻译跳转条渲染失败', err);
            }
            translateBar.style.display = 'none';
        }
    }

    // @anchor: script_translate_end


    // @anchor: script_word_dict
    // 按需加载词典（供「A1Z26 分段匹配」与翻译跳转的成词判定使用），按可靠性逐级回退：
    // 分层词典 resources/words-tiered.txt → 整部词表 resources/yawl-all.txt → 内置词种子 WordSeed（离线可用）；
    // 全部失败才静默降级（不显示分段栏目）。fetch 用 no-cache 重新校验——若沿用 force-cache，静态托管
    // 更新词表后浏览器可能长期返回旧副本，表现为「新词表 / 新功能没加载」。
    var smartWordDict = null;          // WordFinder 词典结构（分层数组或单档 Set）
    var smartWordDictSource = '';      // 'tiered' | 'yawl' | 'seed' | ''
    var smartWordDictFailed = false;   // 是否彻底不可用（连内置种子都缺失）
    var MIN_DICT_WORDS = 100;          // 词数过小视为无效内容（例如托管返回的 HTML 错误页）

    var smartDictSources = [
        { url: 'resources/words-tiered.txt', tiered: true,  source: 'tiered' },
        { url: 'resources/yawl-all.txt',     tiered: false, source: 'yawl' }
    ];

    // 统计词典词数（兼容单档 Set 与分层数组两种结构）
    function countDictWords(dict) {
        var n = 0;
        var tiers = Array.isArray(dict) ? dict : [dict];
        tiers.forEach(function (t) {
            var words = (t && t.words) ? t.words : t;
            if (words && typeof words.size === 'number') { n += words.size; }
        });
        return n;
    }

    function applySmartWordDict(dict, source) {
        smartWordDict = dict;
        smartWordDictSource = source;
        smartWordDictFailed = false;
        updateSmartDetection(textInput.value);   // 词典就绪后重算当前输入
        updateTranslateBar(textInput.value);
    }

    // 最后一档回退：内置高频词种子（约 9 KB），保证离线 / 资源缺失时分段与成词判定仍可用
    function applySeedWordDict() {
        if (typeof WordSeed !== 'undefined' && WordSeed && typeof WordSeed.tiers === 'function') {
            var tiers = WordSeed.tiers();
            if (countDictWords(tiers) >= MIN_DICT_WORDS) {
                applySmartWordDict(tiers, 'seed');
                return;
            }
        }
        smartWordDictFailed = true;
    }

    function fetchText(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (resp) {
            if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
            return resp.text();
        });
    }

    function loadSmartWordDict() {
        if (typeof fetch !== 'function' || typeof WordFinder === 'undefined') {
            applySeedWordDict();
            return;
        }

        var i = 0;
        function tryNext() {
            if (i >= smartDictSources.length) {
                applySeedWordDict();
                return;
            }
            var cand = smartDictSources[i++];
            fetchText(cand.url).then(function (text) {
                var dict = cand.tiered
                    ? WordFinder.parseTieredDictionary(text, 2, 64)
                    : [WordFinder.parseDictionary(text, 2, 64)];
                if (countDictWords(dict) < MIN_DICT_WORDS) { throw new Error('词典内容无效'); }
                applySmartWordDict(dict, cand.source);
            }).catch(function () {
                tryNext();
            });
        }
        tryNext();
    }

    // @anchor: script_word_dict_end


    // @anchor: script_input_events
    // 文本输入事件：更新字符计数与清空，触发全部密码刷新、半智能识别与翻译跳转条（不设长度上限）
    function onInputChange() {
        var value = textInput.value;
        charCount.textContent = value.length + ' 字符';
        updateAllCiphers(value);
        updateSmartDetection(value);
        updateTranslateBar(value);
    }

    function onClear() {
        textInput.value = '';
        charCount.textContent = '0 字符';
        updateAllCiphers('');
        updateSmartDetection('');
        updateTranslateBar('');
        textInput.focus();
    }

    // --- 绑定文本输入事件 ---
    textInput.addEventListener('input', onInputChange);
    clearBtn.addEventListener('click', onClear);

    // @anchor: script_input_events_end

    // @anchor: script_init
    // 初始化：默认文本模式、生成猪圈字形按钮、按需加载词典、刷新各输入区，并延迟载入示例 "HELLO"
    // 默认显示文本输入模式
    switchMode('text');
    updateAllCiphers('');
    updateSmartDetection('');
    updateTranslateBar('');
    updateBrailleInputUI();
    updateSemaphoreUI();
    buildPigpenButtons();
    updatePigpenOutputTextbox();

    // 加载词典（供智能识别的 A1Z26 分段匹配与翻译跳转判断）
    loadSmartWordDict();

    // 加载后自动展示示例
    setTimeout(function () {
        if (textInput.value === '') {
            textInput.value = 'HELLO';
            charCount.textContent = '5 字符';
            updateAllCiphers('HELLO');
            updateSmartDetection('HELLO');
            updateTranslateBar('HELLO');
        }
    }, 300);

    // @anchor: script_init_end

})();
