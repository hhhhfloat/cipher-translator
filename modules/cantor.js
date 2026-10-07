// @anchor: cantor_intro
// 康托展开模块：1234 的 24 种排列从小到大对应字母 A–X，提供排列↔字母的双向映射
/**
 * 康托展开 (Cantor Expansion) 映射模块
 * "1234" 的全排列按字典序从小到大共 24 种，依次对应 A(0) … X(23)。
 *   1234→A, 1243→B, …, 4321→X
 * 作为纯映射工具供半智能识别使用（无独立输出卡片）。
 */
const CantorCipher = (() => {

    // @anchor: cantor_table
    // 生成 "1234" 的全排列并升序排序，建立 排列→字母 与 字母→排列 双向映射（A=0 … X=23）
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWX'; // 24 个字母 A–X

    const permutations = [];
    (function build(prefix, rest) {
        if (rest.length === 0) {
            permutations.push(prefix);
            return;
        }
        for (let i = 0; i < rest.length; i++) {
            build(prefix + rest[i], rest.slice(0, i) + rest.slice(i + 1));
        }
    })('', '1234');
    permutations.sort(); // 等长数字串的字典序即数值升序

    const permToLetterMap = {};
    permutations.forEach(function (perm, index) {
        permToLetterMap[perm] = LETTERS[index];
    });
    // @anchor: cantor_table_end

    // @anchor: cantor_convert
    // 排列 → 字母、字母 → 排列（无效输入分别返回 "?" 与空串）
    function permToLetter(perm) {
        return permToLetterMap[perm] || '?';
    }

    function letterToPerm(letter) {
        const index = LETTERS.indexOf(String(letter).toUpperCase());
        return index < 0 ? '' : permutations[index];
    }
    // @anchor: cantor_convert_end

    // @anchor: cantor_encode
    // 编码：以空格分隔的排列串 → 字母串
    function encode(text) {
        return String(text || '').trim().split(/\s+/).filter(Boolean)
            .map(permToLetter).join('');
    }
    // @anchor: cantor_encode_end

    // @anchor: cantor_decode
    // 解码：字母串 → 以空格分隔的排列串
    function decode(letters) {
        return String(letters || '').toUpperCase().split('').map(function (ch) {
            return letterToPerm(ch) || ch;
        }).join(' ');
    }
    // @anchor: cantor_decode_end

    return { encode, decode, permToLetter, letterToPerm, permutations };
})();

// Node 测试环境下导出（浏览器中 module 未定义，此块不生效）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CantorCipher;
}
