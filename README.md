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

## registerToScope 按 nameSpace 注册方法

与 `registerToGlobleScope` 不同，`registerToScope` 注册的方法或对象是非全局的，而是按 nameSpace 注册到对应的作用域（页面级的作用域）。调用语法：
```
registerToScope(nameSpace: string, member: Record<string, any>);
```
**注意，registerToScope 需要在页面初化前挂载，否则会失效**

nameSpace 可以从当前路由的中获取。


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

