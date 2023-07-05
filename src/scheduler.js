import { setProps } from "./utils";
import {
  DELETION,
  ELEMENT_TEXT,
  PLACEMENT,
  TAG_CLASS,
  TAG_FUNCTION_COMPONENT,
  TAG_HOST,
  TAG_ROOT,
  TAG_TEXT,
  UPDATE,
} from "./constants";

let currentRoot = null; // 当前的根Fiber 2
let deletions = []; // 要删除的fiber节点 2
let workInProgressRoot = null; //正在渲染中的根Fiber
let nextUnitOfWork = null; //下一个工作单元

/**
 * @param {*} rootFiber 根Fiber（包含虚拟节点）
 */
export function scheduleRoot(rootFiber) {
  // 双缓冲
  if (currentRoot && currentRoot.alternate) {
    // update 第二次之后的更新
    workInProgressRoot = currentRoot.alternate;
    workInProgressRoot.alternate = currentRoot; // 取前一次的fiber树
    if (rootFiber) workInProgressRoot.props = rootFiber.props; //让它的props更新成新的props
  } else if (currentRoot) {
    //update 说明至少已经渲染过一次了 第一次更新
    if (rootFiber) {
      rootFiber.alternate = currentRoot;
      workInProgressRoot = rootFiber;
    } else {
      // ? 什么情况
      workInProgressRoot = {
        ...currentRoot,
        alternate: currentRoot,
      };
    }
  } else {
    workInProgressRoot = rootFiber; // 初次渲染
  }
  // 每次执行任务前清空
  workInProgressRoot.firstEffect =
    workInProgressRoot.lastEffect =
    workInProgressRoot.nextEffect =
      null;
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
    currentFiber = currentFiber.return; // 找父亲然后让父亲完成
  }
}

// 1. 给当前fiber创建真实dom属性，2. 并如果有子节点去构建其子fiber
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
// 根据fiber创建真实dom元素
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
// 更新原生dom节点
function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

// 生成子fiber
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0;
  //更新： 取当前fiber对应的旧的fiber：如果说currentFiber有alternate并且alternate有child属性
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  if (oldFiber)
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;

  let prevSibling;
  // 不断生成子fiber
  while (newChildIndex < newChildren.length) {
    const newChild = newChildren[newChildIndex];

    let newFiber; // 新的Fiber
    const sameType = oldFiber && newChild && oldFiber.type === newChild.type; //

    let tag;
    if (
      newChild &&
      typeof newChild.type === "function" &&
      newChild.type.prototype.isReactComponent
    ) {
      tag = TAG_CLASS; // 类组件
    } else if (newChild && typeof newChild.type === "function") {
      tag = TAG_FUNCTION_COMPONENT; // 函数组件
    } else if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; //这是一个文本节点
    } else if (newChild && typeof newChild.type === "string") {
      tag = TAG_HOST; //原生DOM组件
    }

    //说明老fiber和新虚拟DOM类型一样，可以复用老的DOM节点，更新即可
    if (sameType) {
      // 第二次以后的更新：双缓冲复用
      if (oldFiber.alternate) {
        //说明至少已经更新一次了
        newFiber = oldFiber.alternate; //如果有上上次的fiber,就拿 过来作为这一次的fiber
        newFiber.props = newChild.props; // 更新props
        newFiber.alternate = oldFiber;
        newFiber.effectTag = UPDATE;
        newFiber.nextEffect = null;
        // 专门针对类组件，处理更新队列
        // newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
      } else {
        // 第一次更新：新建Fiber子树
        newFiber = {
          tag: oldFiber.tag, //TAG_HOST
          type: oldFiber.type, //div
          props: newChild.props, //{id="A1" style={style}} 一定要用新的元素的props
          stateNode: oldFiber.stateNode, //div还没有创建DOM元素
          return: currentFiber, //父Fiber returnFiber
          alternate: oldFiber, //让新的fiber的alternate指向老的fiber节点
          effectTag: UPDATE, //副作用标识 render我们要会收集副作用 增加 删除 更新
          nextEffect: null, //effect list 也是一个单链表
          // updateQueue: oldFiber.updateQueue || new UpdateQueue(),
        };
      }
    } else {
      //看看新的虚拟DOM是不是为null
      if (newChild) {
        // 新的存在，但是DOM类型不一样---创建新的Fiber（更新+初始渲染）
        newFiber = {
          tag,
          type: newChild.type,
          props: newChild.props, // 里面保留着后面的孩子
          stateNode: null, //stateNode肯定是空的
          return: currentFiber, //父Fiber
          effectTag: PLACEMENT, //副作用标识
          nextEffect: null,
          // updateQueue: new UpdateQueue(),
        };
      }
      // 新的DOM为null，旧DOM有值----删除旧的
      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber);
      }
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling; //oldFiber指针往后移动一次
    }

    // 新的fiber链
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
/*
effect链表说明：
1. 每个fiber有两个属性 firstEffect指向第一个有副作用的子fiber lastEffect 指儿 最后一个有副作用子Fiber
2. 中间的用nextEffect做成一个单链表 firstEffect=大儿子.nextEffect二儿子.nextEffect三儿子 lastEffect
*/
// 完成节点--创建effect链表（后序遍历返回）
function completeUnitOfWork(currentFiber) {
  //   console.log(currentFiber); // 这里打印的是后序遍历的顺序
  const returnFiber = currentFiber.return;
  if (returnFiber) {
    // 1. 先把自己儿子的effect 链挂到父亲身上
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    // 更新父元素lastEffect
    if (currentFiber.lastEffect) {
      // 父节点添加lastEffect
      if (returnFiber.lastEffect) {
        // 延长effect链表
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      // 更新父节点的lastEffect
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
    //2. 再把自己挂到父亲身上
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
// 提交渲染---根据创建的effect链表和fiber上的真实节点去构建渲染树（节点的父子关系）
function commitRoot() {
  deletions.forEach(commitWork); // 更新，先删除节点

  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber); // 根据链表（后序从子节点开始）将之前创建的真实dom，按照链表fiber关系组合起来
    currentFiber = currentFiber.nextEffect;
  }

  // 更新
  deletions.length = 0;
  currentRoot = workInProgressRoot; // 更新完成给当前root赋值

  workInProgressRoot = null;
}
// 单个effect执行
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
  } else if (currentFiber.effectTag === DELETION) {
    // 如果是删除节点
    return commitDeletion(currentFiber, domReturn);
  } else if (currentFiber.effectTag === UPDATE) {
    // 如果是更新节点
    if (currentFiber.type === ELEMENT_TEXT) {
      if (currentFiber.alternate.props.text != currentFiber.props.text)
        currentFiber.stateNode.textContent = currentFiber.props.text; // 复用dom，改变元素内容
    } else {
      updateDOM(
        currentFiber.stateNode,
        currentFiber.alternate.props,
        currentFiber.props
      );
    }
  }

  currentFiber.effectTag = null; // 清除副作用
}

function commitDeletion(currentFiber, domReturn) {
  // 删除类组件
  if (currentFiber.tag == TAG_HOST || currentFiber.tag == TAG_TEXT) {
    domReturn.removeChild(currentFiber.stateNode); // 递归，删儿子
  } else {
    // 删除普通dom元素
    commitDeletion(currentFiber.child, domReturn);
  }
}

requestIdleCallback(workLoop);
