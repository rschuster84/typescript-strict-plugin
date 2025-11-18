// @ts-strict-ignore
export {}; // make this file a module to avoid global redeclaration errors

interface TestType {
  bar: string;
}

const foo: TestType | null = { bar: 'hello' };

const isTestType = (obj: any): obj is TestType => {
  return obj != null && typeof obj === 'object' && obj.hasOwnProperty('bar') && typeof obj.bar === 'string';
}

const barValue: string = isTestType(foo) ? foo.bar : 'some default value';