// @anchor: script_braille_input_intro
// 盲文点阵输入控制器：把 2×3 点阵状态换算为盲文 Unicode 与字母，支持点选切换、添加到文本；
// 通过 init(app) 绑定 DOM 事件，并向主脚本登记「模式进入回调」与「空格快捷键」
const BrailleInput = (() => {
    'use strict';

    // @anchor: script_braille_input
    // 盲文点阵输入：点阵状态换算 Unicode 与字母、点选切换、添加到文本与事件绑定
    // 键盘：盲文模式下按空格即可把当前字母添加到文本（由主脚本按键分派到此控制器登记的回调），回车在点阵内切换点位
    function init(app) {
        // --- DOM 引用 ---
        const section = document.getElementById('brailleInputSection');
        const dotInput = document.getElementById('brailleDotInput');
        const inputChar = document.getElementById('brailleInputChar');
        const inputLetter = document.getElementById('brailleInputLetter');
        const addBtn = document.getElementById('brailleAddBtn');
        const clearDotsBtn = document.getElementById('brailleClearDotsBtn');
        const clearTextBtn = document.getElementById('brailleClearTextBtn');
        const outputTextbox = document.getElementById('brailleOutputTextbox');
        const brailleModule = (typeof BrailleCipher !== 'undefined') ? BrailleCipher : null;

        // --- 状态：点阵与累积文本 ---
        var dotsState = [false, false, false, false, false, false];
        var accumulatedText = '';

        // 根据当前点阵状态计算盲文 Unicode 字符和对应字母
        function computeFromDots() {
            var cp = 0x2800;
            if (dotsState[0]) cp |= 0x01;
            if (dotsState[1]) cp |= 0x02;
            if (dotsState[2]) cp |= 0x04;
            if (dotsState[3]) cp |= 0x08;
            if (dotsState[4]) cp |= 0x10;
            if (dotsState[5]) cp |= 0x20;
            var brailleChar = String.fromCodePoint(cp);

            var letter = '';
            if (brailleModule && cp !== 0x2800) {
                letter = brailleModule.decode(brailleChar);
                if (letter === brailleChar || letter.length !== 1) { letter = ''; }
            }
            return { brailleChar: brailleChar, letter: letter };
        }

        function updateOutputTextbox() {
            if (outputTextbox) { outputTextbox.value = accumulatedText; }
        }

        function updateUI() {
            var dotEls = dotInput.querySelectorAll('.braille-input-dot');
            dotEls.forEach(function (el) {
                var idx = parseInt(el.getAttribute('data-index'), 10);
                if (dotsState[idx]) { el.classList.add('active'); }
                else { el.classList.remove('active'); }
            });

            var result = computeFromDots();
            inputChar.textContent = result.brailleChar;
            inputLetter.textContent = result.letter || '-';
            addBtn.disabled = !isValidLetter(result.letter);
        }

        function isValidLetter(letter) {
            return !!(letter && letter.length === 1 && /[A-Z]/.test(letter));
        }

        function toggleDot(index) {
            dotsState[index] = !dotsState[index];
            updateUI();
        }

        function clearDots() {
            for (var i = 0; i < 6; i++) { dotsState[i] = false; }
            updateUI();
        }

        function clearText() {
            accumulatedText = '';
            updateOutputTextbox();
        }

        function addToText() {
            var result = computeFromDots();
            if (isValidLetter(result.letter)) {
                app.appendToTextInput(result.letter);
                accumulatedText += result.letter;
                updateOutputTextbox();
                clearDots();
            }
        }

        // --- 事件绑定 ---
        if (dotInput) {
            dotInput.addEventListener('click', function (e) {
                var dot = e.target.closest('.braille-input-dot');
                if (!dot) return;
                var idx = parseInt(dot.getAttribute('data-index'), 10);
                if (!isNaN(idx) && idx >= 0 && idx <= 5) { toggleDot(idx); }
            });

            // 回车在点阵内切换点位；空格由主脚本统一分派到本控制器（把当前字母添加到文本）
            dotInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var dot = e.target.closest('.braille-input-dot');
                    if (dot) {
                        var idx = parseInt(dot.getAttribute('data-index'), 10);
                        if (!isNaN(idx) && idx >= 0 && idx <= 5) { toggleDot(idx); }
                    }
                }
            });
        }
        if (addBtn) { addBtn.addEventListener('click', addToText); }
        if (clearDotsBtn) { clearDotsBtn.addEventListener('click', clearDots); }
        if (clearTextBtn) { clearTextBtn.addEventListener('click', clearText); }

        // --- 向主脚本登记模式与快捷键 ---
        app.registerMode('braille', section, clearDots);
        app.registerShortcut('braille', function (e) {
            if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
                e.preventDefault();
                addToText();
            }
        });

        clearDots();
    }
    // @anchor: script_braille_input_end

    return { init: init };
})();

// Node 测试环境下导出（浏览器中 module 未定义，此块不生效）
if (typeof module !== 'undefined' && module.exports) { module.exports = BrailleInput; }
