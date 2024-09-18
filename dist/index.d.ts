interface StackItem {
  registeredMembers: Record<string, any>;
  moduleExports: any;
}

declare module 'kbs-dsl-resolver' {
  export default function(dslJson: any, nameSpace?: string, hotUpdating?: boolean): any;
  export function dslResolve(dslJson: any, customize?: any): any;
  export function createModuleScope(): any;
  export function registerToGlobleScope(member: Object): void;
  export const globalScope: Record<string, any>;
  export function registerToScope(nameSpace: string, member: Object): void;
  export function recyleMemoCache(nameSpace: string, stackItem: StackItem): void;
  export function increaseMemoCache(nameSpace: string, increaseCount: number): void;
}
