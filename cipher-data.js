// @anchor: cipher_data_intro
// 密码映射数据源：集中管理盲文点阵、旗语方向对、摩斯表与猪圈字形映射，供各密码模块引用，改数据不改逻辑
/**
 * 密码映射数据
 * 集中管理盲文、旗语、摩斯与猪圈的字母映射关系，方便直接修改。
 *
 * 盲文 (Braille): 字母 → 6点点阵 [dot1, dot2, dot3, dot4, dot5, dot6]
 *   点阵布局:  1 4
 *             2 5
 *             3 6
 *   1=激活该点, 0=不激活
 *
 * 旗语 (Semaphore): 字母 → [右手方向索引, 左手方向索引]
 *   方向索引（信号员自身视角，Canvas 坐标系）：
 *     0: 上(N)     1: 右上(NE)   2: 右(E)    3: 右下(SE)
 *     4: 下(S)     5: 左下(SW)   6: 左(W)    7: 左上(NW)
 *
 *   数据为信号员自身视角的原形态，不做镜像翻转。
 *
 * 摩斯 (Morse): 字符 → 点划串（'.' 为点，'-' 为划）；空格分字母、'/' 分单词。
 *
 * 猪圈 (Pigpen): 字母 → 字形描述 { shape, r/c 或 pos, dot }
 *   shape 'grid'：九宫格（3×3），r=行、c=列（均 0–2）；无点 A–I、加点 J–R
 *   shape 'x'   ：叉形（两条对角线把正方形切成 4 个 90° 区域），pos 取 top / left / right / bottom，
 *                 分别为开口朝上的 V 形、开口朝左的 > 形、开口朝右的 < 形、开口朝下的 ^ 形
 *   dot         ：true 表示「加点」字形（九宫格的点在格心，叉形的点在区域中线上）
 *   对应关系：A–I 无点九宫格；J–R 加点九宫格；S–V 叉形；W–Z 加点叉形
 *
 *   修改此文件即可更改各密码的映射规则，无需改动逻辑代码。
 */


// @anchor: data_root
// CipherData 根对象：聚合盲文 / 旗语 / 摩斯 / 猪圈四类映射
const CipherData = {

    // @anchor: data_braille
    // 盲文字母 → 点阵映射（标准 6 点盲文）
    braille: {
        'A': [1,0,0,0,0,0], 'B': [1,1,0,0,0,0], 'C': [1,0,0,1,0,0],
        'D': [1,0,0,1,1,0], 'E': [1,0,0,0,1,0], 'F': [1,1,0,1,0,0],
        'G': [1,1,0,1,1,0], 'H': [1,1,0,0,1,0], 'I': [0,1,0,1,0,0],
        'J': [0,1,0,1,1,0], 'K': [1,0,1,0,0,0], 'L': [1,1,1,0,0,0],
        'M': [1,0,1,1,0,0], 'N': [1,0,1,1,1,0], 'O': [1,0,1,0,1,0],
        'P': [1,1,1,1,0,0], 'Q': [1,1,1,1,1,0], 'R': [1,1,1,0,1,0],
        'S': [0,1,1,1,0,0], 'T': [0,1,1,1,1,0], 'U': [1,0,1,0,0,1],
        'V': [1,1,1,0,0,1], 'W': [0,1,0,1,1,1], 'X': [1,0,1,1,0,1],
        'Y': [1,0,1,1,1,1], 'Z': [1,0,1,0,1,1]
    },
    // @anchor: data_braille_end

    // @anchor: data_semaphore
    // 旗语字母 → [右手方向索引, 左手方向索引]（信号员自身视角，原形态，未经镜像翻转）
    semaphore: {
        // 第一圈：右手 S(4)，左手逆时针 SE→E→NE→N→NW→W→SW
        'A': [4, 5], 'B': [4, 6], 'C': [4, 7],
        'D': [4, 0], 'E': [4, 1], 'F': [4, 2], 'G': [4, 3],
        // 第二圈：右手 SE(3)，左手逆时针 E→NE→N→NW→W→SW→S
        'H': [5, 6], 'I': [5, 7], 'J': [2, 0],
        'K': [5, 0], 'L': [5, 1], 'M': [5, 2], 'N': [5, 3],
        // 第三圈：右手 E(2)，左手逆时针 NE→N→NW→W→SW→S
        'O': [6, 7], 'P': [6, 0], 'Q': [6, 1],
        'R': [6, 2], 'S': [6, 3], 'T': [7, 0],
        // 第四圈：右手 NE(1)，左手逆时针 N→NW→W→SW→S
        'U': [7, 1], 'V': [0, 3], 'W': [1, 2],
        'X': [1, 3], 'Y': [7, 2],
        // Z：左手 SW(5) + 右手 S(4)
        'Z': [3, 2]
    },
    // @anchor: data_semaphore_end

    // @anchor: data_morse
    // 摩斯电码表：字符 → 点划串（'.'=点，'-'=划；空格分字母，'/' 分单词）
    morse: {
        'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
        'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
        'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
        'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
        'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
        'Z': '--..',
        '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
    },
    // @anchor: data_morse_end

    // @anchor: data_pigpen
    // 猪圈字形映射：字母 → 字形描述；对应关系见文件头（A–I 无点九宫格，J–R 加点九宫格，S–V 叉形，W–Z 加点叉形）
    pigpen: {
        // 第一组：无点九宫格 A–I（r=行、c=列，0–2）
        'A': { shape: 'grid', r: 0, c: 0, dot: false },
        'B': { shape: 'grid', r: 0, c: 1, dot: false },
        'C': { shape: 'grid', r: 0, c: 2, dot: false },
        'D': { shape: 'grid', r: 1, c: 0, dot: false },
        'E': { shape: 'grid', r: 1, c: 1, dot: false },
        'F': { shape: 'grid', r: 1, c: 2, dot: false },
        'G': { shape: 'grid', r: 2, c: 0, dot: false },
        'H': { shape: 'grid', r: 2, c: 1, dot: false },
        'I': { shape: 'grid', r: 2, c: 2, dot: false },
        // 第二组：加点九宫格 J–R（与 A–I 同格位，格心补一点）
        'J': { shape: 'grid', r: 0, c: 0, dot: true },
        'K': { shape: 'grid', r: 0, c: 1, dot: true },
        'L': { shape: 'grid', r: 0, c: 2, dot: true },
        'M': { shape: 'grid', r: 1, c: 0, dot: true },
        'N': { shape: 'grid', r: 1, c: 1, dot: true },
        'O': { shape: 'grid', r: 1, c: 2, dot: true },
        'P': { shape: 'grid', r: 2, c: 0, dot: true },
        'Q': { shape: 'grid', r: 2, c: 1, dot: true },
        'R': { shape: 'grid', r: 2, c: 2, dot: true },
        // 第三组：叉形（X 形）S–V，四个 90° 区域（正方形被两条对角线切开，图形不含正方形外框）
        'S': { shape: 'x', pos: 'top' },
        'T': { shape: 'x', pos: 'left' },
        'U': { shape: 'x', pos: 'right' },
        'V': { shape: 'x', pos: 'bottom' },
        // 第四组：加点叉形 W–Z（与 S–V 同区域，区域中线上补一点）
        'W': { shape: 'x', pos: 'top', dot: true },
        'X': { shape: 'x', pos: 'left', dot: true },
        'Y': { shape: 'x', pos: 'right', dot: true },
        'Z': { shape: 'x', pos: 'bottom', dot: true }
    }


    // @anchor: data_pigpen_end
};
// @anchor: data_root_end

// @anchor: cipher_data_export
// 浏览器把数据暴露为全局 CipherData；Node 自测时额外走 module 导出（对页面无副作用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CipherData;
}
// @anchor: cipher_data_export_end
