// @anchor: script_intro
// 主脚本（协调层）：缓存共享 DOM，管理输入模式切换与全局键盘快捷键，把文本分发给各密码模块渲染，
// 并驱动智能识别、翻译跳转与词典加载；盲文 / 旗语 / 猪圈的输入控制器与词典加载器由各自独立脚本提供
/**
 * 古典密码互译器 — 主脚本（协调层）
 * 把文本分发给各密码模块（盲文 / A1Z26 / 敲击码 / 旗语 / 北约音标 / 摩斯 / 猪圈 / ASCII / 进制）渲染。
 * 输入模式切换（文本 / 盲文 / 旗语 / 猪圈）通过 app 注册表统一处理：各特殊输入控制器
 * （BrailleInput / SemaphoreInput / PigpenInput）在初始化时把自身输入区与键盘快捷键登记进来，
 * 主脚本只按当前模式分派，不再直接持有各自的输入状态。
 */

(function () {
    'use strict';

    // @anchor: script_dom_refs
    // 缓存页面共享 DOM 引用（文本输入控件、模式选择器、各密码输出容器、模块引用、智能识别与翻译跳转容器）
    const textInput = document.getElementById('textInput');
    const clearBtn = document.getElementById('clearBtn');
    const charCount = document.getElementById('charCount');
    const textInputSection = document.getElementById('textInputSection');
    const modeSelector = document.getElementById('modeSelector');

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
    // 运行时状态：仅保留当前输入模式；各特殊输入模式的点阵 / 双臂方向 / 累积文本由对应输入控制器自行维护
    var currentMode = 'text'; // 'text' | 'braille' | 'semaphore' | 'pigpen'
    // @anchor: script_state_end

    // @anchor: script_append_text
    // 通用文本追加：把单个字母写入文本框并派发 input 事件（不设长度上限）
    function appendToTextInput(char) {
        textInput.value += char;
        textInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // @anchor: script_append_text_end

    // @anchor: script_context
    // 应用上下文：各特殊输入控制器经它登记「模式输入区 + 进入回调」与「键盘快捷键」，并共享「写入文本框」入口
    const app = {
        appendToTextInput: appendToTextInput,
        modes: {},      // mode → { section, onEnter }
        shortcuts: {},  // mode → function(KeyboardEvent)
        registerMode: function (mode, section, onEnter) {
            app.modes[mode] = { section: section, onEnter: onEnter };
        },
        registerShortcut: function (mode, handler) {
            app.shortcuts[mode] = handler;
        }
    };
    // 文本模式（无特殊输入控件）由主脚本自行登记，仅用于输入区显隐
    app.registerMode('text', textInputSection, null);
    // @anchor: script_context_end

    // @anchor: script_mode_switch
    // 切换输入模式：高亮按钮、按注册表显隐各输入区、执行对应输入区的「进入」回调
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

        // 显示当前模式输入区、隐藏其余（各输入控制器在初始化时登记自己的输入区）
        Object.keys(app.modes).forEach(function (m) {
            var entry = app.modes[m];
            if (entry && entry.section) {
                entry.section.style.display = (m === mode) ? '' : 'none';
            }
        });

        // 切换模式时重置对应输入状态
        var active = app.modes[mode];
        if (active && typeof active.onEnter === 'function') {
            active.onEnter();
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

    // @anchor: script_keyboard_shortcuts
    // 键盘快捷键：按当前模式把空格 / 退格分派给对应输入控制器登记的快捷键处理器（见各 *-input.js）。
    // 采用「捕获阶段 + preventDefault」：既阻止浏览器把空格当作滚动 / 翻页的默认行为，又避免重复触发
    // 聚焦按钮的默认点击；只在事件目标是「真正可编辑的控件」时放行按键（只读的结果框不算，否则用户
    // 点过结果框后再按空格只会滚动页面而不触发快捷键）。
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

    function handleSpecialKeydown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (isEditableTarget(e.target)) return;
        var handler = app.shortcuts[currentMode];
        if (typeof handler === 'function') { handler(e); }
    }

    // 捕获阶段注册：早于其它监听与浏览器默认行为，确保空格不会滚动页面
    document.addEventListener('keydown', handleSpecialKeydown, true);
    // @anchor: script_keyboard_shortcuts_end

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
    // 半智能识别：把文本与已加载的词典交给 SmartDetectRender 渲染栏目；异常只记录日志，不影响其它卡片
    function updateSmartDetection(text) {
        if (typeof SmartDetectRender === 'undefined' || !smartDetectBody) { return; }
        try {
            SmartDetectRender.render(smartDetectBody, text, smartWordDict);
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
    // 词典加载：委托 WordDict 按「分层词表 → 整部词表 → 内置词种子」逐级回退；就绪后重算智能识别与翻译跳转条
    var smartWordDict = null;          // WordFinder 词典结构（分层数组或单档 Set）
    var smartWordDictSource = '';      // 'tiered' | 'yawl' | 'seed' | ''
    var smartWordDictFailed = false;   // 是否彻底不可用（连内置种子都缺失）

    function applySmartWordDict(dict, source) {
        smartWordDict = dict;
        smartWordDictSource = source || '';
        smartWordDictFailed = false;
        updateSmartDetection(textInput.value);   // 词典就绪后重算当前输入
        updateTranslateBar(textInput.value);
    }

    function loadSmartWordDict() {
        if (typeof WordDict === 'undefined' || !WordDict) { smartWordDictFailed = true; return; }
        WordDict.load({
            onReady: applySmartWordDict,
            onUnavailable: function () { smartWordDictFailed = true; }
        });
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
    // 初始化：登记三种特殊输入控制器、默认文本模式、按需加载词典，并延迟载入示例 "HELLO"
    if (typeof BrailleInput !== 'undefined' && BrailleInput) { BrailleInput.init(app); }
    if (typeof SemaphoreInput !== 'undefined' && SemaphoreInput) { SemaphoreInput.init(app); }
    if (typeof PigpenInput !== 'undefined' && PigpenInput) { PigpenInput.init(app); }

    // 默认显示文本输入模式
    switchMode('text');
    updateAllCiphers('');
    updateSmartDetection('');
    updateTranslateBar('');

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
