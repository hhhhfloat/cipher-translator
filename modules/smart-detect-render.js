// @anchor: smart_detect_render_intro
// 半智能识别渲染：把 SmartDetect.detect 的候选渲染到面板（过滤可解码过半、自动择优、并列按钮切换栏目与视图）
/**
 * 半智能识别 (Smart Detect) 渲染 — 负责把候选结果渲染到 DOM
 *   - 先过滤掉「可解码 token 占比 ≤ 1/2」的候选，再自动选中「译出字母最多」的一项；
 *   - 多个候选以并列小按钮切换，栏目内部视图（如分段解、进制）同样以按钮切换；
 *   - 视图可另带一行附注 note（如进制转换的二进制视图附示译出的字母 / 字符）；
 *   - 结果成词/词组时在栏目标题右侧附百度翻译跳转按钮（复用 TranslateLink）。
 * 依赖：核心判定 SmartDetect.detect（浏览器全局 / Node require）、TranslateLink（可选）。
 */

const SmartDetectRender = (() => {
    'use strict';

    // 延迟取用核心判定（浏览器读全局 SmartDetect；Node 下按相对路径 require）
    function core() {
        if (typeof SmartDetect !== 'undefined' && SmartDetect) { return SmartDetect; }
        if (typeof require === 'function') {
            try { return require('./smart-detect.js'); } catch (e) { return null; }
        }
        return null;
    }

    function detectAll(text, dict) {
        const c = core();
        return (c && typeof c.detect === 'function') ? c.detect(text, dict) : [];
    }

    // @anchor: smart_detect_render
    // 渲染识别面板：过滤出「可解码过半」的候选，自动选中「译出字母最多」的一项；多候选以并列小按钮切换
    function primaryView(item) {
        return (item.views && item.views.length) ? item.views[0] : item;
    }

    // 统计栏目解码情况：total 为非分隔 chips 数、valid 为成功解码数、letters 为译出的字母数、coverage 为可解码占比
    function itemStats(item) {
        const view = primaryView(item);
        const chips = view.chips || [];
        let total = 0, valid = 0, letters = 0;
        chips.forEach(function (chip) {
            if (chip.from === '/' || chip.from === '|' || chip.from === '·') { return; }
            total++;
            if (chip.to && chip.to !== '?') { valid++; }
            if (chip.to && /^[A-Za-z]$/.test(chip.to)) { letters++; }
        });
        return { total: total, valid: valid, letters: letters, coverage: total ? valid / total : 0 };
    }

    function render(container, text, dict) {
        if (!container) return;
        container.innerHTML = '';

        // 只保留「可解码 token 占比 > 1/2」的候选
        const candidates = detectAll(text, dict).filter(function (item) {
            return itemStats(item).coverage > 0.5;
        });

        if (candidates.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'smart-placeholder';
            placeholder.textContent = String(text || '').trim()
                ? '当前输入不符合可识别的模式（支持数字 / 十六进制 + 空格，或摩斯点划 . -）'
                : '输入数字串、二进制、十六进制或摩斯点划（如 8 5 12 12 15 / 01000 00101 / .... . .-.. .-.. ---）将自动识别可能的编码';
            container.appendChild(placeholder);
            return;
        }

        // 自动选中「译出字母最多」的一项（并列取先出现者）
        let best = 0;
        let bestLetters = -1;
        candidates.forEach(function (item, index) {
            const letters = itemStats(item).letters;
            if (letters > bestLetters) { bestLetters = letters; best = index; }
        });

        const content = document.createElement('div');
        content.className = 'smart-content';

        // 多个候选 → 并列小按钮切换
        if (candidates.length > 1) {
            const tabs = document.createElement('div');
            tabs.className = 'smart-tabs';
            const buttons = [];
            candidates.forEach(function (item, index) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'smart-tab' + (index === best ? ' is-active' : '');
                btn.textContent = item.title;
                btn.setAttribute('aria-pressed', index === best ? 'true' : 'false');
                btn.addEventListener('click', function () {
                    buttons.forEach(function (other) {
                        other.classList.remove('is-active');
                        other.setAttribute('aria-pressed', 'false');
                    });
                    btn.classList.add('is-active');
                    btn.setAttribute('aria-pressed', 'true');
                    renderItem(content, item, dict);
                });
                buttons.push(btn);
                tabs.appendChild(btn);
            });
            container.appendChild(tabs);
        }

        container.appendChild(content);
        renderItem(content, candidates[best], dict);
    }
    // @anchor: smart_detect_render_end

    // @anchor: smart_detect_render_item
    // 渲染单个识别栏目：标题 + 视图（多于一个视图时以并列小按钮切换，如进制）+ 规则说明 + 结果行 + 附注 + 映射 chips
    function renderItem(container, item, dict) {
        container.innerHTML = '';

        const views = (item.views && item.views.length) ? item.views : [item];

        const head = document.createElement('div');
        head.className = 'smart-item-head';

        const title = document.createElement('span');
        title.className = 'smart-item-title';
        title.textContent = item.title;

        const tag = document.createElement('span');
        tag.className = 'smart-item-tag';

        // 识别结果成词/词组时，此处放一个百度翻译跳转按钮
        const action = document.createElement('span');
        action.className = 'smart-item-action';

        head.appendChild(title);
        head.appendChild(tag);
        head.appendChild(action);
        container.appendChild(head);

        // 栏内视图切换（仅当栏目定义多个视图，如进制转换）
        if (views.length > 1) {
            const viewTabs = document.createElement('div');
            viewTabs.className = 'smart-tabs smart-view-tabs';
            const viewBtns = [];
            views.forEach(function (view, index) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'smart-tab smart-tab-sm' + (index === 0 ? ' is-active' : '');
                btn.textContent = view.label || item.title;
                btn.addEventListener('click', function () {
                    viewBtns.forEach(function (other) { other.classList.remove('is-active'); });
                    btn.classList.add('is-active');
                    paint(view);
                });
                viewBtns.push(btn);
                viewTabs.appendChild(btn);
            });
            container.appendChild(viewTabs);
        }

        const result = document.createElement('div');
        result.className = 'smart-item-result' + (item.key === 'baseconv' ? ' smart-num' : '');

        // 附注行：结果行之外的补充信息（如进制转换的二进制视图附示译出的字母 / 字符）
        const note = document.createElement('div');
        note.className = 'smart-item-note smart-num';

        const chips = document.createElement('div');
        chips.className = 'smart-chips';

        // 附注形如「A1Z26 字母：HELLO」，取冒号后的译出文本
        function noteTextOf(view) {
            const noteText = view.note || '';
            const idx = noteText.indexOf('：');
            return idx === -1 ? noteText : noteText.slice(idx + 1);
        }

        // 取视图可用于「成词判定」的文本：优先结果行，其次附注里译出的字母 / 字符
        function phraseOf(view) {
            const candidates = [view.result, noteTextOf(view)];
            for (let i = 0; i < candidates.length; i++) {
                const s = candidates[i];
                if (typeof s === 'string' && s && s.indexOf('?') === -1) return s;
            }
            return '';
        }

        function paint(view) {
            tag.textContent = view.tag || '';
            result.textContent = view.result || '-';
            note.textContent = view.note || '';
            note.hidden = !view.note;
            chips.innerHTML = '';
            (view.chips || []).forEach(function (chip) {
                const chipEl = document.createElement('span');
                chipEl.className = 'smart-chip';

                const fromEl = document.createElement('span');
                fromEl.className = 'smart-chip-from';
                fromEl.textContent = chip.from;

                const arrowEl = document.createElement('span');
                arrowEl.className = 'smart-chip-arrow';
                arrowEl.textContent = '→';

                const toEl = document.createElement('span');
                toEl.className = 'smart-chip-to';
                toEl.textContent = chip.to;

                chipEl.appendChild(fromEl);
                chipEl.appendChild(arrowEl);
                chipEl.appendChild(toEl);
                chips.appendChild(chipEl);
            });

            // 识别结果成词/词组 → 显示「翻译」跳转按钮（词典不可用时按启发式判断）
            action.innerHTML = '';
            const decoded = phraseOf(view);
            if (typeof TranslateLink !== 'undefined' && TranslateLink && decoded
                && TranslateLink.isWordPhrase(decoded, dict)) {
                action.appendChild(TranslateLink.createButton(decoded, '🌐 翻译'));
            }
        }

        container.appendChild(result);
        container.appendChild(note);
        container.appendChild(chips);
        paint(views[0]);
    }
    // @anchor: smart_detect_render_item_end

    // @anchor: smart_detect_render_export
    // 暴露渲染接口，并保留 Node 自测用的 module 导出
    const api = { render: render };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    return api;
    // @anchor: smart_detect_render_export_end
})();
