import { ELEMENT_TEXT } from "./constants";

/**
 * 创建元素(虚拟DOM)的广法
 * @param {} type  元素的类型div span p
 * @param {*} config  配置对象 属性 key ref
 * @param  {...any} children  放着所有的儿子，这里会做成一个数组
 * @returns {} 虚拟dom {props: {} , type: "div"}
 */
function createElement(type, config, ...children) {
  // 删除不需要的属性
  delete config.__self;
  delete config.__source; //表示这个元素是在哪行哪列哪个文件生成的
  return {
    type, // 元素类型
    props: {
      ...config, // 属性
      // 兼容处理：
      // 1. React.createElement("div", id: "C1" }, "A1")
      // 2. React.createElement("div", id: "C1" }, React.createElement(xxx))
      children: children.map((child) => {
        //如果这个child是一个React.createElement返回的React元素，如果是字符串的话，才会转成文本节点
        return typeof child === "object"
          ? child
          : {
              type: ELEMENT_TEXT,
              // 文本会被babel处理为字符串,便于后面统一处理（注意react内部是在render后处理的）
              props: { text: child, children: [] },
            };
      }),
    },
  };
}
let React = {
  createElement,
};

export default React;
