// @ts-ignore
import * as _ from 'lodash-es';
import Customize from './customize';

type Type = 'literal' | 'array-literal' | 'object-literal' | 'call-function' | 'customize-function' | 'component' | 'c' | 'f' | 'a' | 'o' | 'l';

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

const dslResolve = (dslJson: DslJson | string, customize?: Customize) => {
  // 变量的上下文也在这里
  if (_.isObject(dslJson)) {
    customize = customize || new Customize();
    const {
      t,
      type = t,
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
          return customize[name as keyof Customize]?.(...functionParams);
        } else if (_.hasOwnProperty(name)) {
          // 兜底使用「RamdaJs」
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
      case 'a':
      case 'array-literal':
        return ([...value]).map((item: any) => dslResolve(item, customize));
      case 'o':
      case 'object-literal': {
        const obj: any = {};
        value.forEach(({
          k,
          key = k,
          v,
          value: valueDsl = v
        }) => {
          obj[key] = dslResolve(valueDsl, customize);
        });
        return obj;
      }
      // 普通字面量
      case 'l':
      case 'literal':
        return value;
      default:
        // 直接返回
        return dslJson as any;
    }
  }
  return dslJson as string;
}

export default dslResolve;
