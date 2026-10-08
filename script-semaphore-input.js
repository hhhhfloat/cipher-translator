// @anchor: script_semaphore_input_intro
// 旗语九宫格输入控制器：按两次点击选择双臂方向并解码字母，支持添加到文本；
// 通过 init(app) 绑定 DOM 事件，并向主脚本登记「模式进入回调」与「空格快捷键」
const SemaphoreInput = (() => {
    'use strict';

    // @anchor: script_semaphore_input
    // 旗语九宫格输入：按两次点击选择双臂方向、解码字母、添加到文本与事件绑定
    // 键盘：旗语模式下按空格即可把当前字母添加到文本（由主脚本按键分派到此控制器登记的回调）
    function init(app) {
        // --- DOM 引用 ---
        const section = document.getElementById('semaphoreInputSection');
        const grid = document.getElementById('semaphoreGrid');
        const centerLetter = document.getElementById('semaphoreCenterLetter');
        const addBtn = document.getElementById('semaphoreAddBtn');
        const clearBtn = document.getElementById('semaphoreClearBtn');
        const clearTextBtn = document.getElementById('semaphoreClearTextBtn');
        const outputTextbox = document.getElementById('semaphoreOutputTextbox');
        const semaphoreModule = (typeof SemaphoreCipher !== 'undefined') ? SemaphoreCipher : null;

        // --- 状态：双臂方向与累积文本 ---
        var rightArm = null; // 右手方向索引 (0-7)，null 表示未选
        var leftArm = null;  // 左手方向索引 (0-7)，null 表示未选
        var accumulatedText = '';

        // 根据当前选择的双臂方向查找对应的字母（利用 SemaphoreCipher.decode 反向查找）
        function computeLetter() {
            if (rightArm === null || leftArm === null) { return ''; }
            if (!semaphoreModule) { return ''; }
            var encoded = rightArm + ',' + leftArm;
            var decoded = semaphoreModule.decode(encoded);
            if (decoded && decoded.length === 1 && /[A-Z]/.test(decoded)) { return decoded; }
            return '';
        }

        function updateOutputTextbox() {
            if (outputTextbox) { outputTextbox.value = accumulatedText; }
        }

        // 更新九宫格 UI：高亮已选双臂并刷新中心字母
        function updateUI() {
            var cells = grid.querySelectorAll('.semaphore-cell');
            cells.forEach(function (cell) {
                cell.classList.remove('right-arm', 'left-arm');
            });

            if (rightArm !== null) {
                var rightCell = grid.querySelector('.semaphore-cell[data-dir="' + rightArm + '"]');
                if (rightCell) { rightCell.classList.add('right-arm'); }
            }
            if (leftArm !== null) {
                var leftCell = grid.querySelector('.semaphore-cell[data-dir="' + leftArm + '"]');
                if (leftCell) { leftCell.classList.add('left-arm'); }
            }

            var letter = computeLetter();
            if (letter) {
                centerLetter.textContent = letter;
                centerLetter.classList.add('result-ready');
                addBtn.disabled = false;
            } else {
                centerLetter.textContent = '-';
                centerLetter.classList.remove('result-ready');
                addBtn.disabled = true;
            }
        }

        // 第一次点击 → 右手（红），第二次点击 → 左手（蓝）；点击已选中的格子则取消
        function handleCellClick(dir) {
            if (rightArm === dir) { rightArm = null; updateUI(); return; }
            if (leftArm === dir) { leftArm = null; updateUI(); return; }
            if (rightArm === null) { rightArm = dir; updateUI(); return; }
            if (leftArm === null) {
                if (dir === rightArm) return;
                leftArm = dir;
                updateUI();
                return;
            }
            // 两手都已选 → 重新开始：新点击变为右手，清除左手
            rightArm = dir;
            leftArm = null;
            updateUI();
        }

        function clearSelection() {
            rightArm = null;
            leftArm = null;
            updateUI();
        }

        function clearText() {
            accumulatedText = '';
            updateOutputTextbox();
        }

        function addToText() {
            var letter = computeLetter();
            if (letter) {
                app.appendToTextInput(letter);
                accumulatedText += letter;
                updateOutputTextbox();
                clearSelection();
            }
        }

        // --- 事件绑定 ---
        if (grid) {
            grid.addEventListener('click', function (e) {
                var cell = e.target.closest('.semaphore-cell');
                if (!cell) return;
                var dir = parseInt(cell.getAttribute('data-dir'), 10);
                if (!isNaN(dir) && dir >= 0 && dir <= 7) { handleCellClick(dir); }
            });
        }
        if (addBtn) { addBtn.addEventListener('click', addToText); }
        if (clearBtn) { clearBtn.addEventListener('click', clearSelection); }
        if (clearTextBtn) { clearTextBtn.addEventListener('click', clearText); }

        // --- 向主脚本登记模式与快捷键 ---
        app.registerMode('semaphore', section, clearSelection);
        app.registerShortcut('semaphore', function (e) {
            if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
                e.preventDefault();
                addToText();
            }
        });

        updateUI();
    }
    // @anchor: script_semaphore_input_end

    return { init: init };
})();

// Node 测试环境下导出（浏览器中 module 未定义，此块不生效）
if (typeof module !== 'undefined' && module.exports) { module.exports = SemaphoreInput; }
