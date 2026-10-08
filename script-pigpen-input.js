// @anchor: script_pigpen_input_intro
// 猪圈字形输入控制器：按「九宫格（无点 / 加点）/ 叉形（无点 / 加点）」四组生成字形按钮，点击逐字累积；
// 支持空格、退格与整体写入文本框，并向主脚本登记「模式进入回调」与「键盘空格 / 退格快捷键」
const PigpenInput = (() => {
    'use strict';

    // @anchor: script_pigpen_input
    // 猪圈字形输入：四组字形按钮的生成与排版、点击追加、空格 / 退格 / 清除与整体写入文本框
    // 排版：九宫格按钮按 3×3 格位排列（与字形一一对应）；叉形按钮按开口方向（上 / 左 / 右 / 下）摆成十字
    // 键盘：猪圈模式下空格加空格、退格删末位（由主脚本按键分派到此控制器登记的回调）
    function init(app) {
        // --- DOM 引用 ---
        const section = document.getElementById('pigpenInputSection');
        const groups = document.getElementById('pigpenGlyphGroups');
        const outputTextbox = document.getElementById('pigpenOutputTextbox');
        const addBtn = document.getElementById('pigpenAddBtn');
        const spaceBtn = document.getElementById('pigpenSpaceBtn');
        const backspaceBtn = document.getElementById('pigpenBackspaceBtn');
        const clearTextBtn = document.getElementById('pigpenClearTextBtn');

        // --- 状态：累积字形文本 ---
        var accumulatedText = '';

        // 生成单个字形按钮（字形取自 PigpenCipher）
        function createGlyphButton(letter) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pigpen-glyph-btn';
            btn.setAttribute('data-letter', letter);
            btn.title = letter + '（' + PigpenCipher.describe(letter) + '）';
            btn.setAttribute('aria-label', '猪圈字形 ' + letter);

            var glyph = PigpenCipher.createGlyph(letter, 34);
            if (glyph) { btn.appendChild(glyph); }
            else { btn.textContent = '?'; }
            return btn;
        }

        // 叉形开口方向 → 3×3 网格中的 [行, 列]：上 / 左 / 右 / 下摆成十字，中心与四角留空
        var CROSS_SLOTS = { top: [1, 2], left: [2, 1], right: [2, 3], bottom: [3, 2] };

        // 生成四组字形按钮（分组、字形与摆位均取自 PigpenCipher 的映射数据，未收录字形不生成按钮）
        function buildButtons() {
            if (!groups) return;
            groups.innerHTML = '';
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

                    var btn = createGlyphButton(letter);

                    // 九宫格：按字母顺序（行优先）自然落成 3×3；叉形：按开口方向定位到十字格
                    if (def.layout === 'cross') {
                        var slot = CROSS_SLOTS[spec.pos];
                        if (slot) {
                            btn.style.gridRow = String(slot[0]);
                            btn.style.gridColumn = String(slot[1]);
                        }
                    }
                    btnRow.appendChild(btn);
                });

                groupEl.appendChild(btnRow);
                groups.appendChild(groupEl);
            });
        }

        function updateOutputTextbox() {
            if (outputTextbox) { outputTextbox.value = accumulatedText; }
            if (addBtn) { addBtn.disabled = (accumulatedText.length === 0); }
        }

        // 点击字形按钮 → 对应字母追加到翻译结果
        function handleGlyphClick(e) {
            var btn = (e.target && e.target.closest) ? e.target.closest('.pigpen-glyph-btn') : null;
            if (!btn) return;
            var letter = btn.getAttribute('data-letter');
            if (!letter) return;
            accumulatedText += letter;
            updateOutputTextbox();
        }

        // 追加空格（猪圈字形不含空格，单独提供）
        function addSpace() {
            accumulatedText += ' ';
            updateOutputTextbox();
        }

        // 退格：删除翻译结果末尾的一个字形
        function backspace() {
            if (!accumulatedText) return;
            accumulatedText = accumulatedText.slice(0, -1);
            updateOutputTextbox();
        }

        function clearText() {
            accumulatedText = '';
            updateOutputTextbox();
        }

        // 把猪圈翻译结果整体写入文本输入框
        function addToText() {
            if (!accumulatedText) return;
            app.appendToTextInput(accumulatedText);
            accumulatedText = '';
            updateOutputTextbox();
        }

        // --- 事件绑定 ---
        if (groups) { groups.addEventListener('click', handleGlyphClick); }
        if (addBtn) { addBtn.addEventListener('click', addToText); }
        if (spaceBtn) { spaceBtn.addEventListener('click', addSpace); }
        if (backspaceBtn) { backspaceBtn.addEventListener('click', backspace); }
        if (clearTextBtn) { clearTextBtn.addEventListener('click', clearText); }

        // --- 向主脚本登记模式与快捷键 ---
        app.registerMode('pigpen', section, clearText);
        app.registerShortcut('pigpen', function (e) {
            if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
                e.preventDefault();
                addSpace();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                backspace();
            }
        });

        buildButtons();
        updateOutputTextbox();
    }
    // @anchor: script_pigpen_input_end

    return { init: init };
})();

// Node 测试环境下导出（浏览器中 module 未定义，此块不生效）
if (typeof module !== 'undefined' && module.exports) { module.exports = PigpenInput; }
