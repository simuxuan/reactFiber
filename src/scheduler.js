import { setProps } from "./utils";
import {
  ELEMENT_TEXT,
  PLACEMENT,
  TAG_HOST,
  TAG_ROOT,
  TAG_TEXT,
} from "./constants";

let workInProgressRoot = null; //正在渲染中的根Fiber
let nextUnitOfWork = null; //下一个工作单元

/**
 * @param {*} rootFiber 根Fiber（包含虚拟节点）
 */
export function scheduleRoot(rootFiber) {
  workInProgressRoot = rootFiber;
  nextUnitOfWork = workInProgressRoot; // 赋值后就会进入执行任务的状态
}

/**
 * @description 执行调度（帧）
 * 1. 执行任务：创建fiber树 2. 创建effect链表
 * 2. commit提交渲染
 */
function workLoop(deadline) {
  let shouldYield = false; // 是否交出控制权
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); //执行一个任务并返回下一个任务
    shouldYield = deadline.timeRemaining() < 1;
  }
  //如果没有下一个执行单元了，并且当前渲染树存在，则进行提交阶段
  if (!nextUnitOfWork && workInProgressRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

// 执行单个任务---把子元素变成子fiber
function performUnitOfWork(currentFiber) {
  //   console.log(currentFiber); // 这里打印的实际上是先序遍历的顺序
  // 根据虚拟dom，创建当前的fiber的子fiber
  beginWork(currentFiber); //开始渲染前的Fiber,就是把子元素变成子fiber

  if (currentFiber.child) {
    //如果子节点就返回第一个子节点
    return currentFiber.child; // 返回后会执行下一次构建fiber，直到fiber树构建完
  }
  // 没有子节点，到底了，准备返回
  while (currentFiber) {
    //如果没有子节点说明当前节点已经完成了渲染工作
    completeUnitOfWork(currentFiber); //可以结束此fiber的渲染了，这里实际上是后序遍历
    if (currentFiber.sibling) {
      //如果它有弟弟就返回弟弟
      return currentFiber.sibling;
    }
    currentFiber = currentFiber.return; //如果没有弟弟让爸爸完成，然后找叔叔
  }
}

// 给当前fiber创建真实dom属性，并如果有子节点去构建其子fiber
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    //如果是根节点
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    //如果是原生文本节点
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    //如果是原生DOM节点
    updateHostComponent(currentFiber);
  }
}

function updateHostRoot(currentFiber) {
  //如果是根节点
  const newChildren = currentFiber.props.children; //直接渲染子节点
  reconcileChildren(currentFiber, newChildren); // #root  虚拟dom根
}
// 文本节点
function updateHostText(currentFiber) {
  // 文本节点已经到底了，直接生成真实dom
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function updateHostComponent(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber); //先创建真实的DOM节点
  }
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren); // 调度子节点
}

function createDOM(currentFiber) {
  // 文本
  if (currentFiber.type === ELEMENT_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  }
  // dom
  const stateNode = document.createElement(currentFiber.type);
  updateDOM(stateNode, {}, currentFiber.props);
  return stateNode;
}

function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

// 生成子fiber
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0;
  let prevSibling;
  // 不断生成子fiber
  while (newChildIndex < newChildren.length) {
    const newChild = newChildren[newChildIndex];
    let tag;
    if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT;
    } else if (newChild && typeof newChild.type === "string") {
      tag = TAG_HOST; //原生DOM组件
    }
    let newFiber = {
      tag,
      type: newChild.type,
      props: newChild.props, // 里面保留着后面的孩子
      stateNode: null, //stateNode肯定是空的
      return: currentFiber, //父Fiber
      effectTag: PLACEMENT, //副作用标识
      nextEffect: null,
    };
    if (newFiber) {
      if (newChildIndex === 0) {
        currentFiber.child = newFiber;
      } else {
        prevSibling.sibling = newFiber; // 延长fiber链
      }
    }
    prevSibling = newFiber;
    newChildIndex++;
  }
}
// 完成节点--创建effect链表（后序遍历返回）
function completeUnitOfWork(currentFiber) {
  //   console.log(currentFiber); // 这里打印的是后序遍历的顺序
  const returnFiber = currentFiber.return;
  if (returnFiber) {
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }

    const effectTag = currentFiber.effectTag;
    if (effectTag) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }
  }
}
// 提交渲染---根据创建的链表和没饿过fiber上的真实节点去构建渲染树（节点的父子关系）
function commitRoot() {
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber); // 根据链表（后序从子节点开始）将之前创建的真实dom，按照链表fiber关系组合起来
    currentFiber = currentFiber.nextEffect; 
  }
  workInProgressRoot = null;
}
function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return; //先获取父Fiber
  const domReturn = returnFiber.stateNode; //获取父的DOM节点
  if (currentFiber.effectTag === PLACEMENT && currentFiber.stateNode != null) {
    //如果是新增DOM节点
    let nextFiber = currentFiber;
    domReturn.appendChild(nextFiber.stateNode);
  }
  currentFiber.effectTag = null; // 清除副作用
}

requestIdleCallback(workLoop);
