# react
## 实现虚拟DOM
在react项目使用JSX语法，会自动被babel转为createElement函数
```js
let element = (
  <div id="A1">
    <div id="B1">
      <div id="C1"></div>
      <div id="C2"></div>
    </div>
    <div id="B2"></div>
  </div>
)
```
JSX转换结果：===>
```js
let element = /*#__PURE__*/React.createElement("div", {
  id: "A1"
}, /*#__PURE__*/React.createElement("div", {
  id: "B1"
}, /*#__PURE__*/React.createElement("div", {
  id: "C1"
}), /*#__PURE__*/React.createElement("div", {
  id: "C2"
})), /*#__PURE__*/React.createElement("div", {
  id: "B2"
}));
```
执行结果如下：===》
```js
// 虚拟dom
{
    $$typeof: Symbol(react.element), // react元素
    key: null,   
    props: {id: 'A1', children: Array(2)}, // 属性
    ref: null,
    type: "div",
    xxx
}
```
