import dslResolve from "./dsl-resolver";
// @ts-ignore
import * as _ from 'lodash-es';
// type
import type { DslJson } from "./dsl-resolver";

type AssignmentOperator = "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=";
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

// 自定义的方法
export default class Customize {
  constructor(parentVarScope?: any) {
    Object.defineProperty(this.varScope, '__parentVarScope__', {
      value: parentVarScope || globalScope,
      writable: false,
    });
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
      ['callSequence', 'cS']
    ];
    resolveFunKeysMap.forEach(([key, sortKey]) => {
      this[sortKey] = this[key];
    });
  }
  varScope: any = {
    __returnObject__: null,
    __isBreak__: false,
    __isContinute__: false,
    __isHotUpdating__: false // 热更新中变量
  };
  // 常量
  const(key: string, valueDsl: DslJson | DslJson[]) {
    if (!this.varScope.__isHotUpdating__ && this.varScope.hasOwnProperty(key)) {
      throw new Error('Uncaught TypeError: Assignment to constant variable.');
    }
    Object.defineProperty(this.varScope, key, {
      value: this.getValue(valueDsl),
      writable: true, // 小程序环境中：writable 取 false，那么 enumerable 也一定是 false
      enumerable: true
    });
  }
  // 获取值
  getValue(valueDsl: DslJson | DslJson[]) {
    const isMemberExpression = _.isArray(valueDsl);
    return !isMemberExpression ? dslResolve(valueDsl as DslJson, this) : this.getObjMember(valueDsl as DslJson[]);
  }
  // let
  let(key: string, valueDsl: DslJson | DslJson[], isVarKind: boolean = false) {
    if (this.varScope.hasOwnProperty(key)) {
      if (isVarKind) {
        this.varScope[key] = this.getValue(valueDsl);
      } else {
        const errMsg = `Uncaught SyntaxError: Identifier "${key}" has already been declared`;
        throw new Error(errMsg);
      }
    } else {
      Object.defineProperty(this.varScope, key, {
        value: this.getValue(valueDsl),
        writable: true,
        enumerable: true
      });
    }
  }
  // var
  var(key: string, valueDsl: DslJson | DslJson[]) {
    this.let(key, valueDsl, true);
  }
  // 批量
  batchConst(list: { key: string, value: any, k?: string, v?: any }[]) {
    list.forEach(({ key, value, k, v }) => key ? this.const(key, value) : this.const(k!, v))
  }
  batchVar(list: { key: string, value: any, k?: string, v?: any }[]) {
    list.forEach(({ key, value, k, v }) => key ? this.var(key, value) : this.var(k!, v))
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
    if (!this.varScope.hasOwnProperty(key)) {
      // 当前作用域找不到，往上找
      let parent = this.varScope.__parentVarScope__;
      while(Boolean(parent)) {
        if (parent.hasOwnProperty(key)) {
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
  getObjMember(keyPathOfDsl: DslJson[]) {
    return this.getOrAssignOrDissocPath(keyPathOfDsl);
  }
  // 取值、赋值与删除对象成员 
  getOrAssignOrDissocPath(
    keyPathOfDsl: (string | DslJson)[],
    valueDsl?: DslJson | DslJson[],
    operator?: AssignmentOperator,
    type: 'get' | 'assign' | 'dissocPath' = 'get'
  ) {
    if (!keyPathOfDsl.length) {
      throw new Error(`赋值失败: keyPathOfDsl为空数组`);
    }
    const value = valueDsl && this.getValue(valueDsl);
    const keyPath = keyPathOfDsl.map(item => dslResolve(item, this)) as string[];
    // 表示对象的根名称
    const [firstKey] = keyPath;
    const [firstDsl] = keyPathOfDsl;
    // 是否为字面量
    let isLiteralType = (
      _.isObject(firstKey)
        || (firstDsl as DslJson)?.t === 'l'
        || (firstDsl as DslJson)?.type === 'literal'
    );

    if (isLiteralType) {
      // 表示对象是字面量
      keyPath.shift(); // 去除第一个元素
    }
    const parentKeyPath = [...keyPath];
    const lastKey = parentKeyPath.pop();

    // 目标作用域
    let targetScope: any | null = null;
    if (isLiteralType) {
      // 根为字面量
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
      if (type === 'get' && _.hasIn(targetScope, keyPath)) {
        // keyPath 找得到，返回结果
        let result = _.get(targetScope, keyPath);
        // 绑定 this 指针
        if (_.isFunction(result)) {
          result = result.bind(parent);
        }
        return result;
      }
    } else {
      // 执行到这里，表示出错了
      if (type === 'assign') {
        throw new Error(`赋值失败：keyPath - ${keyPath} 找不到`);
      } else {
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
        break;
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
  callBreak() {
    this.varScope.__isBreak__ = true;
  }
  // continute
  callContinute() {
    this.varScope.__isContinute__ = true;
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
    const newValue = this.getObjMember(keyPathDsl) as number;
    return prefix ? newValue : oldValue;
  }
  // 逻辑运算
  callLogical(leftDsl: DslJson | DslJson[], operator: LogicalOperator, rightDsl: DslJson | DslJson[]) {
    const left = this.getValue(leftDsl);
    const right = this.getValue(rightDsl);
    switch(operator) {
      case "||":
        return left || right;
      case "&&":
        return left && right;
    }
  }
  // 抛锚
  callThrow(argument: DslJson | DslJson[]) {
    throw this.getValue(argument);
  }
  // while
  callWhile(test: DslJson | DslJson[], body: DslJson) {
    while(this.getValue(test)) {
      dslResolve(body, this);
      if (this.varScope.__isBreak__) {
        this.varScope.__isBreak__ = false;
        break;
      }
      if (this.varScope.__isContinute__) {
        this.varScope.__isContinute__ = false;
        continue;
      }
    }
  }

  // doWhile
  callDoWhile(test: DslJson | DslJson[], body: DslJson) {
    dslResolve(body, this);
    this.callWhile(test, body);
  }

  // for
  callFor(
    init: DslJson,
    test: DslJson | DslJson[],
    update,
    body
  ) {
    for(dslResolve(init, this); this.getValue(test); dslResolve(update, this)) {
      dslResolve(body, this);
      if (this.varScope.__isBreak__) {
        this.varScope.__isBreak__ = false;
        break;
      }
      if (this.varScope.__isContinute__) {
        this.varScope.__isContinute__ = false;
        continue;
      }
    }
  }

  // for...in
  callForIn(leftDsl: DslJson | DslJson[], rightDsl: DslJson | DslJson[], body: DslJson) {
    const targetObj = this.getValue(rightDsl);
    const isMemberExpression = _.isArray(leftDsl);
    for(const item in targetObj) {
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
      dslResolve(body, this);
      if (this.varScope.__isBreak__) {
        this.varScope.__isBreak__ = false;
        break;
      }
      if (this.varScope.__isContinute__) {
        this.varScope.__isContinute__ = false;
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
    supportContinue = false
  ) {
    const parentVarScope = this.varScope;
    // 挂载 isBlockStatement
    Object.assign(parentVarScope, { isBlockStatement });
    const anonymousFn = function() {
      const customize = new Customize(parentVarScope);
      const args = arguments;
      if (!isBlockStatement) {
        // 在函数上下文挂载 arguments
        customize.const('arguments', {
          type: 'array-literal',
          value: arguments
        });
        // 在函数上下文中挂载 this
        // @ts-ignore
        customize.const('this', this);
      }
      params.forEach((name, index) => {
        // 形参用 let 不用 const
        customize.let(name!, args[index]);
      });
      // 直接返回
      body.some(item => {
        if (!item) return;
        dslResolve(item, customize);
        if (customize.varScope.__returnObject__) {
          // 表示的返回
          return true;
        }
        if (customize.varScope.__isBreak__) {
          if (
            isBlockStatement && (
              supportBreak || parentVarScope.isBlockStatement
            )
          ) {
            // 向上传递
            parentVarScope.__isBreak__ = true;
            // switch 或 循环中断
            if (!supportBreak) {
              customize.varScope.__isBreak__ = false;
            }
            return true;
          }
          customize.varScope.__isBreak__ = false;
          throw new Error('Uncaught SyntaxError: Illegal break statement');
        }
        if (customize.varScope.__isContinute__) {
          if (
            isBlockStatement && (
              supportContinue || parentVarScope.isBlockStatement
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
    if (functionName) {
      // 有函数名
      this.const(functionName, {
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
      dslResolve(onFail, this)
    }
  }
  // 三元运算
  callConditional(conditionDsl: DslJson | DslJson[], onTrueDsl: DslJson, onFailDsl: DslJson) {
    const condition = this.getValue(conditionDsl);
    const onTrue = dslResolve(onTrueDsl, this);
    const onFail = dslResolve(onFailDsl, this);
    return condition ? onTrue() : onFail();
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
    const callee = this.getValue(calleeDsl);
    const params = (paramsDsl || []).map(item => {
      return this.getValue(item);
    });
    if (_.isFunction(callee)) {
      // 函数类型
      return isClass ? new callee(...params) : callee(...params);
    }
    console.log('this.varScope:', this.varScope);
    console.log('callee:', callee)
    console.log('calleeDsl:', calleeDsl);
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
        catchFun(err);
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
