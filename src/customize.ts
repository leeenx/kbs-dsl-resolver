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

// 自定义的方法
export default class Customize {
  constructor(parentVarScope?: any) {
    Object.defineProperty(this.varScope, '__parentVarScope__', {
      value: parentVarScope || globalScope,
      writable: false,
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
      ['getFunction', 'gF'],
      ['getArg', 'gA'],
      ['getObjMember', 'gOM'],
      ['getOrAssignOrDissocPath', 'gADP'],
      ['assignLet', 'aL'],
      ['getResultByOperator', 'gRBO'],
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
      ['destroy', 'd'],
      ['delete', 'del'],
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
  const(key: string, valueDsl: DslJson | DslJson[]) {
    if (!this.varScope.__isHotUpdating__ && _.has(this.varScope, key)) {
      throw new Error(`Uncaught TypeError: Assignment to constant variable. ${key}`);
    }
    Object.defineProperty(this.varScope, key, {
      value: this.getValue(valueDsl),
      writable: true, // 小程序环境中：writable 取 false，那么 enumerable 也一定是 false
      enumerable: true
    });
  }
  // 获取值
  getValue(valueDsl: DslJson | DslJson[], ignoreBind = true) {
    const isMemberExpression = _.isArray(valueDsl);
    return !isMemberExpression ? dslResolve(valueDsl as DslJson, this) : this.getObjMember(valueDsl as DslJson[], ignoreBind);
  }
  createContent() {
    const contentThis = new Customize(this.varScope);
    Object.assign(contentThis.varScope, { __isBlockStatement__: true });
    return contentThis;
  }
  // let
  let(key: string, valueDsl?: DslJson | DslJson[], isVarKind: boolean = false, onlyDeclare: boolean = false) {
    let varScope = this.varScope;
    if (isVarKind) {
      while (varScope.__isBlockStatement__) {
        // 块级作用域，var 声明必须上提作用域
        varScope = varScope.__parentVarScope__;
      }
    }
    if (_.has(varScope, key)) {
      if (isVarKind) {
        if (!onlyDeclare) {
          varScope[key] = valueDsl && this.getValue(valueDsl);
        }
      } else {
        const errMsg = `Uncaught SyntaxError: Identifier "${key}" has already been declared`;
        throw new Error(errMsg);
      }
    } else {
      Object.defineProperty(varScope, key, {
        value: valueDsl && this.getValue(valueDsl),
        writable: true,
        enumerable: true
      });
    }
  }
  // var
  var(key: string, valueDsl: DslJson | DslJson[], onlyDeclare: boolean = false) {
    this.let(key, valueDsl, true, onlyDeclare);
  }
  // 批量
  batchConst(list: { key: string, value: any, k?: string, v?: any }[]) {
    list.forEach(({ key, value, k, v }) => key ? this.const(key, value) : this.const(k!, v))
  }
  batchVar(list: { key: string, value: any, k?: string, v?: any }[]) {
    list.forEach((item) => {
      const { key, value, k, v } = item;
      const onlyDeclare = key ? !_.has(item, 'value') : !_.has(item, 'v');
      return key ? this.var(key, value, onlyDeclare) : this.var(k!, v, onlyDeclare)
    })
  }
  batchLet(list: { key: string, value: any }[]) {
    this.batchVar(list);
  }
  batchDeclaration(kind: 'var' | 'let' | 'const', list: { key: string, value: any }[]) {
    switch(kind) {
      case "var":
        this.batchVar(list);
        break;
      case "let":
        this.batchLet(list);
        break;
      case "const":
        this.batchConst(list);
    }
  }
  // 取值
  getConst(key: string) {
    let value:any = this.varScope[key];
    if (!_.has(this.varScope, key)) {
      // 当前作用域找不到，往上找
      let parent = this.varScope.__parentVarScope__;
      while(Boolean(parent)) {
        if (_.has(parent, key)) {
          value = parent[key];
          break;
        }
        parent = parent.__parentVarScope__;
      }
    }
    return value;
  }
  getLet(key: string) {
    return this.getConst(key);
  }
  getVar(key: string) {
    return this.getConst(key);
  }
  getFunction(key: string, params?: any[]) {
    const fun = this.getConst(key);
    return fun?.(...(params || []));
  }
  // 获取形参 ---- 等同于 getLet
  getArg(key: string) {
    return this.getLet(key);
  }
  // 获取对象的成员
  getObjMember(keyPathOfDsl: DslJson[], ignoreBind = true) {
    return this.getOrAssignOrDissocPath(keyPathOfDsl, undefined, undefined, 'get', ignoreBind);
  }
  // 取值、赋值与删除对象成员 
  getOrAssignOrDissocPath(
    keyPathOfDsl: (string | DslJson)[],
    valueDsl?: DslJson | DslJson[],
    operator?: AssignmentOperator,
    type: 'get' | 'assign' | 'dissocPath' = 'get',
    ignoreBind: boolean = true
  ) {
    if (!keyPathOfDsl.length) {
      throw new Error(`赋值失败: keyPathOfDsl为空数组`);
    }
    const keyPath = keyPathOfDsl.map((item, index) => {
      const key = dslResolve(item, this);
      if (index > 0 && _.isArray(key)) {
        return this.getValue(key);
      }
      return key;
    }) as string[];
    // 表示对象的根名称
    const [firstKey] = keyPath;
    const [firstDsl] = keyPathOfDsl;
    // 是否为 Identifier
    const isIdentifier = _.isString(firstDsl);

    if (!isIdentifier) {
      // 非 Identifier
      keyPath.shift(); // 去除第一个元素
    }
    const parentKeyPath = [...keyPath];
    const lastKey = parentKeyPath.pop();

    // 目标作用域
    let targetScope: any | null = null;
    if (!isIdentifier) {
      // 根非 Identifier
      targetScope = firstKey;
    } else {
      if (_.hasIn(this.varScope, firstKey)) {
        // 当前作用域下
        targetScope = this.varScope;
      } else {
        // 当前作用域找不到，往上找
        let parent = this.varScope.__parentVarScope__;
        while(Boolean(parent)) {
          if (_.hasIn(parent, firstKey)) {
            // 找到作用域
            targetScope = parent;
            break;
          }
          parent = parent.__parentVarScope__;
        }
      }
    }
    if (targetScope !== null) {
      const parent = parentKeyPath.length ? _.get(targetScope, parentKeyPath) : targetScope;
      if (
        type === 'assign' && (
          !parentKeyPath.length || _.hasIn(targetScope, parentKeyPath)
        )
      ) {
        // 执行赋值
        const value = valueDsl && this.getValue(valueDsl);
        const result = this.getResultByOperator(
          _.get(targetScope, keyPath),
          value,
          operator
        );
        return parent[lastKey!] = result;
      }
      if (
        type === 'dissocPath' &&
        (
          !parentKeyPath.length || _.hasIn(targetScope, parentKeyPath)
        )
      ) {
        // 删除指定属性
        return delete parent[lastKey!];
      }
      if (type === 'get') {
        if (!keyPath.length) return targetScope;
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
    } else {
      // 执行到这里，表示出错了
      if (type === 'assign') {
        throw new Error(`赋值失败：keyPath - ${keyPath} 找不到`);
      } else {
        console.log('keyPathOfDsl', keyPathOfDsl);
        throw new Error(`对象${parentKeyPath.join('.')}不存在成员：${lastKey}`);
      }
    }
  }
  assignLet(keyPathOfDsl: (string | DslJson)[], valueDsl?: DslJson | DslJson[], operator?: AssignmentOperator) {
    return this.getOrAssignOrDissocPath(keyPathOfDsl, valueDsl, operator, 'assign');
  }
  // 按操作符赋值
  getResultByOperator(leftValue: any, rightValue: any, operator: AssignmentOperator = '=') {
    switch(operator) {
      case "=":
        return rightValue;
      case "+=":
        return leftValue + rightValue;
      case "-=":
        return leftValue - rightValue;
      case "*=":
        return leftValue * rightValue;
      case "/=":
        return leftValue / rightValue;
      case "%=":
        return leftValue % rightValue;
      case "<<=":
        return leftValue << rightValue;
      case ">>=":
        return leftValue >> rightValue;
      case ">>>=":
        return leftValue >>> rightValue;
      case "%=":
        return leftValue % rightValue;
      case "|=":
        return leftValue | rightValue;
      case "^=":
        return leftValue ^ rightValue;
      case "&=":
        return leftValue & rightValue;
      default:
    }
  }
  setLet(key: string, value?: any) {
    return this.assignLet([key], value);
  }
  // 返回值
  callReturn(dslJson: DslJson | DslJson[]) {
    // 标记已经返回
    this.varScope.__returnObject__ = {
      result: this.getValue(dslJson)
    };
  }
  // break
  callBreak(label?: string) {
    if (label) {
      if (!this.varScope.__labels__.includes(label)) {
        // 表示找不到对应的 label
        throw new Error(`Uncaught SyntaxError: Undefined label '${label}'`);
      }
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
    } else {
      this.varScope.__isBreak__ = true;
    }
  }
  // continute
  callContinute(label?: string) {
    if (label) {
      if (!this.varScope.__labels__.includes(label)) {
        // 表示找不到对应的 label
        throw new Error(`Uncaught SyntaxError: Undefined label '${label}'`);
      }
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
    } else {
      this.varScope.__isContinute__ = true;
    }
  }
  // 一元运算
  callUnary(operator: UnaryOperator, valueDsl: DslJson | DslJson[]) {
    const isMemberExpression = _.isArray(valueDsl);
    const value = this.getValue(valueDsl);
    switch(operator) {
      case "-":
        return -value;
      case "+":
        return +value;
      case "!":
        return !value;
      case "~":
        return ~value;
      case "typeof":
        return typeof value;
      case "void":
        return void value;
      case "delete":
        if (isMemberExpression) {
          return this.getOrAssignOrDissocPath(valueDsl as DslJson[], undefined, undefined, 'dissocPath');
        }
        // 不会报错，但是不会删除成员
        return false;
      default:
        throw new Error(`未知的一元运算符：${operator}`);
    }
  }
  // 二元运算
  callBinary(leftDsl: DslJson | DslJson[], operator: BinaryOperator, rightDsl: DslJson | DslJson[]) {
    const left = this.getValue(leftDsl);
    const right = this.getValue(rightDsl);
    switch(operator) {
      case "==":
        return left == right;
      case "!=":
        return left != right;
      case "===":
        return left === right;
      case "!==":
        return left !== right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "<<":
        return left << right;
      case ">>":
        return left >> right;
      case ">>>":
        return left >>> right;
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "%":
        return left % right;
      case "|":
        return left | right;
      case "^":
        return left ^ right;
      case "&":
        return left & right;
      case "in":
        return left in right;
      case "instanceof":
        return left instanceof right;
      default:
        throw new Error(`未知的二元运算符：${operator}`);
    }
  }
  // 更新
  callUpdate(operator: UpdateOperator, argument: DslJson | DslJson[], prefix: boolean) {
    const keyPathDsl = (_.isArray(argument) ? argument : [argument]) as DslJson[];
    const oldValue = this.getObjMember(keyPathDsl) as number;
    this.assignLet(keyPathDsl, 1 as any, operator === '++' ? '+=' : '-=');
    const getNewValue = () => this.getObjMember(keyPathDsl) as number;
    return prefix ? getNewValue() : oldValue;
  }
  // 逻辑运算
  callLogical(leftDsl: DslJson | DslJson[], operator: LogicalOperator, rightDsl: DslJson | DslJson[]) {
    switch(operator) {
      case "||":
        return this.getValue(leftDsl) || this.getValue(rightDsl);
      case "&&":
        return this.getValue(leftDsl) && this.getValue(rightDsl);
    }
  }
  // 抛锚
  callThrow(argument: DslJson | DslJson[]) {
    throw this.getValue(argument);
  }
  // while
  callWhile(test: DslJson | DslJson[], body: DslJson) {
    while(this.getValue(test)) {
      // 内容区是一个独立的子作用域
      const contentThis = this.createContent();
      dslResolve(body, contentThis, true);
      if (contentThis.varScope.__isBreak__) {
        contentThis.varScope.__isBreak__ = false;
        break;
      }
      if (contentThis.varScope.__isContinute__) {
        contentThis.varScope.__isContinute__ = false;
        continue;
      }
    }
  }

  // doWhile
  callDoWhile(test: DslJson | DslJson[], body: DslJson) {
    // 内容区是一个独立的子作用域
    const contentThis = this.createContent();
    dslResolve(body, contentThis, true);
    if (contentThis.varScope.__isBreak__) {
      contentThis.varScope.__isBreak__ = false;
    } else {
      this.callWhile(test, body);
    }
  }

  // for
  callFor(
    init: DslJson,
    test: DslJson | DslJson[],
    update,
    body
  ) {
    for(init && dslResolve(init, this); test ? this.getValue(test) : true; dslResolve(update, this)) {
      // 内容区是一个独立的子作用域
      const contentThis = this.createContent();
      dslResolve(body, contentThis, true);
      if (contentThis.varScope.__isBreak__) {
        contentThis.varScope.__isBreak__ = false;
        break;
      }
      if (contentThis.varScope.__isContinute__) {
        contentThis.varScope.__isContinute__ = false;
        continue;
      }
    }
  }

  // for...in
  callForIn(leftDsl: DslJson | DslJson[], rightDsl: DslJson | DslJson[], body: DslJson) {
    const targetObj = this.getValue(rightDsl);
    const isMemberExpression = _.isArray(leftDsl);
    for(const item in targetObj) {
      // 内容区是一个独立的子作用域
      const contentThis = this.createContent();
      if (isMemberExpression) {
        // 赋值表达式
        this.assignLet(leftDsl as DslJson[], item as any);
      } else if ((leftDsl as DslJson)?.value?.[1]?.[0]) {
        // 声明语句
        (leftDsl as DslJson).value[1][0].value = {
          type: 'literal',
          value: item
        };
        dslResolve(leftDsl as DslJson, this);
      } else if ((leftDsl as DslJson)?.v?.[1]?.[0]) {
        // 声明语句 ---- 压缩
        (leftDsl as DslJson).v[1][0].v = {
          t: 'l',
          v: item
        };
        dslResolve(leftDsl as DslJson, this);
      }
      dslResolve(body, contentThis, true);
      if (contentThis.varScope.__isBreak__) {
        contentThis.varScope.__isBreak__ = false;
        break;
      }
      if (contentThis.varScope.__isContinute__) {
        contentThis.varScope.__isContinute__ = false;
        continue;
      }
    }
  }

  // 销毁
  destroy() {
    this.varScope = {
      __returnObject__: null,
      __isBreak__: false,
      __isContinute__: false
    };
  }
  // 删除
  delete(key: string, source: any = this.varScope) {
    delete source[key];
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
    const anonymousFn = function () {
      const customize = new Customize(parentVarScope);
      // 挂载 isBlockStatement
      Object.assign(customize.varScope, {  __isBlockStatement__: isBlockStatement });
      if (functionName) {
        Object.assign(customize.varScope, { [functionName]: anonymousFn });
      }
      const args = arguments;
      if (!isBlockStatement) {
        // 在函数上下文挂载 arguments
        customize.const('arguments', {
          type: 'arguments',
          value: arguments
        });
        // 在函数上下文中挂载 this
        // @ts-ignore
        customize.const('this', this || globalScope);
      }
      params.forEach((name, index) => {
        /**
         * 形参用 var 不用 const & let
         * 值必须使用 DSL 格式
         */
        customize.var(name!, {
          type: 'literal',
          value: args[index]
        });
      });
      // 直接返回
      body.some(item => {
        if (!item) return false;
        dslResolve(item, customize);
        const returnObject = customize.varScope.__returnObject__;
        const varScope = customize.varScope;
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
    };
    if (functionName && isDeclaration) {
      // anonymousFn.name = functionName;
      // 有函数名
      this.var(functionName, {
        type: 'literal',
        value: anonymousFn
      });
    }
    return anonymousFn;
  }
  // 创建块作用域
  callBlockStatement(body: DslJson[], supportBreak = false, supportContinue = false) {
    const blockStatementFn = this.createFunction(
      [],
      body,
      undefined,
      true,
      supportBreak,
      supportContinue
    );
    blockStatementFn();
  }
  // ifElse 函数改造
  callIfElse(conditionDsl: DslJson | DslJson[], onTrue: DslJson, onFail: DslJson) {
    if (this.getValue(conditionDsl)) {
      dslResolve(onTrue, this);
    } else {
      dslResolve(onFail, this);
    }
  }
  // 三元运算
  callConditional(conditionDsl: DslJson | DslJson[], onTrueDsl: DslJson, onFailDsl: DslJson) {
    const condition = this.getValue(conditionDsl);
    return condition ? this.getValue(onTrueDsl) : this.getValue(onFailDsl);
  }
  // new RegExp
  getRegExp(pattern: string, modifiers: string) {
    return new RegExp(pattern, modifiers);
  }
  // new Class
  newClass(calleeDsl: DslJson | DslJson[], paramsDsl?: DslJson[]) {
    return this.callFun(calleeDsl, paramsDsl, true);
  }
  // 调用方法
  callFun(calleeDsl: DslJson | DslJson[], paramsDsl?: DslJson[], isClass = false) {
    let lastMember: string = '';
    // 需要判断 this 指针
    const callee = this.getValue(calleeDsl, false);
    let parentCallee: any;
    let isCanvasContextApi = false;
    if (_.isArray(calleeDsl) && calleeDsl.length > 1) {
      const lastIndex = calleeDsl.length - 1;
      lastMember = calleeDsl[lastIndex] as string;
      if (!callee) {
        console.log('callee 不存在', {
          callee,
          calleeDsl,
          paramsDsl
        });
      }
      if (
        (!callee.prototype && ['call', 'apply', 'bind'].includes(lastMember))
          || canvasContextApis.includes(lastMember)
      ) {
        // 保留关键字
        const parentCalleeDsl = [...calleeDsl];
        parentCalleeDsl.pop();
        parentCallee = this.getOrAssignOrDissocPath(parentCalleeDsl);
        // 表示是 CanvasContext
        if (canvasContextApis.includes(lastMember)) {
          isCanvasContextApi = parentCallee.canvas;
          if (!isCanvasContextApi) lastMember = '';
        }
      } else {
        lastMember = '';
      }
    }
    const params = (paramsDsl || []).map(item => {
      return this.getValue(item);
    });
    if (_.isFunction(callee) || isCanvasContextApi) {
      // 函数类型
      if (isClass) {
        // console.log('+++++', { paramsDsl, params, calleeDsl, callee });
        return new callee(...params);
      }
      /**
       * 微信小程序会自动转码
       * 所有的函数/方法调用：fn() 都会被转码为 fn.apply
       * 但是如果是保留关键字：call & apply 就会错，
       * 下面的 switch 就是针对这种情况的特殊处理
       */
      try {
        if (isCanvasContextApi) {
          // CanvasContext 下的方法只能这样调用
          return parentCallee[lastMember](...params);
        }
        switch(lastMember) {
          case 'call':
            return parentCallee.call(...params);
          case 'apply':
            return parentCallee.apply(...params);
          case 'bind':
            return parentCallee.bind(...params);
          default:
            return callee(...params);
        }
      } catch(err) {
        console.log('lastMember', lastMember);
        console.log('this.varScope:', this.varScope);
        console.log('params', params);
        console.log('paramsDsl', paramsDsl);
        console.log('calleeDsl:', calleeDsl);
        console.log('callee:', callee);
        console.warn(err);
        throw err;
      }
    }
    // console.log('----------------------------');
    // console.log('this.varScope:', this.varScope);
    // console.log('params', params);
    // console.log('paramsDsl', paramsDsl);
    // console.log('calleeDsl:', calleeDsl);
    // console.log('callee:', callee);
    // 表示类型出错
    throw new Error(`非函数类型： ${_.isArray(calleeDsl) ? (calleeDsl as DslJson[]).join('.') : ((calleeDsl as DslJson)?.value || (calleeDsl as DslJson)?.v)}`);
  }
  // tryCatch 语句
  callTryCatch(block: DslJson, handler?: DslJson, finalizer?: DslJson) {
    try {
      dslResolve(block, this);
    } catch (err) {
      if (handler) {
        const catchFun = dslResolve(handler, this);
        const result = catchFun(err);
        // catch 语句有返回值
        if (result !== undefined) {
          this.varScope.__returnObject__ = { result };
        }
      }
    } finally {
      finalizer && dslResolve(finalizer, this);
    }
  }
  // switch 语句
  callSwitch(discriminantDsl: DslJson | DslJson[], casesDsl: [DslJson | DslJson[], DslJson[]][]) {
    const discriminant = this.getValue(discriminantDsl);
    // 所有的语句
    const caseClauseList: DslJson[][] = [];
    const testList: any[] = [];
    casesDsl.forEach(caseDsl => {
      const [testDsl, consequentDsl] = caseDsl;
      testList.push(this.getValue(testDsl));
      caseClauseList.push(consequentDsl);
    });
    testList.some((test, index) => {
      // test === null 表示 default 分支
      if (test === null || test === discriminant) {
        for(let i = index; i < testList.length; ++i) {
          const body = caseClauseList[i];
          // 创建一个 block 执行
          this.callBlockStatement(body, true);
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
  }
  // sequence
  callSequence(dslList: DslJson[]) {
    let result: any;
    dslList.forEach(item => {
      result = _.isArray(item) ? this.getObjMember(item as DslJson[]) : dslResolve(item, this);
    });
    return result;
  }
  // 添加标记
  addLabel(label: string) {
    this.varScope.__tmpLabel__ = label;
  }
  // 移除标记
  removeLabel() {
    delete this.varScope.__tmpLabel__;
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
