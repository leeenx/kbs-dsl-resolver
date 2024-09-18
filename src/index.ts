import * as helpers from './helpers';
import {
  registerToGlobleScope,
  createModule,
  globalScope,
  registerToScope,
  getRegisteredMembers
} from './customize';
import dslResolve, { DslJson } from './dsl-resolver';

// 注册 @babel/runtime/helpers
registerToGlobleScope({ ...helpers });

const MEMO_RESOLVED_FUNCIONS: Record<string, any> = {};

/**
 * 标准的解析器
 * 按 commonjs/commonjs2 标准打包后编译的 dsl 可以使用标准解析器
 */
export default function stdResolve(
  dslJson: DslJson | DslJson[],
  nameSpace?: string,
  enableCache?: boolean,
  hotUpdateEnabel?: boolean
) {
  const currentModule = createModule(nameSpace);
  const dslList = Array.isArray(dslJson) ? dslJson : [dslJson];
  currentModule.varScope.__isHotUpdating__ = hotUpdateEnabel;

  const members = getRegisteredMembers(nameSpace!);
  const initModuleByNameSpace: Function = (() => {
    let initModule: Function | undefined  = undefined;
    if (enableCache && nameSpace) {
      initModule = MEMO_RESOLVED_FUNCIONS[nameSpace];
    }
    if (!initModule) {
      initModule = currentModule.createFunction(
        [],
        dslList,
        'initModuleByNameSpace',
        false,
        false,
        false,
        false,
        (self) => {
          // 在作用域上把 memebers 打上
          Object.assign(self.varScope, members);
        }
      );
      if (nameSpace && enableCache) {
        MEMO_RESOLVED_FUNCIONS[nameSpace] = initModule;
      }
    }
    return initModule;
  })();
  initModuleByNameSpace({ ...members })();
  currentModule.varScope.__isHotUpdating__ = false;
  return currentModule.varScope.module.exports;
}

export {
  globalScope,
  dslResolve,
  registerToScope,
  createModule,
  registerToGlobleScope
};
