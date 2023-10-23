import * as helpers from './helpers';
import {
  registerToGlobleScope,
  createModuleScope,
  globalScope,
  registerToScope
} from './customize';
import dslResolve, { DslJson } from './dsl-resolver';

// 注册 @babel/runtime/helpers
registerToGlobleScope({ ...helpers });

/**
 * 标准的解析器
 * 按 commonjs/commonjs2 标准打包后编译的 dsl 可以使用标准解析器
 */
export default function stdResolve(
  dslJson: DslJson | DslJson[],
  nameSpace?: string,
  hotUpdateEnabel?: boolean
) {
  const moduleScope = createModuleScope(nameSpace);
  const dslList = Array.isArray(dslJson) ? dslJson : [dslJson];
  moduleScope.varScope.__isHotUpdating__ = hotUpdateEnabel;
  dslList.forEach(dsl => {
    // @ts-ignore
    dslResolve(dsl, moduleScope);
  });
  moduleScope.varScope.__isHotUpdating__ = false;
  return moduleScope.varScope.module.exports;
}

export {
  globalScope,
  dslResolve,
  registerToScope,
  createModuleScope,
  registerToGlobleScope
};
