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

// CanvasContext 的方法
const canvasContextApis = [
  'arc',
  'arcTo',
  'beginPath',
  'bezierCurveTo',
  'clearRect',
  'clip',
  'closePath',
  'createCircularGradient',
  'createLinearGradient',
  'createPattern',
  'draw',
  'drawImage',
  'fill',
  'fillRect',
  'fillText',
  'lineTo',
  'measureText',
  'moveTo',
  'quadraticCurveTo',
  'rect',
  'restore',
  'rotate',
  'save',
  'scale',
  'setFillStyle',
  'setFontSize',
  'setGlobalAlpha',
  'setLineCap',
  'setLineDash',
  'setLineJoin',
  'setLineWidth',
  'setMiterLimit',
  'setShadow',
  'setStrokeStyle',
  'setTextAlign',
  'setTextBaseline',
  'setTransform',
  'stroke',
  'strokeRect',
  'strokeText',
  'transform',
  'translate'
];

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
    if (parentVarScope?.__labels__?.length) {
      this.varScope.__labels__.push(...parentVarScope.__labels__);
    }
    if (parentVarScope?.__tmpLabel__) {
      const currentLabel = parentVarScope.__tmpLabel__;
      this.varScope.__label__ = currentLabel;
      this.varScope.__labels__.push(currentLabel);
    }
    // sort-hand
    const resolveFunKeysMap = [
      ['const', 'co'],
      ['getValue', 'gV'],
      ['let', 'l'],
      ['var', 'v'],
      ['batchConst', 'bC'],
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
    __label__: '' // 当前作用域的标记
  };
  // 常量
  const(key: string, valueDsl?: DslJson | DslJson[]) {
    const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
    return (realValue: any) => {
      if (!this.varScope.__isHotUpdating__ && _.has(this.varScope, key)) {
        throw new Error(`Uncaught TypeError: Assignment to constant variable. ${key}`);
      }
      const value = valueDsl ? preGetValue() : realValue;
      Object.defineProperty(this.varScope, key, {
        value,
        writable: true, // 小程序环境中：writable 取 false，那么 enumerable 也一定是 false
        enumerable: true
      });
    };
  }
  // 获取值
  getValue(valueDsl: DslJson | DslJson[], ignoreBind = true, returnParent?: Function) {
    const isMemberExpression = _.isArray(valueDsl);
    return !isMemberExpression ? dslResolve(valueDsl as DslJson, this) : this.getObjMember(valueDsl as DslJson[], ignoreBind, returnParent);
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
  let(key: string, valueDsl?: DslJson | DslJson[], isVarKind: boolean = false, onlyDeclare: boolean = false) {
    let varScope = this.varScope;
    let raiseVarScopeKeyPath: string[] = [];
    if (isVarKind) {
      if (!varScope.__raiseVarScopeKeyPath__) {
        // 没有定位到作用域，通过循环找到
        while (varScope.__isBlockStatement__) {
          // 块级作用域，var 声明必须上提作用域
          varScope = varScope.__parentVarScope__;
          raiseVarScopeKeyPath.push('__parentVarScope__');
        }
        // 标记有「上提作用域」
        this.varScope.__raiseVarScopeKeyPath__ = raiseVarScopeKeyPath;
      } else {
        raiseVarScopeKeyPath = this.varScope.__raiseVarScopeKeyPath__
        // 直接引用上提作用域
        varScope = raiseVarScopeKeyPath.length ? _.get(this.varScope, raiseVarScopeKeyPath) : this.varScope;
      }
    }
    if (_.has(varScope, key)) {
      if (isVarKind) {
        if (!onlyDeclare && valueDsl) {
          const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
          if (!raiseVarScopeKeyPath.length) {
            return (realValue?: any) => {
              const currentVarScope = this.varScope;
              const value = valueDsl ? preGetValue() : realValue;
              currentVarScope[key] = value;
            };
          }
          return (realValue?: any) => {
            const currentVarScope = _.get(this.varScope, raiseVarScopeKeyPath);
            const value = valueDsl ? preGetValue() : realValue;
            currentVarScope[key] = value;
          };
        }
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
      if (!raiseVarScopeKeyPath.length) {
        return (realValue?: any) => {
          const value = valueDsl ? preGetValue() : realValue;
          this.varScope[key] = value;
        };
      }
      return (realValue?: any) => {
        const currentVarScope = _.get(this.varScope, raiseVarScopeKeyPath);
        const value = valueDsl ? preGetValue() : realValue;
        currentVarScope[key] = value;
      };
    }
    // 默认为空
    return _.noop;
  }
  // var
  var(key: string, valueDsl?: DslJson | DslJson[], onlyDeclare: boolean = false) {
    return this.let(key, valueDsl, true, onlyDeclare);
  }
  // 批量
  batchConst(list: { key: string, value: any, k?: string, v?: any }[]) {
    const constCalls: any[] = list.map(({ key, value, k, v }) => key ? this.const(key, value) : this.const(k!, v));
    return () => constCalls.forEach(constCall => constCall());
  }
  batchVar(list: { key: string, value: any, k?: string, v?: any }[]) {
    const varCalls = list.map((item) => {
      const { key, value, k, v } = item;
      const onlyDeclare = key ? !_.has(item, 'value') : !_.has(item, 'v');
      return key ? this.var(key, value, onlyDeclare) : this.var(k!, v, onlyDeclare)
    });
    return (realValue?: any) => varCalls.forEach(varCall => varCall(realValue));
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
      case "const":
        return this.batchConst(list);
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
  getObjMember(keyPathOfDsl: DslJson[], ignoreBind = true, returnParent?: Function) {
    return this.getOrAssignOrDissocPath(keyPathOfDsl, undefined, undefined, 'get', ignoreBind, returnParent);
  }
  // 取值、赋值与删除对象成员 
  getOrAssignOrDissocPath(
    keyPathOfDsl: (string | DslJson)[],
    valueDsl?: DslJson | DslJson[],
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
      if (index > 0 && _.isArray(item)) {
        return this.getValue(item);
      }
      if (_.isString(item) || _.isNumber(item)) return () => item;
      return dslResolve(item, this, false, false, `getOrAssignOrDissocPath | ${type} | ${JSON.stringify(keyPathOfDsl)}`);
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
          if (_.hasIn(parent, firstKey)) {
            // 找到作用域
            getTargetScope = () => {
              return _.get(this.varScope, parentKeyPath);
            };
            break;
          }
          parent = parent.__parentVarScope__;
          parentKeyPath.push('__parentVarScope__');
        }
      }
    }
    if (getTargetScope !== null) {
      const getParent = (targetScope, parentKeyPath) => {
        return parentKeyPathCalls.length ? _.get(targetScope, parentKeyPath) : targetScope;
      };
      const getParentKeyPath = () => {
        return parentKeyPathCalls.map(item => item());
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
        return (realValue?: any) => {
          const targetScope = getTargetScope();
          const parentKeyPath = getParentKeyPath();
          if (!parentKeyPath.length || _.hasIn(targetScope, parentKeyPath)) {
            // 执行赋值
            const lastKey = lastKeyCall();
            const keyPath = [...parentKeyPath, lastKey];
            const parent = getParent(targetScope, parentKeyPath);
            // 要在 lastKey 之后调用 preGetValue
            const value = _.isUndefined(realValue) ? preGetValue() : realValue;
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
          if (type === 'parentAndLastKey') {
            return () => {
              const targetScope = getTargetScope();
              const lastKey = lastKeyCall();
              return { parent: targetScope, lastKey };
            };
          }
          return () => {
            const targetScope = getTargetScope();
            const lastKey = lastKeyCall();
            return targetScope[lastKey];
          };
        }
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
          const keyPath = [...parentKeyPath, lastKey];
          const parent = getParent(targetScope, parentKeyPath);
          if (_.hasIn(targetScope, keyPath)) {
            // keyPath 找得到，返回结果
            let result = _.get(targetScope, keyPath);
            // 绑定 this 指针
            if (
              !ignoreBind &&
              _.isFunction(result) &&
              parent !== Function && // Function 不能被绑定
              lastKey !== 'call' &&
              lastKey !== 'bind' &&
              lastKey !== 'apply'
            ) {
              result = result.bind(parent);
            }
            return result;
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
  assignLet(keyPathOfDsl: (string | DslJson)[], valueDsl?: DslJson | DslJson[], operator?: AssignmentOperator) {
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
  setLet(key: string, value?: any) {
    return this.assignLet([key], value);
  }
  // 返回值
  callReturn(dslJson: DslJson | DslJson[]) {
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
    if (label) {
      if (!this.varScope.__labels__.includes(label)) {
        // 表示找不到对应的 label
        return () => {
          throw new Error(`Uncaught SyntaxError: Undefined label '${label}'`);
        };
      }
      return () => {
        let varScope = this.varScope;
        while(varScope) {
          // 向上传递 break
          varScope.__isBreak__ = true;
          if (varScope.__label__ === label) {
            // 到达标记语句，停止上升
            break;
          }
          varScope = varScope.__parentVarScope__;
        }
      };
    } else {
      return () => {
        this.varScope.__isBreak__ = true;
      };
    }
  }
  // continute
  callContinute(label?: string) {
    if (label) {
      if (!this.varScope.__labels__.includes(label)) {
        // 表示找不到对应的 label
        return () => {
          throw new Error(`Uncaught SyntaxError: Undefined label '${label}'`);
        };
      }
      return () => {
        let varScope = this.varScope;
        while(varScope) {
          // 向上传递 break
          varScope.__isContinute__ = true;
          if (varScope.__label__ === label) {
            // 到达标记语句，停止上升
            break;
          }
          varScope = this.varScope.__parentVarScope__;
        }
      };
    } else {
      return () => {
        this.varScope.__isContinute__ = true;
      };
    }
  }
  // 一元运算
  callUnary(operator: UnaryOperator, valueDsl: DslJson | DslJson[]) {
    const isMemberExpression = _.isArray(valueDsl);
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
          const doDelete: any = this.getOrAssignOrDissocPath(valueDsl as DslJson[], undefined, undefined, 'dissocPath');
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
  callBinary(leftDsl: DslJson | DslJson[], operator: BinaryOperator, rightDsl: DslJson | DslJson[]) {
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
  callUpdate(operator: UpdateOperator, argument: DslJson | DslJson[], prefix: boolean) {

    const keyPathDsl = (_.isArray(argument) ? argument : [argument]) as DslJson[];
    const getParentAndLastKey: any = this.getOrAssignOrDissocPath(keyPathDsl, undefined, undefined, 'parentAndLastKey');
    return () => {
      const { parent, lastKey } = getParentAndLastKey();
      if (prefix) {
        return operator === '++' ? ++parent[lastKey] : --parent[lastKey];
      }
      return operator === '++' ? parent[lastKey]++ : parent[lastKey]--;
    };
    
  }
  // 逻辑运算
  callLogical(leftDsl: DslJson | DslJson[], operator: LogicalOperator, rightDsl: DslJson | DslJson[]) {
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
  callThrow(argument: DslJson | DslJson[]) {
    const preGetValue = this.getValue(argument);
    return () => {
      throw preGetValue();
    };
  }
  // while
  callWhile(test: DslJson | DslJson[], body: DslJson) {
    const testCall = this.getValue(test);
    const resolveCall = body ? dslResolve(body, this, true) : _.noop;
    return () => {
      const currentVarScope = this.varScope;
      while(testCall()) {
        resolveCall();
        this.varScope = currentVarScope; // 防止函数调用自身带来作用哉干扰
        if (this.varScope.__isBreak__) {
          this.varScope.__isBreak__ = false;
          break;
        }
        if (this.varScope.__isContinute__) {
          this.varScope.__isContinute__ = false;
          continue;
        }
      }
    };
  }

  // doWhile
  callDoWhile(test: DslJson | DslJson[], body: DslJson) {
    const resolveCall = body ? dslResolve(body, this, true) : _.noop;
    const callWhile = this.callWhile(test, body);
    return () => {
      const currentVarScope = this.varScope;
      resolveCall();
      this.varScope = currentVarScope; // 防止函数调用自身带来作用哉干扰
      if (this.varScope.__isBreak__) {
        this.varScope.__isBreak__ = false;
      } else {
        callWhile();
      }
    };
  }

  // for
  callFor(
    init: DslJson,
    test: DslJson | DslJson[],
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
        this.varScope = currentVarScope; // 防止函数调用自身带来作用哉干扰
        if (this.varScope.__isBreak__) {
          this.varScope.__isBreak__ = false;
          break;
        }
        if (this.varScope.__isContinute__) {
          this.varScope.__isContinute__ = false;
          continue;
        }
      }
    };
  }

  // for...in
  callForIn(leftDsl: DslJson | DslJson[], rightDsl: DslJson | DslJson[], body: DslJson) {
    const getTargetObj = this.getValue(rightDsl);
    const isMemberExpression = _.isArray(leftDsl);
    let resolveLeft: any = _.noop;

    if (isMemberExpression) {
      // 赋值表达式
      resolveLeft = this.assignLet(leftDsl as DslJson[]);
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
      const targetObj = getTargetObj();
      const currentVarScope = this.varScope;
      for(const item in targetObj) {
        resolveLeft(item);
        resolveBody();
        this.varScope = currentVarScope; // 防止函数调用自身带来作用哉干扰
        if (this.varScope.__isBreak__) {
          this.varScope.__isBreak__ = false;
          break;
        }
        if (this.varScope.__isContinute__) {
          this.varScope.__isContinute__ = false;
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
    const customize = new Customize(parentVarScope);
    // 挂载 isBlockStatement
    Object.assign(customize.varScope, {  __isBlockStatement__: isBlockStatement });

    let setArguments: any = _.noop;
    let setThis: any = _.noop;

    // 初始化实参
    if (!isBlockStatement) {
      // 在函数上下文挂载 arguments，但是不赋值
      setArguments = customize.var('arguments');
      // 在函数上下文中挂载 this，但是不赋值
      setThis = customize.var('this');
    }

    // 初始化形参
    const initParams = (() => {
      const paramItemInitList = params.map((name, index) => {
        /**
         * 形参用 var 不用 const & let
         * 值必须使用 DSL 格式
         */
        return customize.var(name!, {
          type: 'member',
          value: ['arguments', index]
        });
      });
      return () => {
        paramItemInitList.forEach(itemInit => itemInit());
      };
    })();

    // 变量声明
    if (functionName) {
      Object.assign(customize.varScope, { [functionName]: undefined });
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

    // body 预解析
    const lines = body.map(item => {
      if (!item) return _.noop;
      return dslResolve(item, customize);
    });

    // 通用作用域
    let commonVarScope: any = null;

    function execFunction () {
      // 重置 varScope
      const currentVarScope = { ...commonVarScope };
      Object.defineProperty(currentVarScope, '__parentVarScope__', {
        value: commonVarScope.__parentVarScope__,
        writable: true
      });
      customize.varScope = currentVarScope;
      if (!isBlockStatement) {
        // 在函数上下文挂载 arguments
        setArguments(arguments);
        // 在函数上下文中挂载 this
        setThis(this || globalScope);
        initParams();
      }

      // 执行作用域入栈
      execScopeStack.push(currentVarScope);
      try {
        // 直接返回
        lines.some((execLine, index) => {
          const prevExecLineBreak = customize.varScope.__isBreak__;
          execLine();
          customize.varScope = currentVarScope; // 防止函数调用自身带来作用域干扰
          const returnObject = customize.varScope.__returnObject__;
          const varScope = customize.varScope;
          const parentVarScope = currentVarScope.__parentVarScope__;
          if (returnObject) { // 表示的返回
            if (varScope.__isBlockStatement__) {
              // 向上传递
              parentVarScope.__returnObject__ = returnObject;
            } else {
              // 直接中断返回
              return true;
            }
          }
          if (customize.varScope.__isBreak__ || returnObject) {
            if (
              isBlockStatement && (
                supportBreak || parentVarScope.__isBlockStatement__
              )
            ) {
              // 向上传递
              parentVarScope.__isBreak__ = true;
              parentVarScope.__break_y = true;
              if (returnObject) {
                // 循环体内，需要再向上传递
                parentVarScope.__parentVarScope__.__returnObject__ = returnObject;
              }
              // switch 或 循环中断
              if (!supportBreak) {
                customize.varScope.__isBreak__ = false;
              }
              return true;
            }
            if (returnObject) return true;
            customize.varScope.__isBreak__ = false;
            throw new Error('Uncaught SyntaxError: Illegal break statement');
          }
          if (customize.varScope.__isContinute__) {
            if (
              isBlockStatement && (
                supportContinue || parentVarScope.__isBlockStatement__
              )
            ) {
              // 向上传递
              parentVarScope.__isContinute__ = true;
              // 循环跳过
              if (!supportContinue) {
                customize.varScope.__isContinute__ = false;
              }
              return true;
            }
            customize.varScope.__isContinute__ = false;
            throw new Error('Uncaught SyntaxError: Illegal continute statement');
          }
          return false;
        });
      } finally {
        // 执行作用域出栈
        execScopeStack.pop();
    
        const result = customize.varScope.__returnObject__?.result;
        if (!isBlockStatement) {
          if (customize.varScope.__returnObject__) {
            customize.varScope.__returnObject__ = null;
            return result;
          }
        } else if (customize.varScope.__returnObject__) {
          // blockStatement 向上传
          customize.varScope.__parentVarScope__.__returnObject__ = {
            result
          };
          // 清除
          customize.varScope.__returnObject__ = null;
        }
      }
    };

    const initVarScope = customize.varScope;

    if (body.length === 0) {
      // 表示空函数
      return () => {
        const anonymousFn = function() {
          return () => {};
        };
        if (functionName) {
          // 添加函数名
          Object.defineProperty(anonymousFn, 'name', {value: functionName, writable: false, configurable: true } );
          // 声明语句
          if (isDeclaration) {
            Object.assign(this.varScope, { [functionName]: anonymousFn })
          }
        }
        return anonymousFn;
      };
    }

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
      const anonymousFn = function () {
        commonVarScope = varScope;
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
  // 创建块作用域
  callBlockStatement(body: DslJson[], supportBreak = false, supportContinue = false) {
    const createBlockStatement = this.createFunction(
      [],
      body,
      undefined,
      true,
      supportBreak,
      supportContinue
    );
    return () => {
      const blockStatementFn = createBlockStatement();
      blockStatementFn();
    };
  }
  // ifElse 函数改造
  callIfElse(conditionDsl: DslJson | DslJson[], onTrue: DslJson, onFail: DslJson) {
    const getCondition = this.getValue(conditionDsl);
    const resolveTrue = dslResolve(onTrue, this);
    const resolveFail = onFail ? dslResolve(onFail, this) : _.noop;
    return () => {
      getCondition() ? resolveTrue() : resolveFail();
    };
  }
  // 三元运算
  callConditional(conditionDsl: DslJson | DslJson[], onTrueDsl: DslJson, onFailDsl: DslJson) {
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
  newClass(calleeDsl: DslJson | DslJson[], paramsDsl?: DslJson[]) {
    return this.callFun(calleeDsl, paramsDsl, true);
  }
  // 调用方法
  callFun(calleeDsl: DslJson | DslJson[], paramsDsl?: DslJson[], isClass = false) {
    let getParentCallee: any = _.noop;
    const getCallee = this.getValue(calleeDsl, false, (getParent) => {
      getParentCallee = getParent;
    });
    const dslLen = (calleeDsl as DslJson[]).length;
    const lastIndex = dslLen - 1;
    const lastMember: string = calleeDsl[lastIndex] as string;
    const isCanvasContextApi = canvasContextApis.includes(lastMember);

    let getParams = () => [] as any;
    if (paramsDsl?.length) {
      // 表示有入参
      const paramItems = paramsDsl.map(item => this.getValue(item));
      getParams = () => paramItems.map(getItemValue => getItemValue());
    }

    const getFunInfos = (type) => {
      let callee: any = _.noop;
      let parentCallee: any = _.noop;
      // 按类型返回 callee 或 parentCallee
      if (['class', 'default'].includes(type)) {
        callee = getCallee();
        if(!callee) {
          console.log('callee 不存在', {
            type,
            callee,
            calleeDsl,
            paramsDsl,
            varScope: this.varScope
          });
          throw new Error(`callee 不存在`);
        }
      } else {
        parentCallee = getParentCallee();
      }
      const params = getParams() as any[];
      return { callee, parentCallee, params };
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

    if (isClass) {
      return () => {
        const {callee, params} = getFunInfos('class');
        if (_.isFunction(callee)) {
          return new callee(...params);
        };
        noFunction('class');
      };
    }

    // canvasContextApi 特殊处理
    if (isCanvasContextApi) {
      return () => {
        const {parentCallee, params} = getFunInfos('canvasContextApi');
        if (_.isFunction(parentCallee[lastMember])) {
          return parentCallee[lastMember](...params);
        }
        noFunction('canvasContextApi');
      };
    }

    switch(lastMember) {
      case 'call':
        return () => {
          const {parentCallee, params} = getFunInfos('call');
          if (!parentCallee.call.prototype && _.isFunction(parentCallee.call)) {
            try {
              return parentCallee.call(...params);
            } catch (err) {
              console.log('-----call 错误：', { params, paramsDsl, calleeDsl, parentCallee, err }, this.varScope);
              throw err;
            }
          }
          noFunction('call');
        };
      case 'apply':
        return () => {
          const {parentCallee, params} = getFunInfos('apply');
          if (!parentCallee.apply.prototype && _.isFunction(parentCallee.apply)) {
            return parentCallee.apply(...params);
          }
          noFunction('apply');
        };
      case 'bind':
        return () => {
          const {parentCallee, params} = getFunInfos('bind');
          if (!parentCallee.bind.prototype && _.isFunction(parentCallee.bind)) {
            return parentCallee.bind(...params);
          }
          noFunction('bind');
        };
      default:
        return () => {
          const {callee, params} = getFunInfos('default');
          if (_.isFunction(callee)) {
            return callee(...params);
          }
          noFunction('default');
        };
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
  callSwitch(discriminantDsl: DslJson | DslJson[], casesDsl: [DslJson | DslJson[], DslJson[]][]) {
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
        const test = getTest();
        // test === null 表示 default 分支
        if (test === discriminant || test === null) {
          for(let i = index; i < testList.length; ++i) {
            const caseClause = caseClauseList[i];
            caseClause();
            if (this.varScope.__isBreak__) {
              // case 执行了 break
              this.varScope.__isBreak__ = false;
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
    const sequenceCalls = dslList.map(item => _.isArray(item) ? this.getObjMember(item as DslJson[]) : dslResolve(item, this));
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
    return () => {
      this.varScope.__tmpLabel__ = label;
      return _.noop;
    };
  }
  // 移除标记
  removeLabel() {
    return () => {
      delete this.varScope.__tmpLabel__;
      return _.noop;
    };
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
    return () => {
      const array = getArrayItems.map(getArrayItem => getArrayItem());
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
