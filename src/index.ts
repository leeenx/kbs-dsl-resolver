import * as helpers from './helpers';
import { registerToGlobleScope, createModuleScope } from './customize';
import dslResolve from './dsl-resolver';

// 注册 @babel/runtime/helpers
registerToGlobleScope({ ...helpers });

/**
 * 标准的解析器
 * 按 commonjs/commonjs2 标准打包后编译的 dsl 可以使用标准解析器
 */
export default function stdResolve(dslJson) {
  const moduleScope = createModuleScope();
  const dslList = Array.isArray(dslJson) ? dslJson : [dslJson];
  dslList.forEach(dsl => {
    // @ts-ignore
    dslResolve(dsl, moduleScope);
  });
  return moduleScope.varScope.module.exports;
}

export {
  dslResolve,
  createModuleScope,
  registerToGlobleScope
};
