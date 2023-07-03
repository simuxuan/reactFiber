import React from './react';

let element = /*#__PURE__*/React.createElement("div", {
  id: "A1"
}, "A1", /*#__PURE__*/React.createElement("div", {
  id: "B1"
}, /*#__PURE__*/React.createElement("div", {
  id: "C1"
}, "A1"), /*#__PURE__*/React.createElement("div", {
  id: "C2"
})), /*#__PURE__*/React.createElement("div", {
  id: "B2"
}));
console.log(element);