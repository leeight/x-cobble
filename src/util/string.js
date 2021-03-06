/**
 * @file string
 * @author  zhujl
 */
define(function (require, exports, module) {

    /**
     * 1. 处理 UTF-8 字符相关
     * 2. 处理各种字符键值，如 url 参数, cookie 等
     */

    'use strict';

    /**
     * 获得单个字符的 UTF-8 长度
     *
     * @inner
     * @param {string} x
     * @return {number}
     */
    function getCharUTF8Length(x) {
        var code = x.charCodeAt(0);

        if ((code & ~0x7F) === 0) {
            return 1;
        }

        if ((code & ~0x07FF) === 0) {
            return 2;
        }

        if ((code & ~0xFFFF) === 0) {
            return 3;
        }

        return 4;
    }

    /**
     * 遍历字符串
     *
     * @inner
     * @param {string} str
     * @param {function(number, number)} callback
     */
    function traverse(str, callback) {
        var size = 0;

        for (var i = 0, len = str.length; i < len; i++) {

            size += Math.floor(
                (getCharUTF8Length(str.charAt(i)) + 1) / 2
            );

            if (callback(size, i + 1) === false) {
                break;
            }
        }
    }

    /**
     * 计算字符串的 UTF-8 长度
     *
     * 英文算 1 个字符
     * 中文算 2 个字符
     *
     * @param {string} str
     * @return {number}
     */
    exports.getLength = function (str) {
        var result = 0;

        if (typeof str === 'string') {
            traverse(
                str,
                function (length, index) {
                    result = length;
                }
            );
        }

        return result;
    };

    /**
     * 截断字符串（英文字符长度为 1，中文字符长度为 2)
     *
     * @param {string} str 需要截断的字符串
     * @param {number} length 截断字数，注意是字符数，一个汉字算 2 个字符
     * @param {string=} suffix 截断后缀，默认是 ...
     * @return {string}
     */
    exports.truncate = function (str, length, suffix) {

        if (typeof length !== 'number'
            || exports.getLength(str) <= length
        ) {
            return str;
        }

        var result = '';

        traverse(
            str,
            function (len, index) {
                if (len > length) {
                    return false;
                }
                result = str.substr(0, index);
            }
        );

        suffix = typeof suffix === 'string'
               ? suffix
               : '...';

        return result + suffix;
    };

});
