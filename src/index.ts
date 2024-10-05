import * as helpers from './helpers';
import {
  registerToGlobleScope,
  createModule,
  globalScope,
  registerToScope,
  getRegisteredMembers
} from './customize';
import dslResolve, { DslJson } from './dsl-resolver';

interface StackItem {
  registeredMembers: Record<string, any>;
  moduleExports: any;
}
interface ResolvedModuleItem {
  addStackItem: (stack: StackItem[]) => void;
  stack: StackItem[];
  stackDepth: number;
  maxDepth: number;
  preResolver: Function;
};

// 解析后的缓存
const MEMO_RESOLVED_MODULE_SET: Record<string, ResolvedModuleItem> = {};

// 缓存扩容
export const increaseMemoCache = (nameSpace: string, increaseCount: number) => {
  if (increaseCount <= 0) return;
  try {
    const memoResolvedModuleInfo = MEMO_RESOLVED_MODULE_SET[nameSpace];
    if (!memoResolvedModuleInfo) {
      console.warn(`没找到 nameSpace 为 "${nameSpace}" 的解析缓存，无法扩容`);
      return ;
    }
    const { stackDepth, stack, addStackItem, maxDepth } = memoResolvedModuleInfo;
    if (stackDepth >= maxDepth) {
      console.warn(`nameSpace 为 "${nameSpace}" 的解析缓存已达到扩容上限：${maxDepth}`);
    } else {
      const depth = Math.min(stackDepth + increaseCount, maxDepth);
      const needIncreaseCount = depth - stackDepth;
      Object.assign(memoResolvedModuleInfo, { stackDepth: depth });
      for(let i = 0; i < needIncreaseCount; ++i) {
        addStackItem(stack);
      }
    }
  } catch (err) {
    console.error('解析扩容失败', err);
  }
};

// 获取当前的缓存条数
export const getMemoCacheCount = (nameSpace: string) => new Promise((resolve) => {
  let tryTimes = 10;
  const siv = setInterval(() => {
    const stackDepth = MEMO_RESOLVED_MODULE_SET[nameSpace]?.stackDepth;
    if (typeof stackDepth === 'number') {
      resolve(stackDepth);
      clearInterval(siv);
    } else if (--tryTimes <= 0) {
      clearInterval(siv);
      console.warn('获取缓存条数失败');
    }
  }, 50);
});

// 获取当前的缓存
export const getMemoCache = (nameSpace: string) => MEMO_RESOLVED_MODULE_SET[nameSpace]?.stackDepth || 0;

// 回收缓存
export const recyleMemoCache = (nameSpace: string, stackItem: StackItem) => {
  const memoResolvedModuleInfo = MEMO_RESOLVED_MODULE_SET[nameSpace];
  if (!memoResolvedModuleInfo) {
    console.warn(`没找到 nameSpace 为 "${nameSpace}" 的解析缓存，回收失败`);
    return;
  }
  const { stackDepth, stack } = memoResolvedModuleInfo;
  stack.push(stackItem);
  Object.assign(memoResolvedModuleInfo, { stackDepth: stackDepth + 1 })
};

// 注册 @babel/runtime/helpers
registerToGlobleScope({
  ...helpers,
  increaseMemoCache,
  getMemoCacheCount,
  getMemoCache,
  recyleMemoCache,
  MEMO_RESOLVED_MODULE_SET
});

/**
 * 标准的解析器
 * 按 commonjs/commonjs2 标准打包后编译的 dsl 可以使用标准解析器
 */
export default function stdResolve(
  dslJson: DslJson | DslJson[],
  nameSpace?: string,
  enableCache?: boolean,
  cacheCount: number = 2, // 缓存栈，默认两个
  getCurrentMemoCache?: (stackItem: StackItem) => void, // 返回当前的缓存
  hotUpdateEnabel: boolean = false,
) {
  console.log('----- 缓存个数', cacheCount);
  const currentModule = createModule(nameSpace);
  const dslList = Array.isArray(dslJson) ? dslJson : [dslJson];
  currentModule.varScope.__isHotUpdating__ = hotUpdateEnabel;

  const members = getRegisteredMembers(nameSpace!);
  const createPreResolver = () => currentModule.createFunction(
    [],
    dslList,
    'initModuleByNameSpace',
    false,
    false,
    false,
    false,
    (self) => {
      /**
       * 已经注册进来的方法或对象
       * 使用这种结构是利用对象的引用特性，做缓存复用
       */
      Object.assign(self.varScope, {
        __parentVarScope__: {
          ...members,
          __parentVarScope__: currentModule.varScope
        }
      });
    }
  );

  let memoResolvedModuleInfo: ResolvedModuleItem | undefined = undefined;
  // 没缓存配置，走以下方法
  const doNoCache = () => {
    /**
     * 已经注册进来的方法或对象
     * 使用这种结构是利用对象的引用特性，做缓存复用
     */
    const registeredMembers = {
      __parentVarScope__: {
        ...members,
        __parentVarScope__: currentModule.varScope
      }
    };
    const preResolver = createPreResolver();
    preResolver(registeredMembers)();
    return currentModule.varScope.module.exports;
  };
  if (enableCache && cacheCount && nameSpace) {
    memoResolvedModuleInfo = MEMO_RESOLVED_MODULE_SET[nameSpace];
    if (!memoResolvedModuleInfo) {
      // 表示没有缓存，创建缓存
      const preResolver = createPreResolver();
      const addStackItem = (stack: StackItem[]) => {
        /**
         * 已经注册进来的方法或对象
         * 使用这种结构是利用对象的引用特性，做缓存复用
         */
        const registeredMembers = {
          __parentVarScope__: {
            ...members,
            __parentVarScope__: currentModule.varScope
          }
        };
        preResolver(registeredMembers)();
        const moduleExports = currentModule.varScope.module.exports;
        stack.push({ registeredMembers, moduleExports });
      };
      memoResolvedModuleInfo = MEMO_RESOLVED_MODULE_SET[nameSpace] = {
        addStackItem,
        stack: (() => {
          const stack: StackItem[] = [];
          for(let i = 0; i < cacheCount; ++i) {
            addStackItem(stack);
          }
          return stack;
        })(),
        maxDepth: 10,
        stackDepth: cacheCount,
        preResolver
      };
      console.log('---- 新创建的缓存');
      const stackItem = memoResolvedModuleInfo.stack.pop()!;
      memoResolvedModuleInfo.stackDepth -= 1;
      getCurrentMemoCache?.(stackItem);
      return stackItem.moduleExports;
    } else if (memoResolvedModuleInfo.stack.length > 0) {
      // 有缓存可用
      console.log('----- 有缓存可用')
      memoResolvedModuleInfo.stackDepth -= 1;
      const stackItem = memoResolvedModuleInfo.stack.pop()!;
      const { moduleExports, registeredMembers } = stackItem;
      // 更新注册成员
      Object.assign(registeredMembers.__parentVarScope__, { ...members });
      getCurrentMemoCache?.(stackItem);
      console.log('----- 使用缓存', memoResolvedModuleInfo.stack.length);
      return moduleExports;
    } else {
      // 缓存用完
      console.log('---- 缓存用完');
      return doNoCache();
    }
  } else { // 不走缓存
    return doNoCache();
  }
}

export {
  globalScope,
  dslResolve,
  registerToScope,
  createModule,
  registerToGlobleScope
};
