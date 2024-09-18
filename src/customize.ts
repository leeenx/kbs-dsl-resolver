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

// 替换 _.get 的方法
const getMemberCall = (count: number, keyPath?: string[], updateLastKeyCall: Function = _.noop): Function => {
  const hasKeyPath = Boolean(keyPath?.length);
  let [one, two, three, four, five, six, seven, eight, nign, ten] = keyPath || [];

  switch(count) {
    case 0:
      return (target: any) => target;
    case 1: {
      updateLastKeyCall((lastValue: any) => one = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]];
    }
    case 2: {
      updateLastKeyCall((lastValue: any) => two = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]];
    }
    case 3: {
      updateLastKeyCall((lastValue: any) => three = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]];
    }
    case 4: {
      updateLastKeyCall((lastValue: any) => four = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three][four];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]];
    }
    case 5: {
      updateLastKeyCall((lastValue: any) => five = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three][four][five];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]][keyPath[4]];
    }
    case 6: {
      updateLastKeyCall((lastValue: any) => six = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three][four][five][six];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]][keyPath[4]][keyPath[5]];
    }
    case 7: {
      updateLastKeyCall((lastValue: any) => seven = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three][four][five][six][seven];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]][keyPath[4]][keyPath[5]][keyPath[6]];
    }
    case 8: {
      updateLastKeyCall((lastValue: any) => eight = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three][four][five][six][seven][eight];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]][keyPath[4]][keyPath[5]][keyPath[6]][keyPath[7]];
    }
    case 9:
      updateLastKeyCall((lastValue: any) => nign = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three][four][five][six][seven][eight][nign];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]][keyPath[4]][keyPath[5]][keyPath[6]][keyPath[7]][keyPath[8]];
    case 10: {
      updateLastKeyCall((lastValue: any) => ten = lastValue);
      if (hasKeyPath) {
        return (target: any)  => target[one][two][three][four][five][six][seven][eight][nign][ten];
      }
      return (target: any, keyPath: string[]) => target[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]][keyPath[4]][keyPath[5]][keyPath[6]][keyPath[7]][keyPath[8]][keyPath[9]];
    }
    default:
      console.warn('长度超10的 object', count, keyPath);
      updateLastKeyCall((lastValue: any) => keyPath![count - 1] = lastValue);
      return (target: any, keyPath: string[]) => _.get(target, keyPath);
  }
}

// 批量执行10条
const batchExec10 = (statementList: Function[]) => {
  const l1 = statementList[0];
  const l2 = statementList[1];
  const l3 = statementList[2];
  const l4 = statementList[3];
  const l5 = statementList[4];
  const l6 = statementList[5];
  const l7 = statementList[6];
  const l8 = statementList[7];
  const l9 = statementList[8];
  const l10 = statementList[9];
  const count = statementList.length;
  switch(count) {
    case 0:
      return _.noop;
    case 1:
      return l1;
    case 2:
      return () => {
        l1();l2();
      };
    case 3:
      return () => {
        l1();l2();l3();
      };
    case 4:
      return () => {
        l1();l2();l3();l4();
      };
    case 5:
      return () => {
        l1();l2();l3();l4();l5();
      };
    case 6:
      return () => {
        l1();l2();l3();l4();l5();l6();
      };
    case 7:
      return () => {
        l1();l2();l3();l4();l5();l6();l7();
      };
    case 8:
      return () => {
        l1();l2();l3();l4();l5();l6();l7();l8();
      };
    case 9:
      return () => {
        l1();l2();l3();l4();l5();l6();l7();l8();l9();
      };
    case 10:
      return () => {
        l1();l2();l3();l4();l5();l6();l7();l8();l9();l10();
      };
    default:
      console.log('count:', count);
      throw new Error('一次最多执行十条指令');
  }
};

// 一次执行 20 条
const exec20 = (statementList: Function[]) => {
  const l1 = statementList[0], l2 = statementList[1], l3 = statementList[2], l4 = statementList[3], l5 = statementList[4], l6 = statementList[5], l7 = statementList[6], l8 = statementList[7], l9 = statementList[8], l10 = statementList[9], l11 = statementList[10], l12 = statementList[11], l13 = statementList[12], l14 = statementList[13], l15 = statementList[14], l16 = statementList[15], l17 = statementList[16], l18 = statementList[17], l19 = statementList[18], l20 = statementList[19];
  return () => {
    l1(), l2(), l3(), l4(), l5(), l6(), l7(), l8(), l9(), l10(), l11(), l12(), l13(), l14(), l15(), l16(), l17(), l18(), l19(), l20();
  };
};

// 一次执行 30 条
const exec30 = (statementList: Function[]) => {
  const l1 = statementList[0], l2 = statementList[1], l3 = statementList[2], l4 = statementList[3], l5 = statementList[4], l6 = statementList[5], l7 = statementList[6], l8 = statementList[7], l9 = statementList[8], l10 = statementList[9], l11 = statementList[10], l12 = statementList[11], l13 = statementList[12], l14 = statementList[13], l15 = statementList[14], l16 = statementList[15], l17 = statementList[16], l18 = statementList[17], l19 = statementList[18], l20 = statementList[19], l21 = statementList[20], l22 = statementList[21], l23 = statementList[22], l24 = statementList[23], l25 = statementList[24], l26 = statementList[25], l27 = statementList[26], l28 = statementList[27], l29 = statementList[28], l30 = statementList[29];
  return () => {
    l1(), l2(), l3(), l4(), l5(), l6(), l7(), l8(), l9(), l10(), l11(), l12(), l13(), l14(), l15(), l16(), l17(), l18(), l19(), l20(), l21(), l22(), l23(), l24(), l25(), l26(), l27(), l28(), l29(), l30();
  };
};

// 一次执行 40 条
const exec40 = (statementList: Function[]) => {
  const l1 = statementList[0], l2 = statementList[1], l3 = statementList[2], l4 = statementList[3], l5 = statementList[4], l6 = statementList[5], l7 = statementList[6], l8 = statementList[7], l9 = statementList[8], l10 = statementList[9], l11 = statementList[10], l12 = statementList[11], l13 = statementList[12], l14 = statementList[13], l15 = statementList[14], l16 = statementList[15], l17 = statementList[16], l18 = statementList[17], l19 = statementList[18], l20 = statementList[19], l21 = statementList[20], l22 = statementList[21], l23 = statementList[22], l24 = statementList[23], l25 = statementList[24], l26 = statementList[25], l27 = statementList[26], l28 = statementList[27], l29 = statementList[28], l30 = statementList[29], l31 = statementList[30], l32 = statementList[31], l33 = statementList[32], l34 = statementList[33], l35 = statementList[34], l36 = statementList[35], l37 = statementList[36], l38 = statementList[37], l39 = statementList[38], l40 = statementList[39];
  return () => {
    l1(), l2(), l3(), l4(), l5(), l6(), l7(), l8(), l9(), l10(), l11(), l12(), l13(), l14(), l15(), l16(), l17(), l18(), l19(), l20(), l21(), l22(), l23(), l24(), l25(), l26(), l27(), l28(), l29(), l30(), l31(), l32(), l33(), l34(), l35(), l36(), l37(), l38(), l39(), l40();
  }
};

// 一次执行 50 条
const exec50 = (statementList: Function[]) => {
  const l1 = statementList[0], l2 = statementList[1], l3 = statementList[2], l4 = statementList[3], l5 = statementList[4], l6 = statementList[5], l7 = statementList[6], l8 = statementList[7], l9 = statementList[8], l10 = statementList[9], l11 = statementList[10], l12 = statementList[11], l13 = statementList[12], l14 = statementList[13], l15 = statementList[14], l16 = statementList[15], l17 = statementList[16], l18 = statementList[17], l19 = statementList[18], l20 = statementList[19], l21 = statementList[20], l22 = statementList[21], l23 = statementList[22], l24 = statementList[23], l25 = statementList[24], l26 = statementList[25], l27 = statementList[26], l28 = statementList[27], l29 = statementList[28], l30 = statementList[29], l31 = statementList[30], l32 = statementList[31], l33 = statementList[32], l34 = statementList[33], l35 = statementList[34], l36 = statementList[35], l37 = statementList[36], l38 = statementList[37], l39 = statementList[38], l40 = statementList[39], l41 = statementList[40], l42 = statementList[41], l43 = statementList[42], l44 = statementList[43], l45 = statementList[44], l46 = statementList[45], l47 = statementList[46], l48 = statementList[47], l49 = statementList[48], l50 = statementList[49];
  return () => {
    l1(), l2(), l3(), l4(), l5(), l6(), l7(), l8(), l9(), l10(), l11(), l12(), l13(), l14(), l15(), l16(), l17(), l18(), l19(), l20(), l21(), l22(), l23(), l24(), l25(), l26(), l27(), l28(), l29(), l30(), l31(), l32(), l33(), l34(), l35(), l36(), l37(), l38(), l39(), l40(), l41(), l42(), l43(), l44(), l45(), l46(), l47(), l48(), l49(), l50();
  };
};

// 一次执行 60 条
const exec60 = (statementList: Function[]) => {
  const execTop30 = exec30(statementList.slice(0, 30));
  const execLast30 = exec30(statementList.slice(30, 60));
  return () => {
    execTop30(), execLast30();
  };
};

// 一次执行 70 条
const exec70 = (statementList: Function[]) => {
  const execTop40 = exec40(statementList.slice(0, 40));
  const execLast30 = exec30(statementList.slice(40, 70));
  return () => {
    execTop40(), execLast30();
  };
};

// 一次执行 80 条
const exec80 = (statementList: Function[]) => {
  const execTop40 = exec40(statementList.slice(0, 40));
  const execLast40 = exec40(statementList.slice(40, 80));
  return () => {
    execTop40(), execLast40();
  };
};

// 一次执行 90 条
const exec90 = (statementList: Function[]) => {
  const execTop50 = exec50(statementList.slice(0, 50));
  const execLast40 = exec40(statementList.slice(50, 90));
  return () => {
    execTop50(), execLast40();
  };
};

// 一次执行100条
const exec100 = (statementList: Function[]) => {
  const execTop50 = exec50(statementList.slice(0, 50));
  const execLast50 = exec50(statementList.slice(50, 100));
  return () => {
    execTop50(), execLast50();
  };
};
/**
 * 批量执行，底层是走 batchExec10
 */
const batchExec = (statementList: Function[]) => {
  const len = statementList.length;
  if (!len) return _.noop;
  if (len <= 10) return batchExec10(statementList);
  const batchExecStatements: Function[] = [];
  // 按 100 一组的个数
  const countOf100Items = len / 100 >> 0;
  let startIndex = 0;
  let endIndex = 0;
  for(let i = 0; i < countOf100Items; ++i) {
    startIndex = i * 100;
    endIndex = startIndex + 100;
    batchExecStatements.push(exec100(statementList.slice(startIndex, endIndex)));
  }

  // 小于10的尾数
  const countOfLt10 = len % 10;

  // 整十尾数
  const countOfLt100 = (len % 100) - countOfLt10;
  startIndex = endIndex;
  endIndex = startIndex + countOfLt100;
  if (countOfLt100 > 0) {
    // 按整十分割
    switch(countOfLt100) {
      case 10:
        batchExecStatements.push(batchExec10(statementList.slice(startIndex, endIndex)));
        break;
      case 20:
        batchExecStatements.push(exec20(statementList.slice(startIndex, endIndex)));
        break;
      case 30:
        batchExecStatements.push(exec30(statementList.slice(startIndex, endIndex)));
        break;
      case 40:
        batchExecStatements.push(exec40(statementList.slice(startIndex, endIndex)));
        break;
      case 50:
        batchExecStatements.push(exec50(statementList.slice(startIndex, endIndex)));
        break;
      case 60:
        batchExecStatements.push(exec60(statementList.slice(startIndex, endIndex)));
        break;
      case 70:
        batchExecStatements.push(exec70(statementList.slice(startIndex, endIndex)));
        break;
      case 80:
        batchExecStatements.push(exec80(statementList.slice(startIndex, endIndex)));
        break;
      case 90:
        batchExecStatements.push(exec90(statementList.slice(startIndex, endIndex)));
        break;
      default:
        throw new Error(`整十分割异常：${countOfLt100}`);
    }
  }

  // 最后尾数处理
  if (countOfLt10) {
    startIndex = endIndex;
    endIndex = startIndex + countOfLt10;
    batchExecStatements.push(batchExec10(statementList.slice(startIndex, endIndex)));
  }

  const batchExecStatementsLen = batchExecStatements.length;

  if (batchExecStatementsLen === 1) {
    return batchExecStatements[0];
  }
  if (batchExecStatementsLen <= 10) {
    return batchExec10(batchExecStatements);
  }
  // 递归输出
  return batchExec(batchExecStatements);
};

const checkDslIsLiteral= (dsl: DslJson, getLiteral: Function = _.noop) => {
  if (dsl.type === 'literal') {
    getLiteral(dsl.value);
  } else if (dsl.t === 'l') {
    getLiteral(dsl.v);
  } else if (_.isString(dsl) || _.isNumber(dsl) || _.isBoolean(dsl)) {
    getLiteral(dsl);
  } else {
    return false;
  }
  return true;
};

const checkDslListIsLiteral = (dslList?: DslJson[]) => {
  const literalValue: any[] = [];
  // 是否为字面量
  const isLiteral = dslList?.every(item =>
    checkDslIsLiteral(item, (value => literalValue.push(value)))
  );
  return { literalValue, isLiteral };
};

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
      ['callContinue', 'cCo'],
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
    const id = `scope-${++scopeId}`;
    this.varScope.$$__scope_id__$$ = id;
  }
  varScope: any = {
    __returnObject__: null,
    __isBreak__: false,
    __isContinue__: false,
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
  getValue(valueDsl: DslJson) {
    const isMemberExpression = this.checkMemberExpression(valueDsl);
    return !isMemberExpression ? dslResolve(valueDsl, this) : this.getObjMember(valueDsl);
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
  let(key: string, valueDsl?: DslJson, isVarKind: boolean = false, onlyDeclare: boolean = false, assignArg: boolean = false) {
    const varScope = this.varScope;
    let isLiteral = true;
    let literalValue: any;
    if (!valueDsl) {
    } else if (valueDsl.type === 'literal') {
      literalValue = valueDsl.value;
    } else if (valueDsl.t === 'l') {
      literalValue = valueDsl.v;
    } else if (_.isString(valueDsl) || _.isNumber(valueDsl)) {
      literalValue = valueDsl;
    } else {
      // 默认非字面量
      isLiteral = false;
    }
    if (_.has(varScope, key)) {
      if (isVarKind) {
          const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
          // 空声明
          if (onlyDeclare) {
            if (assignArg) { // 声明后赋值
              return (value: any) => {
                this.varScope[key] = value;
              };
            }
            return _.noop;
          }
          if (assignArg) { // 声明后赋值
            return (value: any) => {
              this.varScope[key] = value;
            };
          }
          if (isLiteral) {
            return () => {
              this.varScope[key] = literalValue;
            };
          }
          return () => {
            // 下面的赋值不能与最后一行的合并成一段语句，因为下一行的 preGetValue 方法可能会导致作用域转移
            this.varScope[key] = preGetValue();
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

      if (assignArg) {
        return (value: any) => {
          this.varScope[key] = value;
        };
      }

      const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
      if (isLiteral) {
        return (
          _.isUndefined(literalValue)
            ? _.noop
            : () => {
              this.varScope[key] = literalValue;
            }
        );
      }
      return () => {
        this.varScope[key] = preGetValue();
      };
    }
  }
  // var
  var(key: string, valueDsl?: DslJson, onlyDeclare: boolean = false, assignArg: boolean = false) {
    return this.let(key, valueDsl, true, onlyDeclare, assignArg);
  }
  batchVar(list: { key: string, value: any, k?: string, v?: any }[], assignArg: boolean = false) {
    let isDeclare = true;
    const varCalls = list.map((item) => {
      const { key, value, k, v } = item;
      const onlyDeclare = key ? !_.has(item, 'value') : !_.has(item, 'v');
      if (!onlyDeclare || assignArg) isDeclare = false;
      return key ? this.var(key, value, onlyDeclare, assignArg) : this.var(k!, v, onlyDeclare, assignArg);
    });
    // 没有批量声明
    if (isDeclare) {
      return function() {};
    }
    const len = list.length;
    if (assignArg) {
      return function(value: any) {
        for(let i = 0; i < len; ++i) {
          varCalls[i](value);
        }
      };
    }
    const batchExecStatements = batchExec(varCalls);
    return () => {
      try {
        batchExecStatements();
      } catch {}
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
    const parentPath: string[] = [];
    do {
      if (_.has(varScope, key)) {
        break;
      }
      varScope = varScope.__parentVarScope__;
      parentPath.push('__parentVarScope__');
    } while(Boolean(varScope));

    // 找不到作用域，直接返回 undefined
    if (!varScope) {
      return () => undefined;
    }

    if(!parentPath.length) {
      return () => this.varScope[key];
    } else if (varScope === globalScope) {
      return () => globalScope[key];
    } else {
      const keyPath = [...parentPath, key];
      const getMember = getMemberCall(keyPath.length, keyPath);
      return () => getMember(this.varScope);
    }
  }
  getLet(key: string) {
    return this.getConst(key);
  }
  getVar(key: string) {
    return this.getConst(key);
  }
  // 获取形参 ---- 等同于 getConst
  getArg(key: string) {
    return this.getConst(key);
  }
  // 获取对象的成员
  getObjMember(memberDsl: DslJson) {
    const keyPathOfDsl = this.getMemberExpressionValue(memberDsl);
    return this.getOrAssignOrDissocPath(keyPathOfDsl, undefined, undefined, 'get');
  }
  // 取值、赋值与删除对象成员
  getOrAssignOrDissocPath(
    keyPathOfDsl: (string | DslJson)[],
    valueDsl?: DslJson,
    operator?: AssignmentOperator,
    type: 'get' | 'parentAndLastKey' | 'assign' | 'dissocPath' = 'get',
    assignArg: boolean = false
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

    // 是否有 lastkey
    const hasLastKey = Boolean(lastKeyCall);

    const parentLen = parentKeyPathCalls.length;
    const isSimple = keyPathOfDsl.every((item, index) => {
      if (index === keyPathOfDsl.length - 1) {
        return true;
      }
      return _.isString(item) || _.isNumber(item);
    });

    const lastKeyDsl = keyPathOfDsl[keyPathOfDsl.length - 1];
    const lastKeyIsSimple = _.isString(lastKeyDsl) || _.isNumber(lastKeyDsl);

    // 当前的根作用域
    let currentRootScopeType: string = 'local'; // 取 this.varScope;;

    /**
     * 是否有根作用域
     * 非 Identifier 类型，firstKeyCall 就是它的根作用域
     */
    let hasCurrentRootScope: boolean = !isIdentifier;

    const parentVarScopeKeyPath: string[] = [];
    if (isIdentifier) { // Identifier 类型
      const firstKey = firstKeyCall();
      if (_.hasIn(this.varScope, firstKey)) {
        // 当前作用域下
        hasCurrentRootScope = true;
      } else {
        // 当前作用域找不到，往上找
        let parent = this.varScope.__parentVarScope__;
        parentVarScopeKeyPath.push('__parentVarScope__');
        while(Boolean(parent)) {
          if (_.hasIn(parent, firstKey)) { // 找到作用域
            if (parent === globalScope) {
              parentVarScopeKeyPath.length = 0; // 直接访问全局变量
              currentRootScopeType = 'global'; // 取 globalScope;
            }
            hasCurrentRootScope = true;
            break;
          }
          parent = parent.__parentVarScope__;
          parentVarScopeKeyPath.push('__parentVarScope__');
        }
      }
    }

    const parentVarScopeKeyPathLen = parentVarScopeKeyPath.length;

    if (hasCurrentRootScope) {
      const parentKeyPath: any[] = [...parentVarScopeKeyPath];

      // 简单模式
      if (isSimple) {
        parentKeyPathCalls.forEach(item => parentKeyPath.push(item()));
      }

      // 父级 keyPath，即除了 lastKey 的 keyPath
      const getParentKeyPath = () => {
        for(let i = 0; i < parentLen; ++i) {
          parentKeyPath[i + parentVarScopeKeyPathLen] = parentKeyPathCalls[i]();
        }
        return parentKeyPath;
      };

      // memberlen 的取值必须在 lastKey 追加的操作之前，否则 memberlen长度会出错
      let memberLen = parentKeyPath.length;

      // 返回完整 keyPath
      const lastKeyIndex = parentVarScopeKeyPathLen + parentLen;
      // 存在 lastKey，并且 lastKeyIsSimple，把 lastKey 追加到「parentKeyPath」
      if (hasLastKey && lastKeyIsSimple) {
        parentKeyPath[lastKeyIndex] = lastKeyCall();
      }
      const getFullKeyPath =
        hasLastKey && !lastKeyIsSimple
        ? () => {
          parentKeyPath[lastKeyIndex] = lastKeyCall();
          return getParentKeyPath();
        }
        : getParentKeyPath;

      const fullKeyPathLen = hasLastKey ? lastKeyIndex + 1 : 0;

      // isSimple 时的获取成员
      const getSimpleMember = getMemberCall(memberLen, parentKeyPath);

      let updateLastKey: Function = _.noop;

      // isSimple 时返回值
      const getSimpleTargetValue = getMemberCall(fullKeyPathLen, parentKeyPath, (updateLastKeyCall) => updateLastKey = updateLastKeyCall);

      // 获取目标作用域
      let getTargetScope: any;

      /**
       * 获取目标值
       * 公提供给 type === 'get'
       */
      let getTargetValue: any;

      if (!isIdentifier) {
        if (isSimple) {
          getTargetScope = () => getSimpleMember(firstKeyCall());
          if (lastKeyIsSimple) {
            getTargetValue = () => getSimpleTargetValue(firstKeyCall())
          } else if (hasLastKey) {
            // 有 lastKey
            getTargetValue = () => {
              updateLastKey(lastKeyCall());
              return getSimpleTargetValue(firstKeyCall());
            }
          } else {
            getTargetValue = () => {
              return getSimpleTargetValue(firstKeyCall());
            }
          }

        } else {
          /**
           * 非「isSimple」，parentKeyPath 没有组装「parentKeyPathCalls」的结果
           * memberLen 需要把 parentKeyPathCalls 的长度补上
           */
          memberLen += parentKeyPathCalls.length;
          // fullKeyPathLen += parentKeyPathCalls.length;
          const getMember = getMemberCall(memberLen);
          const getValue = getMemberCall(fullKeyPathLen);
          getTargetScope = () => getMember(firstKeyCall(), getParentKeyPath());
          getTargetValue = () => getValue(firstKeyCall(), getFullKeyPath());
        }
      } else if (isSimple) {
        getTargetScope = (
          currentRootScopeType === 'local'
            ? () => getSimpleMember(this.varScope)
            : () => getSimpleMember(globalScope)
        );
        if (lastKeyIsSimple) {
          getTargetValue = (
            currentRootScopeType === 'local'
              ? () => getSimpleTargetValue(this.varScope)
              : () => getSimpleTargetValue(globalScope)
          );
        } else {
          getTargetValue = (
            currentRootScopeType === 'local'
              ? () => {
                updateLastKey(lastKeyCall());
                return getSimpleTargetValue(this.varScope);
              }
              : () => {
                updateLastKey(lastKeyCall());
                return getSimpleTargetValue(globalScope);
              }
          );
        }
      } else {
        /**
         * 非「isSimple」，parentKeyPath 没有组装「parentKeyPathCalls」的结果
         * memberLen 需要把 parentKeyPathCalls 的长度补上
         */
        memberLen += parentKeyPathCalls.length;
        const getMember = getMemberCall(memberLen);
        const getValue = getMemberCall(fullKeyPathLen);
        getTargetScope = (
          currentRootScopeType === 'local'
            ? () => getMember(this.varScope, getParentKeyPath())
            : () => getMember(globalScope, getParentKeyPath())
        );
        getTargetValue = (
          currentRootScopeType === 'local'
          ? () => {
            const fullKeyPath = getFullKeyPath();
            return getValue(this.varScope, fullKeyPath);
          }
          : () => getValue(globalScope, getFullKeyPath())
        );
      }

      switch(type) {
        case 'assign': {
          const preGetValue = valueDsl ? this.getValue(valueDsl) : _.noop;
          let isLiteral = true;
          let literalValue: any;
          if (valueDsl!.t === 'l') {
            literalValue = valueDsl!.v;
          } else if (valueDsl!.type === 'literal') {
            literalValue = valueDsl!.value;
          } else {
            isLiteral = false;
          }
          const getResult = this.getResultByOperator(operator);
          // 这里不需要针对 lastKeyIsSimple 做优化，因为优化后性能看不出区别
          if (assignArg) {
            return (value: any) => {
              const targetScope = getTargetScope();
              const lastKey = lastKeyCall();
              const result = getResult(targetScope[lastKey], value);
              try {
                return targetScope[lastKey] = result;
              } catch (err) {
                const errMsg = err.toString();
                if (
                  errMsg.indexOf('assign to read only property') !== -1 // 开发环境
                  || errMsg.indexOf('assign to readonly property') !== -1 // 真机
                ) {
                  // 只读属性被赋值，忽略
                  return result;
                }
                throw err;
              }
            };
          }
          if (isLiteral) {
            return () => {
              const targetScope = getTargetScope();
              const lastKey = lastKeyCall();
              const result = getResult(targetScope[lastKey], literalValue);
              try {
                return targetScope[lastKey] = result;
              } catch (err) {
                const errMsg = err.toString();
                if (
                  errMsg.indexOf('assign to read only property') !== -1 // 开发环境
                  || errMsg.indexOf('assign to readonly property') !== -1 // 真机
                ) {
                  // 只读属性被赋值，忽略
                  return result;
                }
                throw err;
              }
            };
          }
          return () => {
            const targetScope = getTargetScope();
            const lastKey = lastKeyCall();
            // 要在 lastKey 之后调用 preGetValue
            const value = preGetValue();
            const result = getResult(targetScope[lastKey], value);
            try {
              return targetScope[lastKey] = result;
            } catch (err) {
              const errMsg = err.toString();
                if (
                  errMsg.indexOf('assign to read only property') !== -1 // 开发环境
                  || errMsg.indexOf('assign to readonly property') !== -1 // 真机
                ) {
                  // 只读属性被赋值，忽略
                  return result;
                }
                throw err;
            }
          };
        }
        case 'dissocPath': {
          // 删除指定属性
          return () => {
            const targetScope = getTargetScope();
            const lastKey = lastKeyCall();
            try {
              delete targetScope[lastKey!];
            } catch {}
          };
        }
        case 'get': {
          return () => {
            try {
              return getTargetValue();
            } catch (err) {
              console.log('getOrAssignOrDissocPath, type === "get" 失败', {
                keyPathOfDsl,
                fullKeyPathLen,
                currentRootScopeType,
                'this.varScope': this.varScope,
                globalScope,
                isSimple,
                lastKeyIsSimple,
                hasLastKey,
                parentVarScopeKeyPath,
              });
              throw err;
            }
          };
        }
        case 'parentAndLastKey': {
          if (lastKeyIsSimple || !lastKeyCall) {
            const lastKey = lastKeyCall ? lastKeyCall() : undefined;
            return () => {
              return { parent: getTargetScope(), lastKey };
            };
          }
          return () => {
            const targetScope = getTargetScope();
            const lastKey = lastKeyCall();
            return { parent: targetScope, lastKey };
          };
        }
        default: console.warn('===== 未知类型：', type);
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
        console.log('keyPathOfDsl', {keyPathOfDsl, lastKeyCall, isIdentifier, type});
        const lastKey = lastKeyCall();
        throw new Error(`对象${parentKeyPath.join('.')}不存在成员：${lastKey}`);
      };
    }
  }
  assignLet(keyDsl: DslJson, valueDsl?: DslJson, operator?: AssignmentOperator, assignArg: boolean = false) {
    const keyPathOfDsl = this.checkMemberExpression(keyDsl) ? this.getMemberExpressionValue(keyDsl) : [keyDsl];
    return this.getOrAssignOrDissocPath(keyPathOfDsl, valueDsl, operator, 'assign', assignArg);
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
  callReturn(dslJson?: DslJson) {
    this.varScope.__hasReturnStatement__ = true;
    // 标记已经返回
    if (dslJson) {
      let literalValue: any;
      const isLiteral = checkDslIsLiteral(dslJson, (value) => literalValue = value);
      if (isLiteral) {
        return () => {
          this.varScope.__returnObject__ = {
            result: literalValue
          }
        };
      }
      const preGetValue = this.getValue(dslJson);
      return () => {
        const result = preGetValue();
        this.varScope.__returnObject__ = {
          result
        }
      };
    }
    return () => {
      this.varScope.__returnObject__ = { result: undefined }
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
  // continue
  callContinue(label?: string) {
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
        this.varScope.__isContinue__ = true;
      };
    } else {
      return () => {
        this.varScope.__isContinue__ = true;
      };
    }
  }
  // 一元运算
  callUnary(operator: UnaryOperator, valueDsl: DslJson) {
    const isMemberExpression = this.checkMemberExpression(valueDsl);
    const preGetValue = this.getValue(valueDsl);
    const isLiteral = valueDsl.t === 'l' || valueDsl.type === 'literal';
    let literal: any;
    if (isLiteral) {
      literal = valueDsl.hasOwnProperty('t') ? valueDsl.v : valueDsl.value;
    }
    switch(operator) {
      case "-": {
        if (isLiteral) {
          const literalRes = -literal;
          return () => literalRes;
        }
        return () => -preGetValue();
      }
      case "+": {
        if (isLiteral) {
          const literalRes = +literal;
          return () => literalRes;
        }
        return () => +preGetValue();
      }
      case "!": {
        if (isLiteral) {
          const literalRes = !literal;
          return () => literalRes;
        }
        return () => !preGetValue();
      }
      case "~": {
        if (isLiteral) {
          const literalRes = ~literal;
          return () => literalRes;
        }
        return () => ~preGetValue();
      }
      case "typeof": {
        if (isLiteral) {
          const literalRes = typeof literal;
          return () => literalRes;
        }
        return () => typeof preGetValue();
      }
      case "void": {
        if (isLiteral) {
          const literalRes = void literal;
          return () => literalRes;
        }
        return () => void preGetValue();
      }
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
    let leftIsLiteral = false;
    let rightIsLiteral = false;
    let leftLiteral: any;
    let rightLiteral: any;
    if (leftDsl.hasOwnProperty('l')) {
      // 压缩的代码
      leftIsLiteral = leftDsl.t === 'l';
      leftLiteral = leftDsl.v;
      rightIsLiteral = rightDsl.t === 'l';
      rightLiteral = rightDsl.v;
    } else {
      leftIsLiteral = leftDsl.type === 'literal';
      leftLiteral = leftDsl.value;
      rightIsLiteral = rightDsl.type === 'literal';
      rightLiteral = rightDsl.value;
    }

    if (leftIsLiteral && rightIsLiteral) {
      let result: any;
      // 性能最佳情况
      switch(operator) {
        case "==":
          result = leftLiteral == rightLiteral;
          break;
        case "!=":
          result = leftLiteral != rightLiteral;
          break;
        case "===":
          result = leftLiteral === rightLiteral;
          break;
        case "!==":
          result = leftLiteral !== rightLiteral;
          break;
        case "<":
          result = leftLiteral < rightLiteral;
          break;
        case "<=":
          result = leftLiteral <= rightLiteral;
          break;
        case ">":
          result = leftLiteral > rightLiteral;
          break;
        case ">=":
          result = leftLiteral >= rightLiteral;
          break;
        case "<<":
          result = leftLiteral << rightLiteral;
          break;
        case ">>":
          result = leftLiteral >> rightLiteral;
          break;
        case ">>>":
          result = leftLiteral >>> rightLiteral;
          break;
        case "+":
          result = leftLiteral + rightLiteral;
          break;
        case "-":
          result = leftLiteral - rightLiteral;
          break;
        case "*":
          result = leftLiteral * rightLiteral;
          break;
        case "/":
          result = leftLiteral / rightLiteral;
          break;
        case "%":
          result = leftLiteral % rightLiteral;
          break;
        case "|":
          result = leftLiteral | rightLiteral;
          break;
        case "^":
          result = leftLiteral ^ rightLiteral;
          break;
        case "&":
          result = leftLiteral & rightLiteral;
          break;
        case "in":
          result = leftLiteral in rightLiteral;
          break;
        case "instanceof":
          result = leftLiteral instanceof rightLiteral;
          break;
        default:
          return () => {
            throw new Error(`未知的二元运算符：${operator}`);
          };
      }
      return () => result;
    } else if (leftIsLiteral) {
      switch(operator) {
        case "==":
          return () => leftLiteral == getRight();
        case "!=":
          return () => leftLiteral != getRight();
        case "===":
          return () => leftLiteral === getRight();
        case "!==":
          return () => leftLiteral !== getRight();
        case "<":
          return () => leftLiteral < getRight();
        case "<=":
          return () => leftLiteral <= getRight();
        case ">":
          return () => leftLiteral > getRight();
        case ">=":
          return () => leftLiteral >= getRight();
        case "<<":
          return () => leftLiteral << getRight();
        case ">>":
          return () => leftLiteral >> getRight();
        case ">>>":
          return () => leftLiteral >>> getRight();
        case "+":
          return () => leftLiteral + getRight();
        case "-":
          return () => leftLiteral - getRight();
        case "*":
          return () => leftLiteral * getRight();
        case "/":
          return () => leftLiteral / getRight();
        case "%":
          return () => leftLiteral % getRight();
        case "|":
          return () => leftLiteral | getRight();
        case "^":
          return () => leftLiteral ^ getRight();
        case "&":
          return () => leftLiteral & getRight();
        case "in":
          return () => leftLiteral in getRight();
        case "instanceof":
          return () => leftLiteral instanceof getRight();
        default:
          return () => {
            throw new Error(`未知的二元运算符：${operator}`);
          };
      }
    } else if (rightIsLiteral) {
      switch(operator) {
        case "==":
          return () => getLeft() == rightLiteral;
        case "!=":
          return () => getLeft() != rightLiteral;
        case "===":
          return () => getLeft() === rightLiteral;
        case "!==":
          return () => getLeft() !== rightLiteral;
        case "<":
          return () => getLeft() < rightLiteral;
        case "<=":
          return () => getLeft() <= rightLiteral;
        case ">":
          return () => getLeft() > rightLiteral;
        case ">=":
          return () => getLeft() >= rightLiteral;
        case "<<":
          return () => getLeft() << rightLiteral;
        case ">>":
          return () => getLeft() >> rightLiteral;
        case ">>>":
          return () => getLeft() >>> rightLiteral;
        case "+":
          return () => getLeft() + rightLiteral;
        case "-":
          return () => getLeft() - rightLiteral;
        case "*":
          return () => getLeft() * rightLiteral;
        case "/":
          return () => getLeft() / rightLiteral;
        case "%":
          return () => getLeft() % rightLiteral;
        case "|":
          return () => getLeft() | rightLiteral;
        case "^":
          return () => getLeft() ^ rightLiteral;
        case "&":
          return () => getLeft() & rightLiteral;
        case "in":
          return () => getLeft() in rightLiteral;
        case "instanceof":
          return () => getLeft() instanceof rightLiteral;
        default:
          return () => {
            throw new Error(`未知的二元运算符：${operator}`);
          };
      }
    } else {
      // 性能最差情况
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
  }
  // 更新
  callUpdate(operator: UpdateOperator, argument: DslJson, prefix: boolean) {
    const keyPathDsl = this.checkMemberExpression(argument) ? this.getMemberExpressionValue(argument) : [argument];
    const getParentAndLastKey = this.getOrAssignOrDissocPath(keyPathDsl, undefined, undefined, 'parentAndLastKey') as Function;
    switch(true) {
      case prefix && operator === '++': {
        return () => {
          const { parent, lastKey } = getParentAndLastKey();
          return ++parent[lastKey];
        };
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
    let leftIsLiteral = false;
    let rightIsLiteral = false;
    let leftLiteral: any;
    let rightLiteral: any;
    if (leftDsl.hasOwnProperty('l')) {
      // 压缩的代码
      leftIsLiteral = leftDsl.t === 'l';
      leftLiteral = leftDsl.v;
      rightIsLiteral = rightDsl.t === 'l';
      rightLiteral = rightDsl.v;
    } else {
      leftIsLiteral = leftDsl.type === 'literal';
      leftLiteral = leftDsl.value;
      rightIsLiteral = rightDsl.type === 'literal';
      rightLiteral = rightDsl.value;
    }
    if (leftIsLiteral && rightIsLiteral) {
      // 性能最佳情况
      let result: any;
      switch(operator) {
        case "||":
          result = leftLiteral || rightLiteral;
          break;
        case "&&":
          result = leftLiteral && rightLiteral;
          break;
      }
      return () => result;
    } else if (leftIsLiteral) {
      switch(operator) {
        case "||":
          return () => leftLiteral || getRight();
        case "&&":
          return () => leftLiteral && getRight();
      }
    } else if (rightIsLiteral) {
      switch(operator) {
        case "||":
          return () => getLeft() || rightLiteral;
        case "&&":
          return () => getLeft() && rightLiteral;
      }
    } else {
      // 性能最差情况
      switch(operator) {
        case "||":
          return () => getLeft() || getRight();
        case "&&":
          return () => getLeft() && getRight();
      }
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
    let hasBreakStatement = false;
    let hasContinueStatement = false;
    let hasReturnStatement = false;
    const resolveCall = body ? dslResolve(body, this, true) : _.noop;
    if (body) {
      hasBreakStatement = this.varScope.__hasBreakStatement__;
      hasContinueStatement = this.varScope.__hasContinueStatement__;
      hasReturnStatement = this.varScope.__hasReturnStatement__;
    }
    if (!hasBreakStatement && !hasContinueStatement && !hasReturnStatement) {
      return () => {
        while(testCall()) {
          resolveCall();
        }
      };
    }
    return () => {
      const currentVarScope = this.varScope;
      while(testCall()) {
        const storeSupportBreak = currentVarScope.__supportBreak__;
        const storeSupportContinue = currentVarScope.__supportContine__;
        currentVarScope.__supportBreak__ = true;
        currentVarScope.__supportContine__ = true;
        resolveCall();
        if (currentVarScope.__supportBreak__ !== storeSupportBreak) {
          currentVarScope.__supportBreak__ = storeSupportBreak;
        }
        if (currentVarScope.__supportContine__ !== storeSupportContinue) {
          currentVarScope.__supportContine__ = storeSupportContinue;
        }
        if (currentVarScope.__isContinue__) {
          if (currentVarScope.__isContinueLabel__) {
            break;
          } else {
            currentVarScope.__isContinue__ = false;
          }
        } else if (currentVarScope.__isBreak__) {
          if (!currentVarScope.__isBreakLabel__) currentVarScope.__isBreak__ = false;
          break;
        } else if (currentVarScope.__returnObject__) {
          // 遇到 return 语句
          break;
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
      const storeSupportBreak = currentVarScope.__supportBreak__;
      const storeSupportContinue = currentVarScope.__supportContine__;
      currentVarScope.__supportBreak__ = true;
      currentVarScope.__supportContine__ = true;
      resolveCall();
      if (currentVarScope.__supportBreak__ !== storeSupportBreak) {
        currentVarScope.__supportBreak__ = storeSupportBreak;
      }
      if (currentVarScope.__supportContine__ !== storeSupportContinue) {
        currentVarScope.__supportContine__ = storeSupportContinue;
      }
      if (currentVarScope.__isBreak__) {
        if (!currentVarScope.__isBreakLabel__) currentVarScope.__isBreak__ = false;
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

    let hasBreakStatement = false;
    let hasContinueStatement = false;
    let hasReturnStatement = false;

    const resolveBody = body ? dslResolve(body, this, true) : _.noop;
    if (body) {
      hasBreakStatement = this.varScope.__hasBreakStatement__;
      hasContinueStatement = this.varScope.__hasContinueStatement__;
      hasReturnStatement = this.varScope.__hasReturnStatement__;
    }
    if (!hasBreakStatement && !hasContinueStatement && !hasReturnStatement) {
      return () => {
        for(resolveInit(); resolveTest(); resolveUpdate()) {
          resolveBody();
        }
      };
    }
    return () => {
      const currentVarScope = this.varScope;
      for(resolveInit(); resolveTest(); resolveUpdate()) {
        const storeSupportBreak = currentVarScope.__supportBreak__;
        const storeSupportContinue = currentVarScope.__supportContine__;
        currentVarScope.__supportBreak__ = true;
        currentVarScope.__supportContine__ = true;
        resolveBody();
        if (currentVarScope.__supportBreak__ !== storeSupportBreak) {
          currentVarScope.__supportBreak__ = storeSupportBreak;
        }
        if (currentVarScope.__supportContine__ !== storeSupportContinue) {
          currentVarScope.__supportContine__ = storeSupportContinue;
        }

        if (currentVarScope.__isContinue__) {
          if (currentVarScope.__isContinueLabel__) {
            break;
          } else {
            currentVarScope.__isContinue__ = false;
          }
        } else if (currentVarScope.__isBreak__) {
          if (!currentVarScope.__isBreakLabel__) currentVarScope.__isBreak__ = false;
          break;
        } else if (currentVarScope.__returnObject__) {
          // 遇到 return 语句
          break;
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
      resolveLeft = this.assignLet(leftDsl, undefined, undefined, true);
    } else {
      const dsl = leftDsl as DslJson;
      const leftDslValue = dsl.v || dsl.value;
      if (leftDslValue?.[1]?.[0]) {
        // 声明语句
        resolveLeft = this.batchVar(leftDslValue[1], true);
      }
    }
    let hasBreakStatement = false;
    let hasContinueStatement = false;
    let hasReturnStatement = false;

    const resolveBody = dslResolve(body, this, true);

    if (body) {
      hasBreakStatement = this.varScope.__hasBreakStatement__;
      hasContinueStatement = this.varScope.__hasContinueStatement__;
      hasReturnStatement = this.varScope.__hasReturnStatement__;
    }

    if (!hasBreakStatement && !hasContinueStatement && !hasReturnStatement) {
      return () => {
        const targetObj = getTargetObj();
        for(const item in targetObj) {
          resolveLeft(item);
          resolveBody();
        }
      };
    }

    return () => {
      const currentVarScope = this.varScope;
      const targetObj = getTargetObj();
      for(const item in targetObj) {
        resolveLeft(item);
        const storeSupportBreak = currentVarScope.__supportBreak__;
        const storeSupportContinue = currentVarScope.__supportContine__;
        currentVarScope.__supportBreak__ = true;
        currentVarScope.__supportContine__ = true;
        resolveBody();
        if (currentVarScope.__supportBreak__ !== storeSupportBreak) {
          currentVarScope.__supportBreak__ = storeSupportBreak;
        }
        if (currentVarScope.__supportContine__ !== storeSupportContinue) {
          currentVarScope.__supportContine__ = storeSupportContinue;
        }
        if (currentVarScope.__isContinue__) {
          if (currentVarScope.__isContinueLabel__) {
            break;
          } else {
            currentVarScope.__isContinue__ = false;
          }
        } else if (currentVarScope.__isBreak__) {
          if (!currentVarScope.__isBreakLabel__) currentVarScope.__isBreak__ = false;
          break;
        } else if (currentVarScope.__returnObject__) {
          // 遇到 return 语句
          break;
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
    isDeclaration = false,
    preResolve?: (self: Customize) => void
  ) {
    const parentVarScope = this.varScope;
    // 预解析使用的 customize
    const customize = isBlockStatement ? this : new Customize(parentVarScope);

    if (preResolve) {
      preResolve(customize);
    }

    // 以下用于定位错位信息
    // customize.varScope.$$__body__$$ = body;
    // customize.varScope.$$__params__$$ = params;

    let setArguments: any = _.noop;
    let setThis: any = _.noop;

    // 初始化实参
    if (!isBlockStatement) {
      // 在函数上下文挂载 arguments，但是不赋值
      setArguments = customize.var('arguments', undefined, undefined, true);
      // 在函数上下文中挂载 this，但是不赋值
      setThis = customize.var('this', undefined, undefined, true);
      // 标记有子函数
      parentVarScope.__containFunction__ = true;
    }

    // 初始化形参
    const paramsLen = params.length;
    const initParams = (() => {
      for(let i = 0; i < paramsLen; ++i) {
        customize.var(params[i]!);
      }
      return (args) => {
        for(let i = 0; i < paramsLen; ++i) {
          customize.varScope[params[i]] = args[i];
        }
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
    const bodyLen = body.length;
    for(let i = 0; i < bodyLen; ++i) {
      const item = body[i];
      if (item.t === 'd' || item.type === 'declare-function') {
        const functionName = item.n || item.name;
        if (functionName) {
          Object.assign(customize.varScope, { [functionName]: undefined });
        }
      }
    }

    // 当前的 label 名
    const currentLabel = customize.varScope.__tmpLabel__;
    if (currentLabel) {
      delete customize.varScope.__tmpLabel__;
    }

    let hasBreakStatement = false;
    let hasContinueStatement = false;
    let hasReturnStatement = false;

    // body 预解析
    const lines: any[] = [];
    const lineInfos: any[] = [];
    for(let i = 0; i < bodyLen; ++i) {
      const item = body[i];
      if (!item) {
        continue;
      }
      const execLine = dslResolve(item, customize);
      const lineInfo: any = {};
      if(customize.varScope.__hasBreakStatement__) {
        hasBreakStatement = true;
        lineInfo.hasBreakStatement = true;
        customize.varScope.__hasBreakStatement__ = false; // 重置为 false，防止干扰其它 block
      }
      if (customize.varScope.__hasContinueStatement__) {
        hasContinueStatement = true;
        lineInfo.hasContinueStatement = true;
        customize.varScope.__hasContinueStatement__ = false; // 重置为 false，防止干扰其它 block
      }
      if(customize.varScope.__hasReturnStatement__) {
        hasReturnStatement = true;
        lineInfo.hasReturnStatement = true;
        customize.varScope.__hasReturnStatement__ = false; // 重置为 false，防止干扰其它 block
      }
      lineInfos.push(lineInfo);
      lines.push(execLine);
    }

    if (!isBlockStatement) {
      lines.shift();
      lineInfos.shift();
    }

    // 重新标记
    customize.varScope.__hasBreakStatement__ = hasBreakStatement;
    customize.varScope.__hasContinueStatement__ = hasContinueStatement;
    customize.varScope.__hasReturnStatement__ = hasReturnStatement;

    const containFunction = customize.varScope.__containFunction__;

    const len = lines.length;
    // 执行链
    for(let i = len - 1; i >= 0; --i) {
      const execLine = lines[i];
      const lineInfo = lineInfos[i];
      let nextExecLine = lines[i + 1];
      let currentLine: any;
      if (isBlockStatement) { // 块才需要处理 break 或 continue
        const hasLabel = Boolean(customize.varScope.__label__);
        if (lineInfo.hasBreakStatement || lineInfo.hasContinueStatement || lineInfo.hasReturnStatement) {
          currentLine = (
            hasLabel
              ? () => {
                execLine();
                const currentVarScope = customize.varScope;
                if (currentVarScope.__isBreak__) {
                  if (currentVarScope.__supportBreak__) {
                    const keep = hasLabel && currentVarScope.__label__ !== currentLabel;
                    currentVarScope.__isBreakLabel__ = keep;
                    if (hasLabel && !keep) {
                      currentVarScope.__label__ = '';
                    }
                    currentLine.next = null;
                  } else {
                    throw new Error('Uncaught SyntaxError: Illegal break statement');
                  }
                } else if (currentVarScope.__isContinue__) {
                  if (currentVarScope.__supportContine__) {
                    if (hasLabel && currentVarScope.__label__ !== currentLabel) {
                      // continue label
                      currentVarScope.__isContinueLabel__ = true;
                    } else {
                      currentVarScope.__isContinueLabel__ = false;
                    }
                    currentLine.next = null;
                  } else {
                    throw new Error('Uncaught SyntaxError: Illegal continute statement');
                  }
                } else if (customize.varScope.__returnObject__) {
                  // 表示上一个语句已经执行了 return;
                  currentLine.next = null;
                } else if (!currentLine.next) {
                  currentLine.next = nextExecLine;
                }
              }
            : () => {
              execLine();
              const currentVarScope = customize.varScope;
              if (currentVarScope.__isBreak__) {
                if (currentVarScope.__supportBreak__) {
                  // currentVarScope.__isBreakLabel__ = false;
                  currentLine.next = null;
                } else {
                  throw new Error('Uncaught SyntaxError: Illegal break statement');
                }
              } else if (currentVarScope.__isContinue__) {
                if (currentVarScope.__supportContine__) {
                  // currentVarScope.__isContinueLabel__ = false;
                  currentLine.next = null;
                } else {
                  throw new Error('Uncaught SyntaxError: Illegal continute statement');
                }
              } else if (currentVarScope.__returnObject__) {
                // 表示上一个语句已经执行了 return;
                currentLine.next = null;
              } else if (!currentLine.next) {
                currentLine.next = nextExecLine;
              }
            }
          );
        }
      } else if (lineInfo.hasReturnStatement) {
        // 函数有返回语句
        currentLine = () => {
          execLine();
          if (customize.varScope.__returnObject__) {
            // 表示上一个语句已经执行了 return;
            currentLine.next = null;
          } else if (!currentLine.next) {
            currentLine.next = nextExecLine;
          }
        };
      }
      // 需要更新当前的 line
      if (currentLine) {
        lines[i] = currentLine;
      }
      lines[i].next = nextExecLine;
    }

    const batchExecLines: Function = (() => {
      if (len === 1) {
        return lines[0];
      } else if (!hasBreakStatement && !hasContinueStatement && !hasReturnStatement) {
        return batchExec(lines);
      } else {
        return () => {
          let current = lines[0];
          while(current) {
            current();
            current = current.next;
          }
        };
      }
    })();

    if (isBlockStatement) { // 块
      if (!supportBreak) {
        /**
         * 不支持 break 语句的块（一定也不支持 continue 语句）
         * 即当前为一个普通的块，而非 for/while/doWhile/switch
         */
        return () => {
          const currentVarScope = customize.varScope;
          const storeSupportBreak = currentVarScope.__supportBreak__;
          const storeSupportContinue = currentVarScope.__supportContine__;
          batchExecLines();
          if (currentVarScope.__supportBreak__ !== storeSupportBreak) {
            currentVarScope.__supportBreak__ = storeSupportBreak;
          }
          if (currentVarScope.__supportContine__ !== storeSupportContinue) {
            currentVarScope.__supportContine__ = storeSupportContinue;
          }
        };
      }
      /**
       * 以下是 for/while/doWhile/switch
       * 需要借助 for & while 原生自带的性能优化提升速度
       */
      return batchExecLines;
    } else { // 函数
      let FreshVarScope;
      // 执行函数
      function execFunction () {
        const prevVarScope = customize.varScope;
        // 重置 varScope
        const currentVarScope = new FreshVarScope();
        // 临时存储堆
        customize.varScope = currentVarScope;

        // 在函数上下文挂载 arguments
        setArguments(arguments);
        // 在函数上下文中挂载 this
        setThis(this || globalScope);
        initParams(arguments);

        // 执行作用域入栈
        containFunction && execScopeStack.push(currentVarScope);
        try {
          batchExecLines();
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
      /**
       * nameSpaceVarScope 表示具体作用域注册进来的新变量
       */
      return (nameSpaceVarScope?: Record<string, any>) => {
        // 相当于初始化函数
        const varScope = { ...initVarScope };
        if (nameSpaceVarScope) {
          Object.assign(varScope, nameSpaceVarScope);
        }
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
    const dslLen = (calleeDsl as DslJson[]).length;

    const getParentAndLastKey: Function = this.getOrAssignOrDissocPath(calleeDsl, undefined, undefined, dslLen === 1 ? 'get' : 'parentAndLastKey');

    const paramsLen = paramsDsl?.length;
    const paramItems = paramsDsl?.map(item => this.getValue(item));

    const { literalValue, isLiteral } = checkDslListIsLiteral(paramsDsl);

    const getParams = () => {
      const params: any[] = new Array(paramsLen);
      for(let i = 0; i < paramsLen!; ++i) {
        params[i] = paramItems![i]();
      }
      return params;
    }

    // const noFunction = (type) => {
    //   console.log('type:', {
    //     type,
    //     calleeDsl,
    //     paramsDsl
    //   });
    //   // 表示类型出错
    //   throw new Error(`非函数类型： ${_.isArray(calleeDsl) ? (calleeDsl as DslJson[]).join('.') : ((calleeDsl as DslJson)?.value || (calleeDsl as DslJson)?.v)}`);
    // };

    let returnNewClass = () => {
      const { parent, lastKey } = getParentAndLastKey();
      // try {
        return new parent[lastKey];
      // } catch {
      //   noFunction('class');
      // }
    };

    // 纯函数
    let returnNewIdentifierClass = () => {
      const parent = getParentAndLastKey();
      // try {
        return new parent;
      // } catch {
      //   noFunction('class');
      // }
    };

    let returnFunctionCall = () => {
      const { parent, lastKey } = getParentAndLastKey();
      // try {
        return parent[lastKey]();
      // } catch (err) {
      //   console.log('**** callFun err ****', err, { calleeDslJson, paramsDsl, lastKey, parent, thisVarScope: this.varScope });
      //   throw err;
      // }
    };

    let returnIdentifierFunctionCall = () => {
      const parent = getParentAndLastKey();
      // try {
        return parent();
      // } catch (err) {
      //   console.log('**** callFun err ****', err, { calleeDslJson, paramsDsl, parent, thisVarScope: this.varScope });
      //   throw err;
      // }
    };

    if (paramsLen) {
      if (isLiteral) {
        returnNewClass = () => {
          const { parent, lastKey } = getParentAndLastKey();
          // try {
            return new parent[lastKey](...literalValue);
          // } catch {
          //   noFunction('class');
          // }
        };

        // 纯函数
        returnNewIdentifierClass = () => {
          const parent = getParentAndLastKey();
          // try {
            return new parent(...literalValue);
          // } catch {
          //   noFunction('class');
          // }
        };

        returnFunctionCall = () => {
          const { parent, lastKey } = getParentAndLastKey();
          // try {
            return parent[lastKey](...literalValue);
          // } catch (err) {
          //   console.log('**** callFun err ****', err, { calleeDslJson, paramsDsl, lastKey, parent, params: literalValue, thisVarScope: this.varScope });
          //   throw err;
          // }
        };

        returnIdentifierFunctionCall = () => {
          const parent = getParentAndLastKey();
          // try {
            return parent(...literalValue);
          // } catch (err) {
          //   console.log('**** callFun err ****', err, { calleeDslJson, paramsDsl, parent, params: literalValue, thisVarScope: this.varScope });
          //   throw err;
          // }
        };
      } else {
        returnNewClass = () => {
          const { parent, lastKey } = getParentAndLastKey();
          const params = getParams();
          // try {
            return new parent[lastKey](...params);
          // } catch {
          //   noFunction('class');
          // }
        };

        // 纯函数
        returnNewIdentifierClass = () => {
          const parent = getParentAndLastKey();
          const params = getParams();
          // try {
            return new parent(...params);
          // } catch {
          //   noFunction('class');
          // }
        };

        returnFunctionCall = () => {
          const { parent, lastKey } = getParentAndLastKey();
          const params = getParams();
          // try {
            return parent[lastKey](...params);
          // } catch (err) {
          //   console.log('**** callFun err ****', err, { calleeDslJson, paramsDsl, lastKey, parent, params, thisVarScope: this.varScope });
          //   throw err;
          // }
        };

        returnIdentifierFunctionCall = () => {
          const parent = getParentAndLastKey();
          const params = getParams();
          // try {
            return parent(...params);
          // } catch (err) {
          //   console.log('**** callFun err ****', err, { calleeDslJson, paramsDsl, parent, params, thisVarScope: this.varScope });
          //   throw err;
          // }
        };
      }
    }

    // 极简情况
    if (dslLen === 1) {
      if (isClass) return returnNewIdentifierClass;
      return returnIdentifierFunctionCall;
    }
    if (isClass) return returnNewClass;
    return returnFunctionCall;
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
    const len = casesDsl.length;
    for(let i = 0; i < len; ++i) {
      const [testDsl, consequentDsl] = casesDsl[i];
      const getTest = testDsl ? this.getValue(testDsl) : () => testDsl;
      testList.push(getTest);
      caseClauseList.push(this.callBlockStatement(consequentDsl, true));
    }

    const testListLen = testList.length;

    return () => {
      const discriminant = getDiscriminant();
      for(let index = 0; index < testListLen; ++index) {
        const currentVarScope = this.varScope;
        const test = testList[index]();
        // test === null 表示 default 分支
        if (test === discriminant || test === null) {
          for(let i = index; i < testListLen; ++i) {
            const storeSupportBreak = currentVarScope.__supportBreak__;
            currentVarScope.__supportBreak__ = true;
            caseClauseList[i]();
            if (currentVarScope.__supportBreak__ !== storeSupportBreak) {
              currentVarScope.__supportBreak__ = storeSupportBreak;
            }
            if (currentVarScope.__isBreak__) {
              // case 执行了 break
              if (!currentVarScope.__isBreakLabel__) currentVarScope.__isBreak__ = false;
              break;
            }
            if (currentVarScope.__returnObject__) {
              // 遇到 return 语句
              break;
            }
          }
          break;
        }
      }
    };
  }
  // sequence
  callSequence(dslList: DslJson[]) {
    const sequenceCalls = (
      dslList.map(item => this.checkMemberExpression(item)
        ? this.getObjMember(item)
        : dslResolve(item, this))
    );
    const lastCall = sequenceCalls.pop();
    const batchExecStatements = batchExec(sequenceCalls);
    return () => {
      batchExecStatements();
      return lastCall();
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
export const createModule = (nameSpace?: string) => {
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

// 注册到 nameSpace 的成员
const memberOfNameSpaceScope: Record<string, Record<string, any>> = {};

export const getRegisteredMembers = (nameSpace: string) => memberOfNameSpaceScope[nameSpace];

// 提供给开发注册的接口
export const registerToScope = (nameSpace: string, members: Object) => {
  const moduleScope = createModule(nameSpace);
  if (typeof members !== 'object') {
    throw new Error('registerToScope 只支持类型为 Object 的参数');
  }
  Object.assign(moduleScope.varScope, members);
  // 保留一份纯净的外部注册的成员
  let nameSpaceMembers: Record<string, any> = memberOfNameSpaceScope[nameSpace];
  if (!nameSpaceMembers) {
    nameSpaceMembers = {};
    memberOfNameSpaceScope[nameSpace] = nameSpaceMembers;
  }
  Object.assign(nameSpaceMembers, members);
};
