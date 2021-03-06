/**
 * @file Tooltip
 * @author zhujl
 */
define(function (require, exports, module) {

    /**
     * 鼠标悬浮元素，弹出提示浮层
     *
     * 鉴于需求较多，可通过 Tooltip.defaultOptions 进行配置
     *
     * 默认读取元素的 title 属性进行展现，如有特殊需求，可通过 defaultOptions.titleAttr 配置
     *
     * 提示出现的位置可通过 defaultOptions.placement 和 defaultOptions.placementAttr 统一配置
     * 如个别元素需特殊处理，可为元素加上 defaultOptions.placementAttr 配置的属性改写全局配置
     *
     * 如果要实现小箭头效果，可参考如下配置:
     *
     * {
     *    template: '<div class="tooltip"><i class="arrow"></i><div class="content"></div></div>',
     *    placementPrefix: 'tooltip-placement-',
     *    update: function (tipElement) {
     *        tipElement.find('.content').html(this.title);
     *    }
     * }
     *
     * 如需要调整位置，比如不是上下左右，而是下方偏右，可参考如下配置：
     *
     * {
     *     placement: 'bottom,auto',
     *     offset: {
     *         bottom: {
     *             x: 20,   // 向右偏移 20px
     *             y: 0
     *         }
     *     }
     * }
     *
     * 如果实例化的 template 参数和 defaultOptions.template 不同，会在实例上新建一个 tipElement 属性
     *
     */

    'use strict';

    var Popup = require('../helper/Popup');
    var position = require('../util/position');

    /**
     * 工具提示
     *
     * @constructor
     * @param {Object} options
     * @property {jQuery} options.element 需要工具提示的元素
     * @property {string=} options.placement 提示元素出现的位置，可选值包括 left right top bottom topLeft topRight bottomLeft bottomRight auto，可组合使用 如 'bottom,auto'，表示先尝试 bottom，不行就 auto
     * @property {string=} options.placementAttr 优先级比 placement 更高的位置配置
     * @property {string=} options.placementPrefix 提示方位的 class 前缀，有助于实现小箭头之类的效果
     * @property {string=} options.showBy 触发显示的方式，可选值包括 over click
     * @property {string=} options.hideBy 触发隐藏的方式，可选值包括 out blur 可组合使用，如 out,blur
     * @property {number=} options.showDelay 当 showBy 为 over 的显示延时
     * @property {number=} options.hideDelay 当 hideBy 包含 out 的隐藏延时
     * @property {number=} options.gapX 横向间距，如果为 0，提示会和元素贴在一起
     * @property {number=} options.gapY 纵向间距，如果为 0，提示会和元素贴在一起
     * @property {Object=} options.offset 设置 left right top bottom topLeft topRight bottomLeft bottomRight 方向的偏移量
     * @property {string=} options.template 提示元素的模版，可配合使用 placementPrefix, update 实现特殊需求
     * @property {function(jQuery)=} options.show 显示提示的方式，可扩展实现动画
     * @property {function(jQuery)=} options.hide 显示提示的方式，可扩展实现动画
     * @property {function(jQuery)=} options.update 更新 tip 元素的内容
     * @property {Function=} options.onBeforeShow
     * @property {Function=} options.onAfterShow
     * @property {Function=} options.onBeforeHide
     * @property {Function=} options.onAfterHide
     */
    function Tooltip(options) {
        $.extend(this, Tooltip.defaultOptions, options);
        this.init();
    }

    Tooltip.prototype = {

        constructor: Tooltip,

        /**
         * 初始化
         */
        init: function () {

            var me = this;

            var element = me.element;
            var titleAttr = me.titleAttr;

            me.title = element.attr(titleAttr);
            me.placement = element.attr(me.placementAttr) || me.placement;

            // 避免出现原生的提示
            if (titleAttr === 'title') {
                element.removeAttr(titleAttr);
            }

            me.cache = { };
            me.cache.popup = new Popup({

                trigger: element,
                element: getTipElement(me),

                showBy: me.showBy,
                hideBy: me.hideBy,

                showDelay: me.showDelay,
                hideDelay: me.hideDelay,

                show: function () {
                    me.show(getTipElement(me));
                },
                hide: function () {
                    me.hide(getTipElement(me));
                },

                onAfterShow: $.proxy(me.onAfterShow, me),
                onBeforeHide: $.proxy(me.onBeforeHide, me),
                onAfterHide: $.proxy(me.onAfterHide, me),
                onBeforeShow: function () {

                    var tipElement = getTipElement(me);
                    var actualPlacement;

                    // 如果 update 返回 false，表示后面的都不用继续了
                    if (me.update(tipElement) === false
                        || !(actualPlacement = getTipPlacement(element, tipElement, me.placement))
                    ) {
                        return false;
                    }
                    else {
                        var target = placementMap[actualPlacement];
                        var options = {
                            element: tipElement,
                            attachment: element,
                            offsetX: me.gapX,
                            offsetY: me.gapY
                        };

                        if (typeof target.gap === 'function') {
                            target.gap(options);
                        }

                        // 全局定位
                        var offset = me.offset && me.offset[actualPlacement];
                        if (offset) {
                            options.offsetX += offset.x;
                            options.offsetY += offset.y;
                        }

                        position[target.name](options);

                        // 设置方位 class，便于添加箭头样式
                        var placementClassKey = '__placement__';
                        var placementClass = tipElement.data(placementClassKey);

                        if (placementClass) {
                            tipElement.removeClass(placementClass);
                            tipElement.removeData(placementClassKey);
                        }
                        if (me.placementPrefix) {
                            placementClass = me.placementPrefix + actualPlacement.toLowerCase();
                            tipElement.addClass(placementClass);
                            tipElement.data(placementClassKey, placementClass);
                        }

                        if (typeof me.onBeforeShow === 'function') {
                            return me.onBeforeShow();
                        }
                    }
                }
            });
        },

        /**
         * 销毁对象
         */
        dispose: function () {
            var me = this;

            var cache = me.cache;
            cache.popup.dispose();

            if (cache.tipElement) {
                cache.tipElement.remove();
            }

            me.element =
            me.cache = null;
        }
    };

    /**
     * 默认配置
     *
     * @static
     * @type {Object}
     */
    Tooltip.defaultOptions = {

        titleAttr: 'title',

        placement: 'bottom,auto',
        placementAttr: 'data-placement',
        placementPrefix: 'tooltip-placement-',

        showBy: 'over',
        hideBy: 'out,blur',
        showDelay: 200,
        hideDelay: 200,

        gapX: 5,
        gapY: 5,
        offset: { },

        template: '<div class="tooltip"></div>',

        show: function (tipElement) {
            tipElement.show();
        },
        hide: function (tipElement) {
            tipElement.hide();
        },
        update: function (tipElement) {
            tipElement.html(this.title || '');
        }
    };

    /**
     * 批量初始化
     *
     * @static
     * @param {jQuery=} elements 需要提示浮层的元素
     * @param {Object=} options 配置参数
     * @return {Array.<Tooltip>}
     */
    Tooltip.init = function (elements, options) {

        if (!options && $.isPlainObject(elements)) {
            options = elements;
            elements = null;
        }

        elements = elements || $('[' + Tooltip.defaultOptions.titleAttr + ']');

        var result = [ ];

        elements.each(function () {
            result.push(
                new Tooltip(
                    $.extend(
                        {
                            element: $(this)
                        },
                        options
                    )
                )
            );
        });

        return result;
    };

    /**
     * 方位映射表
     *
     * @inner
     * @type {Object}
     */
    var placementMap = {

        bottom: {
            name: 'bottomCenter',
            check: function (options) {
                return options.bottom > 0
                    && options.left > 0
                    && options.right > 0;
            },
            gap: function (options) {
                options.offsetX = 0;
            }
        },

        top: {
            name: 'topCenter',
            check: function (options) {
                return options.top > 0
                    && options.left > 0
                    && options.right > 0;
            },
            gap: function (options) {
                options.offsetY *= -1;
                options.offsetX = 0;
            }
        },

        right: {
            name: 'middleRight',
            check: function (options) {
                return options.right > 0;
            },
            gap: function (options) {
                options.offsetY = 0;
            }
        },

        left: {
            name: 'middleLeft',
            check: function (options) {
                return options.left > 0;
            },
            gap: function (options) {
                options.offsetX *= -1;
                options.offsetY = 0;
            }
        },

        bottomLeft: {
            name: 'bottomLeft',
            check: function (options) {
                return options.left > 0
                    && options.bottom > 0;
            },
            gap: function (options) {
                options.offsetX *= -1;
            }
        },

        bottomRight: {
            name: 'bottomRight',
            check: function (options) {
                return options.right > 0
                    && options.bottom > 0;
            }
        },

        topLeft: {
            name: 'topLeft',
            check: function (options) {
                return options.left > 0
                    && options.top > 0;
            },
            gap: function (options) {
                options.offsetX *= -1;
                options.offsetY *= -1;
            }
        },

        topRight: {
            name: 'topRight',
            check: function (options) {
                return options.right > 0
                    && options.top > 0;
            },
            gap: function (options) {
                options.offsetY *= -1;
            }
        }

    };

    /**
     * 全局唯一的 tip 元素
     *
     * @inner
     * @type {jQuery}
     */
    var tipElement;

    /**
     * 获取页面容器元素
     *
     * @inner
     * @return {jQuery}
     */
    function getPageElement() {
        var documentElement = document.documentElement;
        var body = document.body;
        return $(
                documentElement.scrollHeight > body.scrollHeight
              ? documentElement
              : body
            );
    }

    /**
     * 获取单例 tip 元素
     *
     * @inner
     * @param {Tooltip} tooltip
     * @return {jQuery}
     */
    function getTipElement(tooltip) {

        var useSingleton = tooltip.template === Tooltip.defaultOptions.template;

        var template = useSingleton
                     ? Tooltip.defaultOptions.template
                     : tooltip.template;

        var element = useSingleton
                    ? tipElement
                    : tooltip.cache.tipElement

        // 如果 document.body.innerHTML 被直接清掉，元素同样也不存在了
        if (!element || !$.contains(document.body, element[0])) {
            element = $(template);
            element.hide().appendTo(document.body);

            if (useSingleton) {
                tipElement = element;
            }
            else {
                tooltip.cache.tipElement = element;
            }
        }

        return element;
    }

    /**
     * 获得 tip 放在 trigger 上下左右各自剩余的空间
     * 通过剩余空间可以自动算出最佳位置
     *
     * @inner
     * @param {jQuery} triggerElement
     * @param {jQuery} tipElement
     * @return {Object}
     */
    function getFreeSpace(triggerElement, tipElement) {

        var pageElement = getPageElement();

        // 页面宽高
        var pageWidth = pageElement.prop('scrollWidth');
        var pageHeight = pageElement.prop('scrollHeight');

        // tip 元素宽高
        var tipWidth = tipElement.outerWidth();
        var tipHeight = tipElement.outerHeight();

        // 触发元素宽高
        var triggerWidth = triggerElement.outerWidth();
        var triggerHeight = triggerElement.outerHeight();

        var triggerPosition = triggerElement.offset();

        // 算出上下左右区域，放入 tip 后剩下的大小
        return {
            top: triggerPosition.top - tipHeight,
            bottom: pageHeight - (triggerPosition.top + triggerHeight + tipHeight),
            left: triggerPosition.left - tipWidth,
            right: pageWidth - (triggerPosition.left + triggerWidth + tipWidth)
        };
    }

    /**
     * 获取 tip 的方位
     *
     * @inner
     * @param {jQuery} triggerElement 触发 tip 的元素
     * @param {jQuery} tipElement tip 元素
     * @param {string} placement 设置的方位优先级，以,分隔
     * @return {string}
     */
    function getTipPlacement(triggerElement, tipElement, placement) {

        if (placementMap[placement]) {
            return placement;
        }

        // 拆解方位
        var parts = $.map(
            placement.split(','),
            function (item) {
                return $.trim(item);
            }
        );

        // 获得剩余空间
        var freeSpace = getFreeSpace(triggerElement, tipElement);

        // 标识是否尝试过
        var testPlacement = { };
        for (var key in placementMap) {
            testPlacement[key] = 0;
        }

        // 尝试方法
        var test = function (placement) {
            var item = placementMap[placement];
            return item && item.check(freeSpace);
        };

        var result;

        $.each(
            parts,
            function (index, current) {
                if (test(current)) {
                    result = current;
                    return false;
                }
                else if (current === 'auto') {
                    for (current in testPlacement) {
                        if (!testPlacement[current] && test(current)) {
                            result = current;
                            break;
                        }
                    }
                    return false;
                }
            }
        );

        return result;
    }


    return Tooltip;

});
