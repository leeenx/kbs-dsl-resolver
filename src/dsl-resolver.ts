// @ts-ignore
import * as _ from 'lodash-es';
import Customize from './customize';

const types = ['literal', 'arguments', 'array-literal', 'object-literal', 'call-function', 'customize-function', 'declare-function', 'component', 'this', 'prefix-vars', 'member', 'c', 'f', 'd', 'a', 'o', 'l', 't', 'p', 'm'];
type Type = typeof types[number];

export interface DslJson {
  type?: Type,
  t?: Type,
  name?: string;
  n?: string;
  // 自定义函数形参
  params?: string[];
  p?: string[];
  value?: any;
  v?: any;
  body?: DslJson[];
  b?: DslJson[];
}

const dslResolve = (
  dslJson: DslJson | string,
  customize?: Customize,
  isLoopContentStatement: boolean = false,
  preResolve: boolean = false,
  tag?: any
) => {
  // 变量的上下文也在这里
  if (_.isObject(dslJson)) {
    if (!customize) {
      customize = new Customize();
      customize.varScope.__preResolve__ = preResolve;
    }
    const {
      t,
      type = t
    } = dslJson as DslJson;
    if (
      (!_.has(dslJson, 'type') && !_.has(dslJson, 't')) || // 直接的 type 属性不存在
      !types.includes(type!)
    ) {
      // memberExpression
      if (_.isArray(dslJson)) {
        return customize.getObjMember(dslJson as DslJson[]);
      }
      // 直接返回
      return () => dslJson as any;
    }
    // 过滤 callFun 的对象入参
    if(['f', 'component', 'customize-function'].includes(type!)) {
      const json = dslJson as DslJson;
      if (
        (type === 'f' && (!json.p || !json.b)) ||
        (type !== 'f' && (!json.params || !json.body))
      ) {
        // 直接返回
        return () => dslJson as any;
      }
    }
    const {
      n = '',
      name = n,
      v,
      value = v,
      p = [],
      params = p,
      b = [],
      body = b
    } = dslJson as DslJson;
    switch(type) {
      // 变量上提
      case 'prefix-vars':
      case 'p':
        return customize.batchVar(value.map(key => ({ key })));
      case 'member':
      case 'm':
        return customize.getObjMember(value);
      /**
       * 直接调用内置解析函数
       * 当 name 为 callFun 时，才是逻辑上的调用函数
       */
      case 'c':
      case 'call-function': {
        const paramsDsl: DslJson[] = Array.isArray(value) ? value : [value];
        const functionParams: any[] = paramsDsl;
        if (customize[name as keyof Customize]) {
          // 优先从「customize」找
          if (isLoopContentStatement) {
            if (name === 'callBlockStatement') {
              return customize.callBlockStatement(functionParams[0], true, true);
            }
            /**
             * 非块级作用域，必定是一条语句
             * 创建一个声级作用域
             */
            return customize.callBlockStatement([dslJson as DslJson], true, true);
          }
          return customize[name](...functionParams);
        } else if (_.hasOwnProperty(name)) {
          // 兜底使用「lodash」
          return _[name]?.(...functionParams);
        } else {
          throw new Error(`未定义的 call-function: ${name}`);
        }
      }
      // 创建函数
      case 'f':
      case 'customize-function':
      // 创建组件
      case 'component':
        return customize.createFunction(params, body, name);
      case 'd':
      case 'declare-function':
        return customize.createFunction(params, body, name, false, false, false, true);
      case 'a':
      case 'array-literal':
        return customize.getArrayLiteral(value);
      case 'o':
      case 'object-literal': {
        return customize.getObjectLiteral(value);
      }
      // this 指针
      case 't':
      case 'this':
        return customize.getConst('this');
      // 普通字面量
      case 'l':
      case 'literal':
        return customize.getLiteral(value);
      default:
        
    }
  }
  return dslJson as string;
}

export default dslResolve;
