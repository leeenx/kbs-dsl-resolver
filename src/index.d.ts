declare module 'kbs-dsl-resolver' {
  export default function(dslJson: any): any;
  export function dslResolve(dslJson: any, customize?: any): any;
  export function createModuleScope(): any;
  export function registerToGlobleScope(member: Object): void;
}
