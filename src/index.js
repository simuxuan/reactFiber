import React from "./react";
import ReactDom from "./react-dom";

let style = { border: "3px solid red", margin: "5px" };
// let element = (
//   <div id="A1" style={style}>
//     A1
//     <div id="B1" style={style}>
//       B1
//       <div id="C1" style={style}>
//         C1
//       </div>
//       <div id="C2" style={style}>
//         C2
//       </div>
//     </div>
//     <div id="B2" style={style}>
//       B2
//     </div>
//   </div>
// );
let element = /*#__PURE__*/React.createElement("div", {
  id: "A1",
  style: style
}, "A1", /*#__PURE__*/React.createElement("div", {
  id: "B1",
  style: style
}, "B1", /*#__PURE__*/React.createElement("div", {
  id: "C1",
  style: style
}, "C1"), /*#__PURE__*/React.createElement("div", {
  id: "C2",
  style: style
}, "C2")), /*#__PURE__*/React.createElement("div", {
  id: "B2",
  style: style
}, "B2"));

// 不写更新逻辑会直接添加进去
let reRender2 = document.getElementById('reRender2');
reRender2.addEventListener('click', () => {
  let element2 = /*#__PURE__*/React.createElement("div", {
    id: "A1-new",
    style: style
  }, "A1-new", /*#__PURE__*/React.createElement("div", {
    id: "B1-new",
    style: style
  }, "B1-new", /*#__PURE__*/React.createElement("div", {
    id: "C1-new",
    style: style
  }, "C1-new"), /*#__PURE__*/React.createElement("div", {
    id: "C2-new",
    style: style
  }, "C2-new")), /*#__PURE__*/React.createElement("div", {
    id: "B2",
    style: style
  }, "B2"), /*#__PURE__*/React.createElement("div", {
    id: "B3",
    style: style
  }, "B3"));
  ReactDom.render(
    element2,
    document.getElementById('root')
  );
});

ReactDom.render(element,document.getElementById('root'))
