---
title: 为什么vue2使用v-for时不要用index作为key?(diff算法)
excerpt: ' '
date: 2022-05-13 11:21:40
tags: [vue全家桶, vue2, vue, diff]
---

## 前言

### 1.什么是 diff

`diff` 算法是一种通过同层的树节点进行比较的高效算法

### 2.diff 具有哪些优势

比较只会在同层级进行, 不会跨层级比较。在 `diff` 比较的过程中，循环从两边向中间比较

## diff 流程图

![diff](/assets/posts/vue2/diff.png)

### patch

[github: vuejs/vue@2.6.14 patch](https://github.com/vuejs/vue/blob/v2.6.14/src/core/vdom/patch.js#L700-L802)

```js
/**
 * 是否是 非空
 */
function isUndef(v: any) {
    return v === undefined || v === null;
}

/**
 * 是否不是 非空
 */
function isDef(v: any) {
    return v !== undefined && v !== null;
}

/**
 *
 * @param oldVnode
 * @param vnode
 * @param hydrating
 * @param removeOnly
 */
function patch(oldVnode, vnode, hydrating, removeOnly) {
    // 如果 新vnode 不存在
    if (isUndef(vnode)) {
        // 如果 老vnode 存在，
        if (isDef(oldVnode)) invokeDestroyHook(oldVnode);
        return;
    }

    let isInitialPatch = false;
    const insertedVnodeQueue = [];

    // 老vnode不存在（首次渲染）
    if (isUndef(oldVnode)) {
        isInitialPatch = true;
        createElm(vnode, insertedVnodeQueue);
    }

    // 更新节点阶段
    else {
        const isRealElement = isDef(oldVnode.nodeType);

        // 不是真实节点，并且 新、老节点是同一节点
        if (!isRealElement && sameVnode(oldVnode, vnode)) {
            // 进行更新节点
            patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly);
        } else {
            if (isRealElement) {
                // 是否是 ssr渲染
                if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
                    oldVnode.removeAttribute(SSR_ATTR);
                    hydrating = true;
                }

                // ssr渲染逻辑
                if (isTrue(hydrating)) {
                    // 混合
                    if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
                        invokeInsertHook(vnode, insertedVnodeQueue, true);
                        return oldVnode;
                    } else if (process.env.NODE_ENV !== 'production') {
                        warn(
                            'The client-side rendered virtual DOM tree is not matching ' +
                                'server-rendered content. This is likely caused by incorrect ' +
                                'HTML markup, for example nesting block-level elements inside ' +
                                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                                'full client-side render.'
                        );
                    }
                }
                // 不是 ssr渲染或混合失败，则创建一个空节点
                oldVnode = emptyNodeAt(oldVnode);
            }

            // replacing existing element
            const oldElm = oldVnode.elm;
            const parentElm = nodeOps.parentNode(oldElm);

            // create new node
            createElm(
                vnode,
                insertedVnodeQueue,
                // extremely rare edge case: do not insert if old element is in a
                // leaving transition. Only happens when combining transition +
                // keep-alive + HOCs. (#4590)
                oldElm._leaveCb ? null : parentElm,
                nodeOps.nextSibling(oldElm)
            );

            // update parent placeholder node element, recursively
            if (isDef(vnode.parent)) {
                let ancestor = vnode.parent;
                const patchable = isPatchable(vnode);

                // 遍历 父节点
                while (ancestor) {
                    // 卸载老节点的所有组件
                    for (let i = 0; i < cbs.destroy.length; ++i) {
                        cbs.destroy[i](ancestor);
                    }

                    // 替换节点
                    ancestor.elm = vnode.elm;
                    if (patchable) {
                        for (let i = 0; i < cbs.create.length; ++i) {
                            cbs.create[i](emptyNode, ancestor);
                        }
                        // #6513
                        // invoke insert hooks that may have been merged by create hooks.
                        // e.g. for directives that uses the "inserted" hook.
                        const insert = ancestor.data.hook.insert;
                        if (insert.merged) {
                            // start at index 1 to avoid re-invoking component mounted hook
                            for (let i = 1; i < insert.fns.length; i++) {
                                insert.fns[i]();
                            }
                        }
                    } else {
                        registerRef(ancestor);
                    }

                    // 更新父节点
                    ancestor = ancestor.parent;
                }
            }

            // 如果老节点存在，则删除
            if (isDef(parentElm)) {
                removeVnodes([oldVnode], 0, 0);
            }

            // 否则卸载 老节点
            else if (isDef(oldVnode.tag)) {
                invokeDestroyHook(oldVnode);
            }
        }
    }

    // 注册节点
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch);
    return vnode.elm;
}
```

### sameVnode

判断是否是同一个节点

[github: vuejs/vue@2.6.14 sameVnode](https://github.com/vuejs/vue/blob/v2.6.14/src/core/vdom/patch.js#L35-L50)

```js
/**
 * 比较节点是否相同
 */
function sameVnode(a, b) {
    return (
        // 比较 key 是否相同
        a.key === b.key &&
        // 比较是不是都是异步组件
        a.asyncFactory === b.asyncFactory && // 比较标签名称是否相同
        ((a.tag === b.tag &&
            // 解析代码后，比较是否都是被注释后的节点
            a.isComment === b.isComment &&
            // 比较 data 数据引用是否相同
            isDef(a.data) === isDef(b.data) &&
            // 比较 input 标签的 data、attrs、type 是否相同
            sameInputType(a, b)) ||
            //
            (isTrue(a.isAsyncPlaceholder) && isUndef(b.asyncFactory.error)))
    );
}
```

`sameVnode` 函数使用到的工具类

```js
/**
 * 判断a和b若input，则是否相同
 */
function sameInputType(a, b) {
    // 不比较非 input 标签
    if (a.tag !== 'input') return true;

    let i;

    // 判断 data、attrs、type 属性是否非空
    const typeA = isDef((i = a.data)) && isDef((i = i.attrs)) && i.type;
    const typeB = isDef((i = b.data)) && isDef((i = i.attrs)) && i.type;

    // 判断 a 和 b 都不是非空，并且判断 input type 属性是否正确
    return typeA === typeB || (isTextInputType(typeA) && isTextInputType(typeB));
}

/**
 * 分割 str 字符串，通过闭包判断 key 字段是否命中内容
 */
function makeMap(str: string, expectsLowerCase?: boolean): (key: string) => true | void {
    const map = Object.create(null);
    const list: Array<string> = str.split(',');
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? (val) => map[val.toLowerCase()] : (val) => map[val];
}

/**
 * input 属性为 输入类型的 type 值
 */
const isTextInputType = makeMap('text,number,password,search,email,tel,url');

/**
 * 是否为 true
 */
function isTrue(v: any): boolean %checks {
    return v === true;
}
```

### patchVnode

[github: vuejs/vue@2.6.14 patchVnode](https://github.com/vuejs/vue/blob/v2.6.14/src/core/vdom/patch.js#L501-L574)

```js
/**
 * 给 vnode 打补丁
 * @param oldVnode 老虚拟dom节点
 * @param vnode 新虚拟dom节点
 * @param insertedVnodeQueue
 * @param ownerArray
 * @param index
 * @param removeOnly
 */
function patchVnode(oldVnode, vnode, insertedVnodeQueue, ownerArray, index, removeOnly) {
    // 若新节点和老节点引用相同，则跳过
    if (oldVnode === vnode) {
        return;
    }

    //
    if (isDef(vnode.elm) && isDef(ownerArray)) {
        // clone reused vnode
        vnode = ownerArray[index] = cloneVNode(vnode);
    }

    const elm = (vnode.elm = oldVnode.elm);

    if (isTrue(oldVnode.isAsyncPlaceholder)) {
        if (isDef(vnode.asyncFactory.resolved)) {
            hydrate(oldVnode.elm, vnode, insertedVnodeQueue);
        } else {
            vnode.isAsyncPlaceholder = true;
        }
        return;
    }

    // 新、老节点都是静态节点，且 key 都相同，并新的vnode是克隆节点或绑定了 v-once, 则赋值后结束
    if (
        isTrue(vnode.isStatic) &&
        isTrue(oldVnode.isStatic) &&
        vnode.key === oldVnode.key &&
        (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
        vnode.componentInstance = oldVnode.componentInstance;
        return;
    }

    // hook
    let i;
    const data = vnode.data;
    if (isDef(data) && isDef((i = data.hook)) && isDef((i = i.prepatch))) {
        i(oldVnode, vnode);
    }

    const oldCh = oldVnode.children;
    const ch = vnode.children;
    if (isDef(data) && isPatchable(vnode)) {
        for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
        if (isDef((i = data.hook)) && isDef((i = i.update))) i(oldVnode, vnode);
    }

    // 如果新vnode没有 文本内容，则代表可能有子节点
    if (isUndef(vnode.text)) {
        // 如果新、老节点都有子节点
        if (isDef(oldCh) && isDef(ch)) {
            // 如果子节点不相同，则更新节点
            if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly);
        }

        // 新vnode的子节点非空
        else if (isDef(ch)) {
            // 开发环境，检查新节点的子节点是否存在重复key，如有则console抛出警告提示
            if (process.env.NODE_ENV !== 'production') {
                checkDuplicateKeys(ch);
            }

            //
            if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '');
            addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
        }

        // 如果新节点没有子节点，但老节点有子节点，则删除老节点的子节点
        else if (isDef(oldCh)) {
            removeVnodes(oldCh, 0, oldCh.length - 1);
        }

        // 如果老节点的自己就是 文本内容，则清空
        else if (isDef(oldVnode.text)) {
            nodeOps.setTextContent(elm, '');
        }
    }

    // 如果新老节点的 文本内容不相同，则更新 新节点 文本内容
    else if (oldVnode.text !== vnode.text) {
        nodeOps.setTextContent(elm, vnode.text);
    }

    if (isDef(data)) {
        if (isDef((i = data.hook)) && isDef((i = i.postpatch))) i(oldVnode, vnode);
    }
}
```

### updateChildren

[github: vuejs/vue@2.6.14 updateChildren](https://github.com/vuejs/vue/blob/v2.6.14/src/core/vdom/patch.js#L404-L474)

```js
/**
 * @param parentElm
 * @param oldCh
 * @param newCh
 * @param insertedVnodeQueue
 * @param removeOnly
 */
function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    let oldStartIdx = 0;
    let newStartIdx = 0;
    let oldEndIdx = oldCh.length - 1;
    let oldStartVnode = oldCh[0];
    let oldEndVnode = oldCh[oldEndIdx];
    let newEndIdx = newCh.length - 1;
    let newStartVnode = newCh[0];
    let newEndVnode = newCh[newEndIdx];
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm;

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly;

    if (process.env.NODE_ENV !== 'production') {
        checkDuplicateKeys(newCh);
    }

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        //
        if (isUndef(oldStartVnode)) {
            oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
        }
        //
        else if (isUndef(oldEndVnode)) {
            oldEndVnode = oldCh[--oldEndIdx];
        }

        // 新老节点 头头比较
        else if (sameVnode(oldStartVnode, newStartVnode)) {
            patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
            oldStartVnode = oldCh[++oldStartIdx];
            newStartVnode = newCh[++newStartIdx];
        }

        // 新老节点 尾尾比较
        else if (sameVnode(oldEndVnode, newEndVnode)) {
            patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
            oldEndVnode = oldCh[--oldEndIdx];
            newEndVnode = newCh[--newEndIdx];
        }

        // 新老节点 尾头比较
        else if (sameVnode(oldStartVnode, newEndVnode)) {
            // Vnode moved right
            patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx);
            canMove &&
                nodeOps.insertBefore(
                    parentElm,
                    oldStartVnode.elm,
                    nodeOps.nextSibling(oldEndVnode.elm)
                );
            oldStartVnode = oldCh[++oldStartIdx];
            newEndVnode = newCh[--newEndIdx];
        }

        // 新老节点 头尾比较
        else if (sameVnode(oldEndVnode, newStartVnode)) {
            // Vnode moved left
            patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
            canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
            oldEndVnode = oldCh[--oldEndIdx];
            newStartVnode = newCh[++newStartIdx];
        }
        //
        else {
            if (isUndef(oldKeyToIdx))
                oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
            idxInOld = isDef(newStartVnode.key)
                ? oldKeyToIdx[newStartVnode.key]
                : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx);
            if (isUndef(idxInOld)) {
                // New element
                createElm(
                    newStartVnode,
                    insertedVnodeQueue,
                    parentElm,
                    oldStartVnode.elm,
                    false,
                    newCh,
                    newStartIdx
                );
            } else {
                vnodeToMove = oldCh[idxInOld];
                if (sameVnode(vnodeToMove, newStartVnode)) {
                    patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
                    oldCh[idxInOld] = undefined;
                    canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm);
                } else {
                    // same key but different element. treat as new element
                    createElm(
                        newStartVnode,
                        insertedVnodeQueue,
                        parentElm,
                        oldStartVnode.elm,
                        false,
                        newCh,
                        newStartIdx
                    );
                }
            }
            newStartVnode = newCh[++newStartIdx];
        }
    }

    if (oldStartIdx > oldEndIdx) {
        refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
        addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
        removeVnodes(oldCh, oldStartIdx, oldEndIdx);
    }
}
```
