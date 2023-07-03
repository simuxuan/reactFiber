# react
## 实现虚拟 DOM
在 react 项目使用 JSX 语法，会自动被 babel 转为 createElement 函数
```js
let element = (
  <div id="A1">
    <div id="B1">
      <div id="C1"></div>
      <div id="C2"></div>
    </div>
    <div id="B2"></div>
  </div>
);
```

JSX 转换结果：===>
```js
let element = /*#__PURE__*/ React.createElement(
  "div",
  {
    id: "A1",
  },
  /*#__PURE__*/ React.createElement(
    "div",
    {
      id: "B1",
    },
    /*#__PURE__*/ React.createElement("div", {
      id: "C1",
    }),
    /*#__PURE__*/ React.createElement("div", {
      id: "C2",
    })
  ),
  /*#__PURE__*/ React.createElement("div", {
    id: "B2",
  })
);
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
##
ReactDOM.render(element(虚拟 dom),挂载的 dom)

先序遍历--》创建fiber树
后序遍历--》创建effect链表