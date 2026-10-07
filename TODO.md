<!-- @anchor: todo_intro -->
<!-- cipher-translator 本轮任务待办：文本输入半智能识别扩展 + 敲击码预览精简 -->
# TODO — 智能识别扩展

<!-- @anchor: todo_step1 -->
## 步骤 1：扩展半智能识别规则模块
- [ ] `modules/smart-detect.js`：新增摩斯（点划）识别、五位二进制识别、三进制识别；更新 `detect()` 判定顺序与占位文案。
<!-- @anchor: todo_step1_end -->

<!-- @anchor: todo_step2 -->
## 步骤 2：精简敲击码输出
- [ ] `modules/tapcode.js`：移除 5×5 预览方格，改为紧凑逐字符映射。
- [ ] `style.css`：替换 `css_tapcode_view` 区块样式（删除方格样式，新增 chips 样式）。
<!-- @anchor: todo_step2_end -->

<!-- @anchor: todo_step3 -->
## 步骤 3：主页文案与接入
- [ ] `index.html`：更新输入提示与占位示例文案。
<!-- @anchor: todo_step3_end -->

<!-- @anchor: todo_step4 -->
## 步骤 4：自测与文档
- [ ] 用 Node 桩自测 `SmartDetect.detect()` 全部分支。
- [ ] 更新 `PROJECT.md` 与追加 `UPDATE.md`。
<!-- @anchor: todo_step4_end -->

<!-- @anchor: todo_end -->
<!-- 全部完成后删除本文件 -->
<!-- @anchor: todo_end_end -->
