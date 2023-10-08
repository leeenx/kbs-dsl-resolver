# kbs-dsl-resolver

kbs-dsl 的解析器。引用如下：

```javascript
import resolve, { registerToGlobleScope } from 'kbs-dsl-resolver';

```

## registerToGlobleScope 用于注册全局方法

通过 `registerToGlobleScope` 可以在解析 dsl 之前注册全局方法。这是一个既是一个扩展的接口，也是一个提升性能的接口。解析器默认会把 `@babel/runtime/helpers` 通过 `registerToGlobleScope` 注册到全局。如下：

```
import * as helper from './utils/babel-runtime-helpers';
registerToGlobleScope({
  ...helper
});
```

注意，通过 `kbs-dsl-resolver` 解析的 dsl 会共享一个顶层作用域，而这个**顶层作用域**就是本文提及的**全局**。

## resolve 方法解析标准的 dsl

使用 [kbs-dsl-maker](https://github.com/leeenx/kbs-dsl-maker) 产生的 dsl 便是标准的 dsl。如果开发者改造了「kbs-dsl-maker」将把 libaryTarget 从 `umd` 改成其它值的话，可能没办法使用此方法。

resolve 方法支持的 libaryTarget 选项为：

- umd
- commonjs
- commonjs2

使用如下：

```
import resolve from 'kbs-dsl-resolver';

const MyComponent = resolve(dslJson).default; // 使用 commonjs 打包的组件
```

## libaryTarget 取值为 var

受限于微信环境，目前 `kbs-dsl-resolver` 只支持四种 libaryTarget，即: umd, commonjs, commonjs2 和 var，其它选项需要开发者自己定制开发解决。
使用 var 选项，在解析时不能使用标准的 api，需要按以下方式解析：

```
import { dslResolve, createModuleScope } from 'kbs-dsl-resolver';

const moduleScope = createModuleScope();
const dslList = Array.isArray(dslJson) ? dslJson : [dslJson];
dslList.forEach(dsl => {
  // @ts-ignore
  dslResolve(dsl, moduleScope);
});
// 通过 moduleScope.varScope 来访问，假设 libary 取名为 app
const MyComponent = moduleScope.varScope.app;
```
