---
title: 面试官:如何自己手写一个mini的vuex3?
excerpt: ' '
date: 2022-05-07 10:22:37
tags: [vue全家桶, vuex, mini-project]
# banner_img: /assets/mini-project/mini-vuex3.png
---

![实现功能](/assets/posts/mini-project/mini-vuex3.png)

## 介绍

### 地址

[源码地址:vuejs/vuex@3.6.2](https://github.com/vuejs/vuex/tree/v3.6.2)

[myGithub:2460392754/mini-vuex3](https://github.com/2460392754/mini-project/tree/master/mini-vuex3)

## 项目结构

```
src
├── core
│   ├── helpers.ts
│   ├── index.ts
│   └── store.ts
├── types
│   └── index.ts
├── utils
│   ├── index.ts
│   ├── isModuleType.ts
│   ├── reactive.ts
│   └── register.ts
└── index.ts
```

## 实现

### 1 基本

#### 1.1 注册

使用`class`的`static`属性进行创建一个名为`install`的静态方法, 用于`Vue.use`注册插件。

插件注册时把当前环境的`vue`对象引用保存下来，确保项目和插件使用的是同一个引用对象。因为需要利用项目中的`data`功能来辅助`state`和`getters`值更新后触发视图更新。

[github: mini-vuex3/src/core/store.ts#L6-L23](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/store.ts#L6-L23)

```ts
import type { VueConstructor } from 'vue';

// 保存当前vue引用, 确保和项目使用相同的引用
let _vue: VueConstructor;

export class store {
    /**
     * 插件注册
     * @param vue
     */
    static install(vue: VueConstructor) {
        _vue = vue;
    }

    // do something...
}
```

#### 1.2 实例化

通过`class`的构造函数进行初始化。

(Tips: `registerState`和`registerGetters`会在后面的[实例属性](#2-实例属性)里讲到)

[github: mini-vuex3/src/core/store.ts#L40-L59](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/store.ts#L40-L59)

```ts
import type Vue from 'vue';
import type { StoreOpts } from '../types';

// 保存当前vue引用, 确保和项目使用相同的引用
let _vue: VueConstructor;

export class store {
    private _vm: Vue = null;
    private _mutations = null;
    private _actions = null;
    private _modules = null;

    getters = null;

    constructor(opts: StoreOpts) {
        // 添加 原型属性，指向当前store实例化后的对象
        _vue.prototype.$store = this;

        // _state对象 响应式处理, 需要通知项目视图更新
        this._vm = new _vue({
            data() {
                return {
                    _state: registerState(opts),
                };
            },
        });

        this.getters = registerGetters(this.state, opts || {});
        this._mutations = opts.mutations || {};
        this._actions = opts.actions || {};
        this._modules = opts.modules || {};

        registerModules(this._mutations, this._actions, this._modules);
    }
}
```

**registerModules**

使用 es6 中`Reflect`特性进行修改对象的键名模拟私有对象, 例如: `{ A: 'a' }` => `{ _A: 'a' }`。

把规范化后`moduels.[NAME].mutations`和`moduels.[NAME].actions`对象进行合并。

[github: mini-vuex3/src/utils/register.ts#L57-L84](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/utils/register.ts#L57-L84)

```ts
/**
 * 注册 modules
 */
export function registerModules(mutations: Mutations, actions: Actions, modules: Modules) {
    Object.keys(modules).forEach((key) => {
        const module = modules[key] as Module & {
            _actions: Actions;
            _mutations: Mutations;
        };

        // 修改键名
        Reflect.set(module, '_actions', module.actions);
        Reflect.set(module, '_mutations', module.mutations);
        Reflect.deleteProperty(module, 'actions');
        Reflect.deleteProperty(module, 'mutations');

        let moduleActions = module._actions;
        let moduleMutations = module._mutations;

        if (module.namespaced === true) {
            moduleMutations = setModuleNameDataKey(module.name, moduleMutations);
            moduleActions = setModuleNameDataKey(module.name, moduleActions);
        }

        Object.assign(mutations, moduleMutations);
        Object.assign(actions, moduleActions);
    });
}

/**
 * 修改 modules 中对象的键名, 使用 module.name 追加拼接
 * @param moduleName
 * @param data
 * @returns
 */
function setModuleNameDataKey(moduleName: string, data: { [key: string]: Function }) {
    const res = {};

    Object.keys(data).forEach((key) => {
        const newKey = moduleName + '/' + key;

        res[newKey] = data[key];
    });

    return res;
}
```

### 2 实例属性

#### 2.1 state 属性

[github: mini-vuex3/src/core/store.ts#L28-L51](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/store.ts#L28-L51)

```ts
export class store {
    /**
     * 设置 state的get访问器
     */
    get state(): State {
        return this._vm.$data._state;
    }

    /**
     * 设置 state的set访问器
     * 禁止直接写入数据
     */
    set state(v: any) {
        throw new Error("can't set state: " + v);
    }

    constructor(opts: StoreOpts) {
        // _state对象 响应式处理, 需要通知项目视图更新
        this._vm = new _vue({
            data() {
                return {
                    _state: registerState(opts),
                };
            },
        });

        // do something...
    }

    // do something...
}
```

**registerState**

把`module.[NAME].state`合并到`state`中

[github: mini-vuex3/src/utils/register.ts#L22-L35](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/utils/register.ts#L22-L35)

```ts
/**
 * 注册 state
 * @param opts
 * @returns
 */
export function registerState(opts: StoreOpts) {
    const moduleStates = {};

    Object.values(opts.modules || {}).forEach((module) => {
        moduleStates[module.name] = module.state || {};
    });

    return Object.assign(moduleStates, opts.state || {});
}
```

#### 2.2 getters 属性

[github: mini-vuex3/src/core/store.ts#L53](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/store.ts#L53)

```ts
export class store {
    constructor(opts: StoreOpts) {
        this.getters = registerGetters(this.state, opts || {});

        // do something...
    }

    // do something...
}
```

**registerGetters**

把`module.[NAME].getters`合并到`getters`中, 并通过`Object.defineProperty`劫持`getters`中所有对象，转换成响应式类型。

[github: mini-vuex3/src/utils/register.ts#L37-L55](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/utils/register.ts#L37-L55)

```ts
/**
 * 注册 getters
 */
export function registerGetters(state: State, opts: StoreOpts) {
    const getters: any = {};

    reactiveGetters(opts.getters, state, getters);

    Object.values(opts.modules || {}).forEach((module) => {
        if (module.namespaced === true) {
            const newGetters = setModuleNameDataKey(module.name, module.getters);
            reactiveGetters(newGetters, state[module.name], getters);
        } else {
            reactiveGetters(module.getters, state[module.name], getters);
        }
    });

    return getters;
}

/**
 * 劫持 getters 对象，处理成响应式内容
 * @param getters
 * @param state
 * @param res
 */
export function reactiveGetters(getters: Getters, state: State, res: { [key: string]: string }) {
    for (let key in getters) {
        Object.defineProperty(res, key, {
            get: () => {
                return getters[key](state);
            },

            set(key) {
                console.error(`Cannot set getters ${key}`);
            },
        });
    }
}
```

### 3 实例方法

#### 3.1 commit 方法

访问`namespaced`为`true`的`modules`对象时, 修改`state`对象范围。

[github: mini-vuex3/src/core/store.ts#L61-L85](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/store.ts#L61-L85)

```ts
export class store {
    // do something...

    commit(type: string, payload: Payload) {
        const func: Mutation = this._mutations[type];
        let state: State;

        // 未定义属性
        if (typeof func === 'undefined') {
            throw new Error(`unknown mutation type: ${type}`);
        }

        if (isModuleType(type)) {
            const name = type.split('/')[0];
            const module = this._modules[name];

            state = module.state;
        } else {
            state = this.state;
        }

        func.call(this, state, payload);
    }
}
```

#### 3.2 dispatch 方法

访问`namespaced`为`true`的`modules`对象时, 修改函数内`this`的`commit`和`dispatch`作用域范围和对应的`store`内容。

[github: mini-vuex3/src/core/store.ts#L87-L116](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/store.ts#L87-L116)

```ts
export class store {
    // do something...

    dispatch(type: string, payload: Payload) {
        const func: Action = this._actions[type];
        let store: any;

        // 未定义属性
        if (typeof func === 'undefined') {
            throw new Error(`unknown action type: ${type}`);
        }

        if (isModuleType(type)) {
            const name = type.split('/')[0];
            const module = this._modules[name];

            store = module;
            // 修改作用域范围
            Object.assign(store, {
                commit: this.commit.bind(store),
                dispatch: this.dispatch.bind(store),
            });
        } else {
            store = this;
        }

        func.call(this, store, payload);
    }
}
```

### 4 辅助函数

#### 4.1 mapState 方法

[github: mini-vuex3/src/core/helpers.ts#L52-L92](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/helpers.ts#L52-L92)

```ts
/**
 * 辅助工具 mapState
 * @returns
 */
export function mapState() {
    const { moduleName, opts } = normalizeNamespace(arguments[0], arguments[1]);
    const resFunc = {};

    // 数组内容，例如： mapState(['x1', 'x2']) 或 mapState('xxxModule', ['xxx1', 'xxx2'])
    if (Array.isArray(opts)) {
        opts.forEach((stateKey) => {
            resFunc[stateKey] = function () {
                return handleModuleType.call(this, moduleName, 'state')[stateKey];
            };
        });
    }

    // 处理对象结构
    else {
        for (const [newStateKey, val] of Object.entries<string | Function>(opts)) {
            // mapState({ xxFunc: (state) => state.xx1 }) 或  mapState({ xxFunc(state){ return state.xx1 + this.xxx1 } })
            if (typeof val === 'function') {
                resFunc[newStateKey] = function () {
                    const state = handleModuleType.call(this, moduleName, 'state');

                    // 修改this指向，处理 回调函数中使用当前vm实例中的 data 或 computed 变量
                    return val.call(this, state);
                };
            }

            // mapState({ xxxxxxx1: 'x1' }) 或 mapState('xxxModule', { xxxxxxx1: 'x1' })
            else {
                resFunc[newStateKey] = function () {
                    return handleModuleType.call(this, moduleName, 'state')[val];
                };
            }
        }
    }

    return resFunc;
}

/**
 * 格式化 参数（命名空间和数据）
 * @param namespace
 * @param map
 * @returns
 */
function normalizeNamespace(moduleName: string, opts: any) {
    // 未定义 moduleName
    if (typeof moduleName !== 'string') {
        return {
            moduleName: null,
            opts: moduleName,
        };
    }

    return {
        moduleName,
        opts,
    };
}

/**
 * 处理命名空间（module类型）
 * @param moduleName
 */
function handleModuleType(moduleName: string | null, type: string, key: string | undefined) {
    if (type === 'state') {
        return moduleName === null ? this.$store[type] : this.$store[type][moduleName];
    }

    if (key === undefined) {
        return this.$store[type];
    }

    let newKey = key;

    if (moduleName !== null) {
        newKey = moduleName + '/' + key;
    }

    return this.$store[type][newKey];
}
```

#### 4.2 mapGetters 方法

[github: mini-vuex3/src/core/helpers.ts#L94-L119](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/helpers.ts#L94-L119)

```ts
/**
 * 辅助工具 mapGetters
 * @returns
 */
export function mapGetters() {
    const { moduleName, opts } = normalizeNamespace(arguments[0], arguments[1]);
    const resFunc = {};

    // 数组内容，例如： mapGetters(['x1', 'x2']) 或 mapGetters('xxxModule', ['xxx1', 'xxx2'])
    if (Array.isArray(opts)) {
        opts.forEach((getterKey) => {
            resFunc[getterKey] = function () {
                return handleModuleType.call(this, moduleName, 'getters', getterKey);
            };
        });
    } else {
        // mapGetters({ xxxxxxx1: 'x1' }) 或 mapGetters('xxxModule', { xxxxxxx1: 'x1' })
        for (const [newGetterKey, oldGetterKey] of Object.entries<string>(opts)) {
            resFunc[newGetterKey] = function () {
                return handleModuleType.call(this, moduleName, 'getters', oldGetterKey);
            };
        }
    }

    return resFunc;
}
```

#### 4.3 mapMutations 方法

[github: mini-vuex3/src/core/helpers.ts#L121-L152](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/helpers.ts#L121-L152)

```ts
/**
 * 辅助工具 mapMutations
 * @returns
 */
export function mapMutations() {
    const { moduleName, opts } = normalizeNamespace(arguments[0], arguments[1]);
    const resFunc = {};

    // 数组内容，例如： mapMutations(['x1', 'x2']) 或 mapMutations('xxxModule', ['xxx1', 'xxx2'])
    if (Array.isArray(opts)) {
        opts.forEach((getterKey) => {
            resFunc[getterKey] = function (payload) {
                const func = handleModuleType.call(this, moduleName, '_mutations', getterKey);
                const state = handleModuleType.call(this, moduleName, 'state');

                return func(state, payload);
            };
        });
    } else {
        for (const [newGetterKey, oldGetterKey] of Object.entries<string>(opts)) {
            // mapMutations({ xxxxxxx1: 'x1' }) 或 mapMutations('xxxModule', { xxxxxxx1: 'x1' })
            resFunc[newGetterKey] = function (payload) {
                const func = handleModuleType.call(this, moduleName, '_mutations', oldGetterKey);
                const state = handleModuleType.call(this, moduleName, 'state');

                return func(state, payload);
            };
        }
    }

    return resFunc;
}
```

#### 4.4 mapActions 方法

[github: mini-vuex3/src/core/helpers.ts#L154-L200](https://github.com/2460392754/mini-project/blob/master/mini-vuex3/src/core/helpers.ts#L154-L200)

```ts
/**
 * 辅助工具 mapActions
 * @returns
 */
export function mapActions() {
    const { moduleName, opts } = normalizeNamespace(arguments[0], arguments[1]);
    const resFunc = {};

    // 数组内容，例如： mapActions(['x1', 'x2']) 或 mapActions('xxxModule', ['xxx1', 'xxx2'])
    if (Array.isArray(opts)) {
        opts.forEach((getterKey) => {
            resFunc[getterKey] = function (payload) {
                const func = handleModuleType.call(this, moduleName, '_actions', getterKey);
                let store = handleModuleStore.call(this, moduleName);

                store = Object.assign(
                    { ...store },
                    {
                        commit: this.$store.commit.bind(store),
                        dispatch: this.$store.dispatch.bind(store),
                    }
                );

                return func(store, payload);
            };
        });
    } else {
        for (const [newGetterKey, oldGetterKey] of Object.entries<string>(opts)) {
            // mapActions({ xxxxxxx1: 'x1' }) 或 mapActions('xxxModule', { xxxxxxx1: 'x1' })
            resFunc[newGetterKey] = function (payload) {
                let store = handleModuleStore.call(this, moduleName, '_actions', oldGetterKey);

                store = Object.assign(
                    { ...store },
                    {
                        commit: this.$store.commit.bind(store),
                        dispatch: this.$store.dispatch.bind(store),
                    }
                );

                console.log(store);

                return store['_actions'][oldGetterKey](store, payload);
            };
        }
    }

    return resFunc;
}
```

## 最后

手写一个 mini-vuex3 相对来说还是比较容易的，还是需要多看、多学、多写。

[#地址](#地址)
