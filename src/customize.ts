import dslResolve from "./dsl-resolver";
// @ts-ignore
import * as _ from 'lodash-es';
// type
import type { DslJson } from "./dsl-resolver";

type AssignmentOperator = "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=" | "%=" | "|=" | "^=" | "&=";
type UnaryOperator = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";
type BinaryOperator = "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "in" | "instanceof";
type UpdateOperator = "++" | "--";
type LogicalOperator = "||" | "&&";

// window对象的平替
export const globalScope: Record<string, any> = {
  // 运行环境
  runingEnv: 'wx_mp',
  _, // lodash
  /**
   * 以下是微信的全局对象或方法
  */
  wx,
  performance: typeof performance !== 'undefined' ? performance : undefined,
  atob: typeof atob !== 'undefined' ? atob : undefined,
  clearInterval,
  clearTimeout,
  setInterval,
  setTimeout,
  Component,
  Behavior,
  requirePlugin,
  global: {}, // 屏蔽 global
  Page,
  App,
  getApp,
  getCurrentPages,
  /**
   * 因为打包的关系，require 会被 webpack 替换为 __webpack_require__
   * 这就意味着无法直接暴露小程序自带的 require 。考虑到 dsl 其实是运行在
   * 渲染器上的，使用 __webpack_require__ 其实是对的，但现实情况是
   * __webpack_require__(moduleId)，moduleId 一般是一个整数，而不是一
   * 个具体的名称。这个整数是 webpack 打包的过程中生成的，无法预测。而 dsl 中
   * 出现 require 必定是引用一个外部依赖，这个依赖一定是一个字符串，例如：react。
   * 外部依赖一定是挂载在 globalScope 上，所以 require 就是从 globalScope
   * 找依赖的方法
   */
  require: (deps: string) => {
    switch (deps) {
      case 'react':
      case 'React':
        return globalScope.React;
      case 'react-dom':
      case 'ReactDOM':
        return globalScope.ReactDOM;
      case 'lodash':
        return globalScope._;
      default:
        return globalScope[deps];
    }
  },
  Infinity: typeof Infinity !== 'undefined' ? Infinity : undefined,
  Array: typeof Array !== 'undefined' ? Array : undefined,
  ArrayBuffer: typeof ArrayBuffer !== 'undefined' ? ArrayBuffer : undefined,
  BigInt: typeof BigInt !== 'undefined' ? BigInt : undefined,
  Boolean: typeof Boolean !== 'undefined' ? Boolean : undefined,
  DataView: typeof DataView !== 'undefined' ? DataView : undefined,
  Date: typeof Date !== 'undefined' ? Date : undefined,
  Error: typeof Error !== 'undefined' ? Error : undefined,
  EvalError: typeof EvalError !== 'undefined' ? EvalError : undefined,
  Float32Array: typeof Float32Array !== 'undefined' ? Float32Array : undefined,
  Float64Array: typeof Float64Array !== 'undefined' ? Float64Array : undefined,
  Function: typeof Function !== 'undefined' ? Function : undefined,
  Int8Array: typeof Int8Array !== 'undefined' ? Int8Array : undefined,
  Int16Array: typeof Int16Array !== 'undefined' ? Int16Array : undefined,
  Int32Array: typeof Int32Array !== 'undefined' ? Int32Array : undefined,
  Intl: typeof Intl !== 'undefined' ? Intl : undefined,
  JSON: typeof JSON !== 'undefined' ? JSON : undefined,
  Map: typeof Map !== 'undefined' ? Map : undefined,
  Math: typeof Math !== 'undefined' ? Math : undefined,
  NaN: typeof NaN !== 'undefined' ? NaN : undefined,
  Number: typeof Number !== 'undefined' ? Number : undefined,
  Object: typeof Object !== 'undefined' ? Object : undefined,
  Promise: typeof Promise !== 'undefined' ? Promise : undefined,
  Proxy: typeof Proxy !== 'undefined' ? Proxy : undefined,
  RangeError: typeof RangeError !== 'undefined' ? RangeError : undefined,
  ReferenceError: typeof ReferenceError !== 'undefined' ? ReferenceError : undefined,
  Reflect: typeof Reflect !== 'undefined' ? Reflect : undefined,
  RegExp: typeof RegExp !== 'undefined' ? RegExp : undefined,
  Set: typeof Set !== 'undefined' ? Set : undefined,
  String: typeof String !== 'undefined' ? String : undefined,
  Symbol: typeof Symbol !== 'undefined' ? Symbol : undefined,
  SyntaxError: typeof SyntaxError !== 'undefined' ? SyntaxError : undefined,
  TextDecoder: typeof TextDecoder !== 'undefined' ? TextDecoder : undefined,
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : undefined,
  TypeError: typeof TypeError !== 'undefined' ? TypeError : undefined,
  URIError: typeof URIError !== 'undefined' ? URIError : undefined,
  URL: typeof URL !== 'undefined' ? URL : undefined,
  Uint8Array: typeof Uint8Array !== 'undefined' ? Uint8Array : undefined,
  Uint8ClampedArray: typeof Uint8ClampedArray !== 'undefined' ? Uint8ClampedArray : undefined,
  Uint16Array: typeof Uint16Array !== 'undefined' ? Uint16Array : undefined,
  Uint32Array: typeof Uint32Array !== 'undefined' ? Uint32Array : undefined,
  WeakMap: typeof WeakMap !== 'undefined' ? WeakMap : undefined,
  WeakSet: typeof WeakSet !== 'undefined' ? WeakSet : undefined,
  console: typeof console !== 'undefined' ? console : undefined,
  decodeURI: typeof decodeURI !== 'undefined' ? decodeURI : undefined,
  decodeURIComponent: typeof decodeURIComponent !== 'undefined' ? decodeURIComponent : undefined,
  encodeURI: typeof encodeURI !== 'undefined' ? encodeURI : undefined,
  encodeURIComponent: typeof encodeURIComponent !== 'undefined' ? encodeURIComponent : undefined,
  escape: typeof escape !== 'undefined' ? escape : undefined,
  eval: typeof eval !== 'undefined' ? eval : undefined,
  globalThis: typeof globalThis !== 'undefined' ? globalThis : undefined,
  isFinite: typeof isFinite !== 'undefined' ? isFinite : undefined,
  isNaN: typeof isNaN !== 'undefined' ? isNaN : undefined,
  parseFloat: typeof parseFloat !== 'undefined' ? parseFloat : undefined,
  parseInt: typeof parseInt !== 'undefined' ? parseInt : undefined,
  unescape: typeof unescape !== 'undefined' ? unescape : undefined,
  undefined
};

// 执行的作用域栈
const execScopeStack: Customize["varScope"][] = [];

let scopeId = 0;

// 自定义的方法
export default class Customize {
  constructor(parentVarScope?: any) {
    Object.defineProperty(this.varScope, '__parentVarScope__', {
      value: parentVarScope || globalScope,
      writable: true
    });
    // sort-hand
    const resolveFunKeysMap = [
      ['const', 'co'],
      ['getValue', 'gV'],
      ['let', 'l'],
      ['var', 'v'],
      // ['batchConst', 'bC'],
      ['batchLet', 'bL'],
      ['batchVar', 'bV'],
      ['batchDeclaration', 'bD'],
      ['getConst', 'gC'],
      ['getLet', 'gL'],
      ['getVar', 'gVar'],
      ['getArg', 'gA'],
      ['getObjMember', 'gOM'],
      ['getOrAssignOrDissocPath', 'gADP'],
      ['assignLet', 'aL'],
      ['setLet', 'sL'],
      ['callReturn', 'cR'],
      ['callBreak', 'cBr'],
      ['callContinute', 'cCo'],
      ['callUnary', 'cU'],
      ['callBinary', 'cB'],
      ['callUpdate', 'cUp'],
      ['callLogical', 'cL'],
      ['callThrow', 'cT'],
      ['callWhile', 'cW'],
      ['callDoWhile', 'cDW'],
      ['callFor', 'cF'],
      ['callForIn', 'cFI'],
      ['createFunction', 'f'],
      ['callBlockStatement', 'cBS'],
      ['callIfElse', 'cIE'],
      ['callConditional', 'cC'],
      ['getRegExp', 'gRE'],
      ['newClass', 'nC'],
      ['callFun', 'c'],
      ['callTryCatch', 'cTC'],
      ['callSwitch', 's'],
      ['callSequence', 'cS'],
      ['addLabel', 'addL'],
      ['removeLabel', 'rL']
    ];
    resolveFunKeysMap.forEach(([key, sortKey]) => {
      this[sortKey] = this[key];
    });
    // 生成 scopeId
    this.varScope.$$__scope_id__$$ = ++scopeId;
  }
  varScope: any = {
    __returnObject__: null,
    __isBreak__: false,
    __isContinute__: false,
    __isHotUpdating__: false, // 热更新中变量
    __labels__: [], // 标记语句栈
    __label__: '', // 当前 break 或 continue 指向的 label
    __hasBreakStatement__: false, // 是否有 break 语句（预解析过程需要用到它来提高最后的执行速度）
    __hasContinueStatement__: false, // 是否有 continue 语句（预解析过程需要用到它来提高最后的执行速度）
    __hasReturnStatement__: false, // 是否有 return 语句（预解析过程需要用到它来提高最后的执行速度）
    __containFunction__: false, // 是否包含定义子函数（预解析过程需要用到它来提高最后的执行速度）
  };
  checkMemberExpression(dsl: DslJson) {
    return dsl.t === 'm' || dsl.type === 'member';
  }
  getMemberExpressionValue(dsl: DslJson) {
    const memberExpressionValue = (dsl.v || dsl.value) as DslJson[];
    return memberExpressionValue;
  }
  // 获取值
  getValue(valueDsl: DslJson, ignoreBind = true, returnParent?: Function) {
    const isMemberExpression = this.checkMemberExpression(valueDsl);
    return !isMemberExpression ? dslResolve(valueDsl, this) : this.getObjMember(valueDsl, ignoreBind, returnParent);
  }
  updateVarScope(currentVarScope) {
    const lastIndex = execScopeStack.length - 1;
    if (lastIndex >= 0) {
      // 表示有父级作用域
      const parentScope = execScopeStack[lastIndex];
      Object.defineProperty(currentVarScope, '__parentVarScope__', {
        value: parentScope,
        writable: true
      });
      return true;
    }
    return false;
  }
  // let
  let(key: string, valueDsl?: DslJson, isVarKind: boolean = false, onlyDeclare: boolean = false) {
    const varScope = this.varScope;
    if (_.has(varScope, key)) {
      if (isVarKind) {
          const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
          const that = this;
          // 空声明
          if (onlyDeclare && !valueDsl) {
            return function() {
              if (arguments.length) that.varScope[key] = arguments[0];
            };
          }
          return function () {
            const currentVarScope = that.varScope;
            const value = arguments.length ? arguments[0] : preGetValue();
            currentVarScope[key] = value;
          };
      } else {
        return () => {
          const errMsg = `Uncaught SyntaxError: Identifier "${key}" has already been declared`;
          throw new Error(errMsg);
        };
      }
    } else {
      // 预解析的关键，声明变量打上
      Object.defineProperty(varScope, key, {
        writable: true,
        enumerable: true
      });
      const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
      if (!_.isFunction(preGetValue)) {
        console.log('========let error', {valueDsl, preGetValue});
      }
      return (realValue?: any) => {
        const value = valueDsl ? preGetValue() : realValue;
        this.varScope[key] = value;
      };
    }
  }
  // var
  var(key: string, valueDsl?: DslJson, onlyDeclare: boolean = false) {
    return this.let(key, valueDsl, true, onlyDeclare);
  }
  batchVar(list: { key: string, value: any, k?: string, v?: any }[]) {
    const varCalls = list.map((item) => {
      const { key, value, k, v } = item;
      const onlyDeclare = key ? !_.has(item, 'value') : !_.has(item, 'v');
      return key ? this.var(key, value, onlyDeclare) : this.var(k!, v, onlyDeclare)
    });
    return function() {
      const args = arguments;
      return varCalls.forEach(varCall => {
        const result = args.length ? varCall(args[0]) : varCall();
        return result;
      });
    };
  }
  batchLet(list: { key: string, value: any }[]) {
    return this.batchVar(list);
  }
  batchDeclaration(kind: 'var' | 'let' | 'const', list: { key: string, value: any }[]) {
    switch(kind) {
      case "var":
        return this.batchVar(list);
      case "let":
        return this.batchLet(list);
    }
  }
  // 取值
  getConst(key: string) {
    let varScope = this.varScope;
    const keyPath: string[] = [];
    do {
      if (_.has(varScope, key)) {
        break;
      }
      varScope = varScope.__parentVarScope__;
      keyPath.push('__parentVarScope__');
    } while(Boolean(varScope));

    // 找不到作用域，直接返回 undefined
    if (!varScope) {
      return () => undefined;
    }

    if(!keyPath.length) {
      return () => this.varScope[key];
    } else if (varScope === globalScope) {
      return () => globalScope[key];
    } else {
      return () => _.get(this.varScope, keyPath)[key];
    }
  }
  getLet(key: string) {
    return this.getConst(key);
  }
  getVar(key: string) {
    return this.getConst(key);
  }
  // 获取形参 ---- 等同于 getLet
  getArg(key: string) {
    return this.getLet(key);
  }
  // 获取对象的成员
  getObjMember(memberDsl: DslJson, ignoreBind = true, returnParent?: Function) {
    const keyPathOfDsl = this.getMemberExpressionValue(memberDsl);
    return this.getOrAssignOrDissocPath(keyPathOfDsl, undefined, undefined, 'get', ignoreBind, returnParent);
  }
  // 取值、赋值与删除对象成员 
  getOrAssignOrDissocPath(
    keyPathOfDsl: (string | DslJson)[],
    valueDsl?: DslJson,
    operator?: AssignmentOperator,
    type: 'get' | 'parentAndLastKey' | 'assign' | 'dissocPath' = 'get',
    ignoreBind: boolean = true,
    returnParent?: Function
  ) {
    if (!keyPathOfDsl.length) {
      return () => {
        throw new Error(`赋值失败: keyPathOfDsl为空数组`);
      };
    }
    const keyPathCalls = keyPathOfDsl.map((item, index) => {
      if (_.isString(item) || _.isNumber(item)) return () => item;
      const { t, type } = item as DslJson;
      // 字面量特殊处理
      if (index > 0 && (t === 'l' || type === 'literal')) {
        const valueKey = t === 'l' ? 'v' : 'value';
        const value = item[valueKey];
        keyPathOfDsl[index] = value;
        return () => value;
      }
      return dslResolve(item, this, false, false);
    }) as any[];
    // 表示对象的根名称
    const [firstKeyCall] = keyPathCalls;
    const [firstDsl] = keyPathOfDsl;
    // 是否为 Identifier
    const isIdentifier = _.isString(firstDsl);

    if (!isIdentifier) {
      // 非 Identifier
      keyPathCalls.shift(); // 去除第一个元素
    }
    const parentKeyPathCalls = [...keyPathCalls];
    const lastKeyCall = parentKeyPathCalls.pop();

    const parentLen = parentKeyPathCalls.length;
    let lastKeyIsSimple = true;
    const isSimple = keyPathOfDsl.every((item, index) => {
      const result = _.isString(item) || _.isNumber(item);
      if (index === keyPathOfDsl.length - 1) {
        lastKeyIsSimple = result;
        return true;
      }
      return result;
    });

    // 获取目标作用域
    let getTargetScope: any | null = null;
    if (!isIdentifier) {
      // 根非 Identifier
      getTargetScope = firstKeyCall;
    } else {
      const firstKey = firstKeyCall();
      if (_.hasIn(this.varScope, firstKey)) {
        // 当前作用域下
        getTargetScope = () => this.varScope;
      } else {
        // 当前作用域找不到，往上找
        let parent = this.varScope.__parentVarScope__;
        const parentKeyPath = ['__parentVarScope__'];
        while(Boolean(parent)) {
          if (_.hasIn(parent, firstKey)) { // 找到作用域
            if (parent === globalScope) {
              getTargetScope = () => globalScope;
            } else {
              switch (parentKeyPath.length) {
                case 1:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__;
                  };
                  break;
                case 2:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 3:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 4:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 5:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 6:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 7:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 8:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 9:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 10:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 11:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                case 12:
                  getTargetScope = () => {
                    return this.varScope.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__.__parentVarScope__;
                  };
                  break;
                default:
                  console.log('parentKeyPath 超过10', parentKeyPath.length);
                  getTargetScope = () => {
                    return _.get(this.varScope, parentKeyPath);
                  };
                  break;
              }
            }
            break;
          }
          parent = parent.__parentVarScope__;
          parentKeyPath.push('__parentVarScope__');
        }
      }
    }
    if (getTargetScope !== null) {
      const getParent = (targetScope, parentKeyPath) => {
        return parentLen ? _.get(targetScope, parentKeyPath) : targetScope;
      };
      const getParentKeyPath = () => {
        const parentKeyPath: any[] = [];
        for(let i = 0; i < parentLen; ++i) {
          parentKeyPath[i] = parentKeyPathCalls[i]();
        }
        return parentKeyPath;
      };
      if (_.isFunction(returnParent)) {
        returnParent!(() => {
          const targetScope = getTargetScope();
          const parentKeyPath = getParentKeyPath();
          const parent = getParent(targetScope, parentKeyPath);
          return parent;
        });
      }
      
      if (type === 'assign') {
        const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
        const getResult = this.getResultByOperator(operator);
        if (keyPathOfDsl.length === 1) {
          const key = firstDsl as string;
          return function() {
            const targetScope = getTargetScope();
            const value = arguments.length ? arguments[0] : preGetValue();
            return targetScope[key] = getResult(targetScope[key], value);
          }
        } else if(isSimple) {
          const parentKeyPath = [...keyPathOfDsl];
          const lastDsl = parentKeyPath.pop() as string;
          const getLastKey = () => lastKeyIsSimple ? lastDsl : lastKeyCall();
          // 极简模式
          return function() {
            const lastKey = getLastKey();
            const targetScope = getTargetScope();
            const parent = getParent(targetScope, parentKeyPath);
            const value = arguments.length ? arguments[0] : preGetValue();
            return parent[lastKey] = getResult(parent[lastKey], value);
          };
        }
        return function() {
          const targetScope = getTargetScope();
          const parentKeyPath = getParentKeyPath();
          if (!parentKeyPath.length || _.hasIn(targetScope, parentKeyPath)) {
            // 执行赋值
            const lastKey = lastKeyCall();
            const keyPath = parentKeyPath.concat([lastKey]);
            const parent = getParent(targetScope, parentKeyPath);
            // 要在 lastKey 之后调用 preGetValue
            const value = arguments.length ? arguments[0] : preGetValue();
            const result = getResult(_.get(targetScope, keyPath), value);
            return parent[lastKey!] = result;
          }
        };
      } else if (type === 'dissocPath') {
        // 删除指定属性
        return () => {
          const targetScope = getTargetScope();
          const parentKeyPath = getParentKeyPath();
          const parent = getParent(targetScope, parentKeyPath);
          const lastKey = lastKeyCall();
          if (!parentKeyPath.length || _.hasIn(parent, lastKey)) {
            delete parent[lastKey!];
          }
        };
      } else if (type === 'get' || type === 'parentAndLastKey') {
        if (keyPathOfDsl.length === 1) {
          // Identifier 模式
          if (type === 'parentAndLastKey') {
            return () => {
              const targetScope = getTargetScope();
              const lastKey = lastKeyCall ? lastKeyCall() : undefined;
              return { parent: targetScope, lastKey };
            };
          }
          return () => {
            const targetScope = getTargetScope();
            const lastKey = lastKeyCall();
            return targetScope[lastKey];
          };
        } else if (isSimple) {
          // 简单模式
          const parentKeyPath = [...keyPathOfDsl];
          const lastDsl = parentKeyPath.pop() as string;
          const getLastKey = () => lastKeyIsSimple ? lastDsl : lastKeyCall();
          if (type === 'parentAndLastKey') {
            return () => {
              const targetScope = getTargetScope();
              const parent = _.get(targetScope, parentKeyPath);
              return { parent, lastKey: getLastKey() };
            };
          }
          const [one, two, three, four] = keyPathOfDsl as string[];
          switch(keyPathOfDsl.length) {
            case 2:
              return () => {
                const targetScope = getTargetScope();
                return targetScope[one][getLastKey()];
              };
            case 3:
              return () => {
                const targetScope = getTargetScope();
                return targetScope[one][two][getLastKey()];
              };
            case 4:
              return () => {
                const targetScope = getTargetScope();
                return targetScope[one][two][three][getLastKey()];
              };
            case 5:
              return () => {
                const targetScope = getTargetScope();
                return targetScope[one][two][three][four][getLastKey()];
              };
            default:
              return () => {
                const targetScope = getTargetScope();
                return _.get(targetScope, keyPathOfDsl);;
              };
          }
        }
        // 完全模式
        if (type === 'parentAndLastKey') {
          return () => {
            const targetScope = getTargetScope();
            const parentKeyPath = getParentKeyPath();
            const lastKey = lastKeyCall();
            const parent = getParent(targetScope, parentKeyPath);
            return { parent, lastKey };
          }
        }
        return () => {
          const targetScope = getTargetScope();
          const parentKeyPath = getParentKeyPath();
          const lastKey = lastKeyCall();
          const keyPath = parentKeyPath.concat([lastKey]);
          const parent = getParent(targetScope, parentKeyPath);
          if (!_.isNil(parent)) {
            // keyPath 找得到，返回结果
            // return _.get(targetScope, keyPath);
            return parent[lastKey];
          }
          if (_.isUndefined(parent)) {
            console.log('TypeError', { keyPathOfDsl, keyPath, targetScope });
            throw new Error(`TypeError: Cannot read property '${lastKey}' of undefine`);
          } else if (_.isNull(parent)) {
            throw new Error(`TypeError: Cannot read property '${lastKey}' of null`);
          }
        }
      }
    } else {
      // 执行到这里，表示出错了
      if (type === 'assign') {
        const keyPath = keyPathCalls.map(keyCall => keyCall());
        return () => {
          throw new Error(`赋值失败：keyPath - ${keyPath} 找不到`);
        };
      }
      const parentKeyPath = parentKeyPathCalls.map(parentKeyCall => parentKeyCall());
      return () => {
        console.log('keyPathOfDsl', {keyPathOfDsl, lastKeyCall, isIdentifier});
        const lastKey = lastKeyCall();
        throw new Error(`对象${parentKeyPath.join('.')}不存在成员：${lastKey}`);
      };
    }
  }
  assignLet(keyDsl: DslJson, valueDsl?: DslJson, operator?: AssignmentOperator) {
    const keyPathOfDsl = this.checkMemberExpression(keyDsl) ? this.getMemberExpressionValue(keyDsl) : [keyDsl];
    return this.getOrAssignOrDissocPath(keyPathOfDsl, valueDsl, operator, 'assign');
  }
  // 按操作符赋值
  getResultByOperator(operator: AssignmentOperator = '=') {
    switch(operator) {
      case "=":
        return (leftValue: any, rightValue: any) => rightValue;
      case "+=":
        return (leftValue: any, rightValue: any) => leftValue + rightValue;
      case "-=":
        return (leftValue: any, rightValue: any) => leftValue - rightValue;
      case "*=":
        return (leftValue: any, rightValue: any) => leftValue * rightValue;
      case "/=":
        return (leftValue: any, rightValue: any) => leftValue / rightValue;
      case "%=":
        return (leftValue: any, rightValue: any) => leftValue % rightValue;
      case "<<=":
        return (leftValue: any, rightValue: any) => leftValue << rightValue;
      case ">>=":
        return (leftValue: any, rightValue: any) => leftValue >> rightValue;
      case ">>>=":
        return (leftValue: any, rightValue: any) => leftValue >>> rightValue;
      case "%=":
        return (leftValue: any, rightValue: any) => leftValue % rightValue;
      case "|=":
        return (leftValue: any, rightValue: any) => leftValue | rightValue;
      case "^=":
        return (leftValue: any, rightValue: any) => leftValue ^ rightValue;
      case "&=":
        return (leftValue: any, rightValue: any) => leftValue & rightValue;
      default:
        return _.noop;
    }
  }
  // 返回值
  callReturn(dslJson: DslJson) {
    this.varScope.__hasReturnStatement__ = true;
    // 标记已经返回
    const preGetValue = dslJson ? this.getValue(dslJson) : _.noop;
    return () => {
      const result = preGetValue();
      this.varScope.__returnObject__ = {
        result
      }
    };
  }
  // break
  callBreak(label?: string) {
    this.varScope.__hasBreakStatement__ = true;
    if (label) {
      if (!this.varScope.__labels__.includes(label)) {
        // 表示找不到对应的 label
        return () => {
          throw new Error(`Uncaught SyntaxError: Undefined label '${label}'`);
        };
      }
      return () => {
        this.varScope.__label__ = label;
        this.varScope.__isBreak__ = true;
      };
    } else {
      return () => {
        this.varScope.__isBreak__ = true;
      };
    }
  }
  // continute
  callContinute(label?: string) {
    this.varScope.__hasContinueStatement__ = true;
    if (label) {
      if (!this.varScope.__labels__.includes(label)) {
        // 表示找不到对应的 label
        return () => {
          throw new Error(`Uncaught SyntaxError: Undefined label '${label}'`);
        };
      }
      return () => {
        this.varScope.__label__ = label;
        this.varScope.__isContinute__ = true;
      };
    } else {
      return () => {
        this.varScope.__isContinute__ = true;
      };
    }
  }
  // 一元运算
  callUnary(operator: UnaryOperator, valueDsl: DslJson) {
    const isMemberExpression = this.checkMemberExpression(valueDsl);
    const preGetValue = this.getValue(valueDsl);
    switch(operator) {
      case "-":
        return () => -preGetValue();
      case "+":
        return () => +preGetValue();
      case "!":
        return () => !preGetValue();
      case "~":
        return () => ~preGetValue();
      case "typeof":
        return () => typeof preGetValue();
      case "void":
        return () => void preGetValue();
      case "delete":
        if (isMemberExpression) {
          const doDelete: any = this.getOrAssignOrDissocPath(this.getMemberExpressionValue(valueDsl), undefined, undefined, 'dissocPath');
          return () => doDelete();
        }
        // 不会报错，但是不会删除成员
        return () => false;
      default:
        return () => {
          throw new Error(`未知的一元运算符：${operator}`);
        };
    }
  }
  // 二元运算
  callBinary(leftDsl: DslJson, operator: BinaryOperator, rightDsl: DslJson) {
    const getLeft = this.getValue(leftDsl);
    const getRight = this.getValue(rightDsl);
    switch(operator) {
      case "==":
        return () => getLeft() == getRight();
      case "!=":
        return () => getLeft() != getRight();
      case "===":
        return () => getLeft() === getRight();
      case "!==":
        return () => getLeft() !== getRight();
      case "<":
        return () => getLeft() < getRight();
      case "<=":
        return () => getLeft() <= getRight();
      case ">":
        return () => getLeft() > getRight();
      case ">=":
        return () => getLeft() >= getRight();
      case "<<":
        return () => getLeft() << getRight();
      case ">>":
        return () => getLeft() >> getRight();
      case ">>>":
        return () => getLeft() >>> getRight();
      case "+":
        return () => getLeft() + getRight();
      case "-":
        return () => getLeft() - getRight();
      case "*":
        return () => getLeft() * getRight();
      case "/":
        return () => getLeft() / getRight();
      case "%":
        return () => getLeft() % getRight();
      case "|":
        return () => getLeft() | getRight();
      case "^":
        return () => getLeft() ^ getRight();
      case "&":
        return () => getLeft() & getRight();
      case "in":
        return () => getLeft() in getRight();
      case "instanceof":
        return () => getLeft() instanceof getRight();
      default:
        return () => {
          throw new Error(`未知的二元运算符：${operator}`);
        };
    }
  }
  // 更新
  callUpdate(operator: UpdateOperator, argument: DslJson, prefix: boolean) {
    const keyPathDsl = this.checkMemberExpression(argument) ? this.getMemberExpressionValue(argument) : [argument];
    const getParentAndLastKey = this.getOrAssignOrDissocPath(keyPathDsl, undefined, undefined, 'parentAndLastKey') as Function;
    switch(true) {
      case prefix && operator === '++':
        return () => {
          const { parent, lastKey } = getParentAndLastKey();
          return ++parent[lastKey];
        }
      case prefix && operator === '--':
        return () => {
          const { parent, lastKey } = getParentAndLastKey();
          return --parent[lastKey];
        }
      case !prefix && operator === '++':
        return () => {
          const { parent, lastKey } = getParentAndLastKey();
          return parent[lastKey]++;
        };
      case !prefix && operator === '--':
        return () => {
          const { parent, lastKey } = getParentAndLastKey();
          return parent[lastKey]--;
        };
    }
  }
  // 逻辑运算
  callLogical(leftDsl: DslJson, operator: LogicalOperator, rightDsl: DslJson) {
    const getLeft = this.getValue(leftDsl);
    const getRight = this.getValue(rightDsl);
    switch(operator) {
      case "||":
        return () => getLeft() || getRight();
      case "&&":
        return () => getLeft() && getRight();
    }
  }
  // 抛锚
  callThrow(argument: DslJson) {
    const preGetValue = this.getValue(argument);
    return () => {
      throw preGetValue();
    };
  }
  // while
  callWhile(test: DslJson, body: DslJson) {
    const testCall = this.getValue(test);
    const resolveCall = body ? dslResolve(body, this, true) : _.noop;
    return () => {
      const currentVarScope = this.varScope;
      while(testCall()) {
        resolveCall();
        if (currentVarScope.__isBreak__) {
          currentVarScope.__isBreak__ = currentVarScope.__keepBreaking__;
          break;
        }
        if (currentVarScope.__returnObject__) {
          // 遇到 return 语句
          break;
        }
        if (currentVarScope.__isContinute__) {
          currentVarScope.__isContinute__ = currentVarScope.__keepContinue__;
          continue;
        }
      }
    };
  }

  // doWhile
  callDoWhile(test: DslJson, body: DslJson) {
    const resolveCall = body ? dslResolve(body, this, true) : _.noop;
    const callWhile = this.callWhile(test, body);
    return () => {
      const currentVarScope = this.varScope;
      resolveCall();
      if (currentVarScope.__isBreak__) {
        currentVarScope.__isBreak__ = currentVarScope.__keepBreaking__;
      } else if (!currentVarScope.__returnObject__) {
        callWhile();
      }
    };
  }

  // for
  callFor(
    init: DslJson,
    test: DslJson,
    update,
    body
  ) {
    const resolveInit = init ? dslResolve(init, this) : _.noop;
    const resolveTest = test ? this.getValue(test) : () => true;
    const resolveUpdate = update ? dslResolve(update, this) : _.noop;
    
    const resolveBody = body ? dslResolve(body, this, true) : _.noop;
    return () => {
      const currentVarScope = this.varScope;
      for(resolveInit(); resolveTest(); resolveUpdate()) {
        resolveBody();
        if (currentVarScope.__isBreak__) {
          currentVarScope.__isBreak__ = currentVarScope.__keepBreaking__;
          break;
        }
        if (currentVarScope.__returnObject__) {
          // 遇到 return 语句
          break;
        }
        if (currentVarScope.__isContinute__) {
          currentVarScope.__isContinute__ = currentVarScope.__keepContinue__;
          continue;
        }
      }
    };
  }

  // for...in
  callForIn(leftDsl: DslJson, rightDsl: DslJson, body: DslJson) {
    const getTargetObj = this.getValue(rightDsl);
    const isMemberExpression = this.checkMemberExpression(leftDsl);
    let resolveLeft: any = _.noop;

    if (isMemberExpression) {
      // 赋值表达式
      resolveLeft = this.assignLet(leftDsl);
    } else {
      const dsl = leftDsl as DslJson;
      const leftDslValue = dsl.v || dsl.value;
      if (leftDslValue?.[1]?.[0]) {
        // 声明语句
        resolveLeft = this.batchVar(leftDslValue[1]);
      }
    }
    const resolveBody = dslResolve(body, this, true);

    return () => {
      const currentVarScope = this.varScope;
      const targetObj = getTargetObj();
      for(const item in targetObj) {
        resolveLeft(item);
        resolveBody();
        if (currentVarScope.__isBreak__) {
          currentVarScope.__isBreak__ = currentVarScope.__keepBreaking__;
          break;
        }
        if (currentVarScope.__returnObject__) {
          // 遇到 return 语句
          break;
        }
        if (currentVarScope.__isContinute__) {
          currentVarScope.__isContinute__ = currentVarScope.__keepContinue__;
          continue;
        }
      }
    };
  }

  // 创建拟函数
  createFunction(
    params: string[],
    body: DslJson[],
    functionName?: string,
    isBlockStatement = false,
    supportBreak = false,
    supportContinue = false,
    isDeclaration = false
  ) {
    const parentVarScope = this.varScope;
    // 预解析使用的 customize
    const customize = isBlockStatement ? this : new Customize(parentVarScope);

    // 以下用于定位错位信息
    customize.varScope.$$__body__$$ = body;
    customize.varScope.$$__params__$$ = params;

    let setArguments: any = _.noop;
    let setThis: any = _.noop;

    // 初始化实参
    if (!isBlockStatement) {
      // 在函数上下文挂载 arguments，但是不赋值
      setArguments = customize.var('arguments');
      // 在函数上下文中挂载 this，但是不赋值
      setThis = customize.var('this');
      // 标记有子函数
      parentVarScope.__containFunction__ = true;
    }

    // 初始化形参
    const initParams = (() => {
      params.forEach((name, index) => {
        /**
         * 形参用 var 不用 const & let
         * 值必须使用 DSL 格式
         */
        return customize.var(name!);
      });
      return (args) => {
        // paramItemInitList.forEach(itemInit => itemInit());
        params.forEach((name, index) => {
          customize.varScope[name] = args[index];
        });
      };
    })();

    // 变量声明
    if (functionName) {
      Object.assign(customize.varScope, { [functionName]: undefined });
    }

    // 空块
    if (isBlockStatement && body.length === 0) {
      return () => _.noop;
    }

    // 空函数
    if (!isBlockStatement && body.length === 1) {
      const empty = function() {};
      if (functionName && isDeclaration) {
        Object.assign(this.varScope, { [functionName]: empty });
      }
      // 这里不能返回 _.noop，必须是返回一个新函数
      return () => empty;
    }

    // 函数声明上提
    body.forEach(item => {
      if (item.t === 'd' || item.type === 'declare-function') {
        const functionName = item.n || item.name;
        if (functionName) {
          Object.assign(customize.varScope, { [functionName]: undefined });
        }
      }
    });

    // 当前的 label 名
    const currentLabel = customize.varScope.__tmpLabel__;
    if (currentLabel) {
      delete customize.varScope.__tmpLabel__;
    }

    let hasBreakStatement = false;
    let hasContinueStatement = false;
    let hasReturnStatement = false;

    // body 预解析
    const lines = body.map(item => {
      if (!item) return _.noop;
      const execLine = dslResolve(item, customize);
      if(customize.varScope.__hasBreakStatement__) {
        hasBreakStatement = true;
        customize.varScope.__hasBreakStatement__ = false; // 重置为 false，防止干扰其它 block
      } else if (customize.varScope.__hasContinueStatement__) {
        hasContinueStatement = true;
        customize.varScope.__hasContinueStatement__ = false; // 重置为 false，防止干扰其它 block
      } else if(customize.varScope.__hasReturnStatement__) {
        hasReturnStatement = true;
        customize.varScope.__hasReturnStatement__ = false; // 重置为 false，防止干扰其它 block
      }
      return execLine;
    });

    if (!isBlockStatement) {
      lines.shift();
    }

    // 重新标记
    customize.varScope.__hasBreakStatement__ = hasBreakStatement;
    customize.varScope.__hasContinueStatement__ = hasContinueStatement;
    customize.varScope.__hasReturnStatement__ = hasReturnStatement;

    const containFunction = customize.varScope.__containFunction__;

    if (isBlockStatement) { // 块
      let execBlock: Function;
      if (!hasBreakStatement && !hasContinueStatement) {
        if (!hasReturnStatement) {
          execBlock = function() {
            lines.forEach((execLine) => {
              execLine();
            });
          };
        } else {
          execBlock = function() {
            lines.some((execLine) => {
              const currentVarScope = customize.varScope;
              execLine();
              if (currentVarScope.__returnObject__) return true;
              return false;
            });
          };
        }
      } else {
        execBlock = function () {
          const currentVarScope = customize.varScope;
          const storeSupportBreak = currentVarScope.__supportBreak__;
          if (supportBreak) {
            currentVarScope.__supportBreak__ = true;
          }
          const storeSupportContinue = currentVarScope.__supportContine__;
          if (supportContinue) {
            currentVarScope.__supportContine__ = true;
          }
          lines.some((execLine) => {
            execLine();
            if (currentVarScope.__returnObject__) return true;
            const hasLabel = Boolean(currentVarScope.__label__);
            const keep = hasLabel && currentVarScope.__label__ !== currentLabel;
            if (currentVarScope.__isBreak__) {
              if (currentVarScope.__supportBreak__) {
                currentVarScope.__keepBreaking__ = keep;
                if (hasLabel && !keep) {
                  currentVarScope.__label__ = '';
                }
                return true;
              }
              throw new Error('Uncaught SyntaxError: Illegal break statement');
            } else if (currentVarScope.__isContinute__) {
              if (currentVarScope.__supportContine__) {
                currentVarScope.__keepContinue__ = keep;
                return true;
              }
              throw new Error('Uncaught SyntaxError: Illegal continute statement');
            }
            return false;
          });
          currentVarScope.__supportBreak__ = storeSupportBreak;
          currentVarScope.__supportContine__ = storeSupportContinue;
        };
      }
      return () => execBlock();
    } else { // 函数
      let FreshVarScope;
      // 执行函数
      function execFunction () {
        const prevVarScope = customize.varScope;
        // 重置 varScope
        const currentVarScope = new FreshVarScope();
        customize.varScope = currentVarScope;

        // 在函数上下文挂载 arguments
        setArguments(arguments);
        // 在函数上下文中挂载 this
        setThis(this || globalScope);
        initParams(arguments);

        // 执行作用域入栈
        containFunction && execScopeStack.push(currentVarScope);
        try {
          // 直接返回
          lines.some((execLine) => {
            execLine();
            if (currentVarScope.__returnObject__) { // 表示的返回
              // 直接中断返回
              return true;
            }
            return false;
          });
        } finally {
          // 执行作用域出栈
          containFunction && execScopeStack.pop();
          customize.varScope = prevVarScope; // 防止函数调用自身带来作用域干扰
      
          if (currentVarScope.__returnObject__) {
            const result = currentVarScope.__returnObject__.result;
            currentVarScope.__returnObject__ = null;
            return result;
          }
        }
      };
      const initVarScope = customize.varScope;
      return () => {
        // 相当于初始化函数
        const varScope = { ...initVarScope };
        if (!this.updateVarScope(varScope)) {
          // 默认父级作用域
          Object.defineProperty(varScope, '__parentVarScope__', {
            value: customize.varScope.__parentVarScope__,
            writable: true
          });
        }
        const varScopeConstructor = function() {};
        varScopeConstructor.prototype = varScope;

        const anonymousFn = function () {
          FreshVarScope = varScopeConstructor;
          return execFunction.apply(this, arguments);
        }
        if (functionName) {
          // 添加函数名
          Object.defineProperty(anonymousFn, 'name', {value: functionName, writable: false, configurable: true } );
          // 在函数体内的作用域添加 functionName
          Object.assign(varScope, { [functionName]: anonymousFn });
          // 声明语句
          if (isDeclaration) {
            Object.assign(this.varScope, { [functionName]: anonymousFn })
          }
        }
        return anonymousFn;
      };
    }
  }
  // 创建块作用域
  callBlockStatement(body: DslJson[], supportBreak = false, supportContinue = false) {
    return this.createFunction(
      [],
      body,
      undefined,
      true,
      supportBreak,
      supportContinue
    );
  }
  // ifElse 函数改造
  callIfElse(conditionDsl: DslJson, onTrue: DslJson, onFail: DslJson) {
    const getCondition = this.getValue(conditionDsl);
    const resolveTrue = dslResolve(onTrue, this);
    const resolveFail = onFail ? dslResolve(onFail, this) : _.noop;
    return () => {
      getCondition() ? resolveTrue() : resolveFail();
    };
  }
  // 三元运算
  callConditional(conditionDsl: DslJson, onTrueDsl: DslJson, onFailDsl: DslJson) {
    const getCondition = this.getValue(conditionDsl);
    const getTrue = this.getValue(onTrueDsl);
    const getFail = this.getValue(onFailDsl);
    return () => {
      const condition = getCondition();
      return condition ? getTrue() : getFail();
    };
  }
  // new RegExp
  getRegExp(pattern: string, modifiers: string) {
    return () => new RegExp(pattern, modifiers);
  }
  // new Class
  newClass(calleeDsl: DslJson, paramsDsl?: DslJson[]) {
    return this.callFun(calleeDsl, paramsDsl, true);
  }
  // 调用方法
  callFun(calleeDslJson: DslJson, paramsDsl?: DslJson[], isClass = false) {
    const calleeDsl: DslJson[] = this.checkMemberExpression(calleeDslJson) ? this.getMemberExpressionValue(calleeDslJson) : [calleeDslJson];
    const getParentAndLastKey = this.getOrAssignOrDissocPath(calleeDsl, undefined, undefined, 'parentAndLastKey') as Function;
    const dslLen = (calleeDsl as DslJson[]).length;
    const lastIndex = dslLen - 1;
    const lastMember: string = calleeDsl[lastIndex] as string;

    let getParams = () => [] as any;
    const paramsLen = paramsDsl?.length;
    if (paramsLen) {
      // 表示有入参
      const paramItems = paramsDsl.map(item => this.getValue(item));
      getParams = () => {
        // 不要使用 Array.map，Array.push 性能太低了
        const params: any[] = [];
        for(let i = 0; i < paramsLen; ++i) {
          params[i] = paramItems[i]();
        }
        return params;
      };
    }

    const getFunInfos = () => {
      const { parent, lastKey } = getParentAndLastKey();
      const params = getParams() as any[];
      return { parent, lastKey, params };
    };

    const noFunction = (type) => {
      console.log('type:', {
        type,
        calleeDsl,
        paramsDsl
      });
      // 表示类型出错
      throw new Error(`非函数类型： ${_.isArray(calleeDsl) ? (calleeDsl as DslJson[]).join('.') : ((calleeDsl as DslJson)?.value || (calleeDsl as DslJson)?.v)}`);
    };

    // 极简情况
    if (dslLen === 1) {
      if (isClass) {
        switch(paramsDsl?.length || 0) {
          case 0:
            return () => {
              const { parent: callee } = getFunInfos();
              return new callee;
            };
          case 1:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0]);
            };
          case 2:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1]);
            };
          case 3:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2]);
            };
          case 4:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2], params[3]);
            };
          case 5:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2], params[3], params[4]);
            };
          case 6:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2], params[3], params[4], params[5]);
            };
          case 7:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6]);
            };
          case 8:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7]);
            };
          case 9:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8]);
            };
          case 10:
            return () => {
              const { parent: callee, params } = getFunInfos();
              return new callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9]);
            };
          default:
        }
        return () => {
          const { parent: callee, params } = getFunInfos();
          try {
            return new callee(...params);
          } catch {
            noFunction('class');
          }
        };
      }
      switch (paramsDsl?.length || 0) {
        case 0:
          return () => {
            const { parent: callee } = getFunInfos();
            return callee();
          };
        case 1:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0]);
          };
        case 2:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1]);
          };
        case 3:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2]);
          };
        case 4:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3]);
          };
        case 5:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3], params[4]);
          };
        case 6:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3], params[4], params[5]);
          };
        case 7:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6]);
          };
        case 8:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7]);
          };
        case 9:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8]);
          };
        case 10:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9]);
          };
        case 11:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9], params[10]);
          };
        default:
          return () => {
            const { parent: callee, params } = getFunInfos();
            return callee(...params);
          };
      }
    }

    if (isClass) {
      return () => {
        const {parent, lastKey, params} = getFunInfos();
        try {
          return new parent[lastKey](...params);
        } catch {
          noFunction('class');
        }
      };
    }

    switch(lastMember) {
      case 'call':
      case 'apply':
      case 'bind':
        return () => {
          const {parent, lastKey, params} = getFunInfos();
          try {
            return parent[lastKey](...params);
          } catch (err) {
            console.log(`-----${lastKey} 错误：`, { params, paramsDsl, calleeDsl, parent, lastKey, err }, this.varScope);
            // noFunction(lastKey);
            throw err;
          }
        };
      default:
        switch(paramsDsl?.length || 0) {
          case 0:
            return () => {
              const {parent, lastKey} = getFunInfos();
              return parent[lastKey]();
            };
          case 1:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0]);
            };
          case 2:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1]);
            };
          case 3:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2]);
            };
          case 4:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2], params[3]);
            };
          case 5:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2], params[3], params[4]);
            };
          case 6:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2], params[3], params[4], params[5]);
            };
          case 7:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2], params[3], params[4], params[5], params[6]);
            };
          case 8:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7]);
            };
          case 9:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8]);
            };
          case 10:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](params[0], params[1], params[2], params[3], params[4], params[5], params[6], params[7], params[8], params[9]);
            };
          default:
            return () => {
              const {parent, lastKey, params} = getFunInfos();
              return parent[lastKey](...params);
            };
        }
    }
  }
  // tryCatch 语句
  callTryCatch(block: DslJson, handler?: DslJson, finalizer?: DslJson) {
    const resolveBlock = dslResolve(block, this);
    const resolveHandler = handler ? dslResolve(handler, this) : _.noop;
    const resolveFinalizer = finalizer ? dslResolve(finalizer, this): _.noop;
    return () => {
      try {
        resolveBlock();
      } catch (err) {
        if (handler) {
          const catchFun = resolveHandler();
          const result = catchFun(err);
          // catch 语句有返回值
          if (result !== undefined) {
            this.varScope.__returnObject__ = { result };
          }
        }
      } finally {
        resolveFinalizer();
      }
    };
  }
  // switch 语句
  callSwitch(discriminantDsl: DslJson, casesDsl: [DslJson, DslJson[]][]) {
    const getDiscriminant = this.getValue(discriminantDsl);
    // 所有的语句
    const caseClauseList: any[] = [];
    const testList: any[] = [];
    casesDsl.forEach(caseDsl => {
      const [testDsl, consequentDsl] = caseDsl;
      const getTest = testDsl ? this.getValue(testDsl) : () => testDsl;
      testList.push(getTest);
      caseClauseList.push(this.callBlockStatement(consequentDsl, true));
    });

    return () => {
      const discriminant = getDiscriminant();
      testList.some((getTest, index) => {
        const currentVarScope = this.varScope;
        const test = getTest();
        // test === null 表示 default 分支
        if (test === discriminant || test === null) {
          for(let i = index; i < testList.length; ++i) {
            const caseClause = caseClauseList[i];
            caseClause();
            if (currentVarScope.__isBreak__) {
              // case 执行了 break
              currentVarScope.__isBreak__ = currentVarScope.__keepBreaking__;
              break;
            } else if (currentVarScope.__returnObject__) {
              // 遇到 return 语句
              break;
            }
          }
          return true;
        }
        return false;
      });
    };
  }
  // sequence
  callSequence(dslList: DslJson[]) {
    const sequenceCalls = (
      dslList.map(item => this.checkMemberExpression(item)
        ? this.getObjMember(item)
        : dslResolve(item, this))
    );
    return () => {
      let result: any;
      sequenceCalls.forEach(item => {
        result = item();
      });
      return result;
    };
  }
  // 添加标记
  addLabel(label: string) {
    this.varScope.__tmpLabel__ = label;
    this.varScope.__labels__.push(label);
    return () => _.noop;
  }
  // 移除标记
  removeLabel() {
    delete this.varScope.__tmpLabel__;
    return () => _.noop;
  }
  callLabelStatement(labelStatement: DslJson[]) {
    const [addLabelDsl, loopStatement, removeLabelDsl] = labelStatement;
    dslResolve(addLabelDsl, this);
    const resolve = dslResolve(loopStatement, this);
    dslResolve(removeLabelDsl, this);
    return () => resolve();
  }
  // 返回普通字面量
  getLiteral(value: any) {
    return () => value;
  }
  // 返回 object-literal
  getObjectLiteral(value: any[]) {
    const getObjectList: Record<string, Function> = {};
    // __proto__ 属性需要放到最后
    let setProtoProperty = _.noop;
    value.forEach(({
      k,
      key = k,
      v,
      value: valueDsl = v
    }) => {
      if (key === '__proto__') {
        setProtoProperty = () => {
        getObjectList[key] = dslResolve(valueDsl, this);}
      } else {
        getObjectList[key] = dslResolve(valueDsl, this);
      }
    });
    setProtoProperty();
    return () => {
      const obj: any = {};
      Object.entries(getObjectList).forEach(([key, getObject]) => {
        obj[key] = getObject();
      });
      return obj;
    };
  }
  // 返回 数组字面量
  getArrayLiteral(value: any[]) {
    const getArrayItems = ([...value]).map((item: any) => dslResolve(item, this));
    const len = getArrayItems.length;
    return () => {
      const array: any[] = [];
      for(let i = 0; i< len; ++i) {
        array[i] = getArrayItems[i]();
      }
      return array;
    };
  }
}

const moduleScopeMap: Record<string, Customize> = {};

// 全局作用域名
export const createModuleScope = (nameSpace?: string) => {
  const customize = new Customize();
  if (nameSpace) {
    const moduleScope = moduleScopeMap[nameSpace];
    if (moduleScope) return moduleScope;
    moduleScopeMap[nameSpace] = customize;
  }
  // commonjs 的 exports 与 commonjs2 的 module.exports
  const moduleExports: any = {};
  Object.assign(customize.varScope, {
    exports: moduleExports,
    module: {
      exports: moduleExports
    }
  });
  return customize;
};

// 按 nameSpace 返回 scope
export const getScopeByNameSpace = (nameSpace: string) => moduleScopeMap[nameSpace];

// 提供给开发的注册接口
export const registerToGlobleScope = (member: Object) => {
  if (typeof member !== 'object') {
    throw new Error('registerToGlobleScope 只支持类型为 Object 的参数');
  }
  Object.assign(globalScope, member);
};

// 提供给开发注册的接口
export const registerToScope = (nameSpace: string, member: Object) => {
  const moduleScope = createModuleScope(nameSpace);
  if (typeof member !== 'object') {
    throw new Error('registerToScope 只支持类型为 Object 的参数');
  }
  Object.assign(moduleScope.varScope, member);
};
