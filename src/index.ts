import "reflect-metadata";

export interface Test {
  constructor: any;
  examples?: ExamplesRecord;
  injects?: InjectsRecord;
  ignore?: IgnoreMethodList;
  afterEach?: string[];
  beforeEach?: string[];
}

export type BeforeHookContext = {
  key: string;
  example: ExampleSet;
};
export type AfterHookContext = BeforeHookContext & {
  result: unknown;
};

export type Inject = any;
export type Injects = Inject[];
export type InjectsRecord = { [key: string]: Injects };

export type IgnoreMethodList = string[];

export class ExampleClass {}
export type Example<T> = T;
export const Example = ExampleClass;
export type ExampleSet = Example<any>[];
export type ExampleSets = ExampleSet[];
export type ExamplesRecord = Record<string, ExampleSets>;

export type TestRunner = (example: ExampleSet) => Promise<any>;

export type TestConfig = {
  name: string;
  examples?: ExampleSets;
  runner: TestRunner;
};

export const parseTestInstance = <T extends Test>(test: T): TestConfig[] => {
  const runners: TestConfig[] = [];
  for (const key in test) {
    if (typeof test[key] == "function" && !key.startsWith("_") && !test.ignore?.includes(key)) {
      runners.push({
        name: key,
        examples: test.examples?.[key],
        runner: async (example) => {
          const args: any[] = [];
          let exampleIndex = 0;
          for (const index in test.injects?.[key] || []) {
            const inject = test.injects?.[key][index];
            args[index] = inject === ExampleClass ? example[exampleIndex++] : inject;
          }
          for (const beforeHook of test.beforeEach || []) {
            (test as any)[beforeHook]({
              key,
              example,
            } as BeforeHookContext);
          }
          const result = await (test as any)[key](...args);
          for (const afterHook of test.afterEach || []) {
            (test as any)[afterHook]({
              key,
              result,
              example,
            } as AfterHookContext);
          }
          return result;
        },
      });
    }
  }
  return runners;
};

export const runTest = (config: TestConfig) => {
  if (config.examples) {
    for (const example of config.examples) {
      test(`${config.name} with example ${example}`, async () => {
        await config.runner(example);
      });
    }
  } else {
    test(config.name, async () => {
      await config.runner([]);
    });
  }
};

export const runAsTest = () => (testClass: new () => Test) => {
  for (const test of parseTestInstance(new testClass())) {
    runTest(test);
  }
};

export const inject = (value: any) => <T extends Test>(test: T, key: string, index: number): void => {
  if (!test.injects) {
    test.injects = {};
  }
  if (!test.injects[key]) {
    test.injects[key] = [];
  }
  test.injects[key][index] = value;
};

export function autoinject(types?: any[]) {
  function handler(test: Test, key: string, index?: number | PropertyDescriptor) {
    const args = Reflect.getMetadata("design:paramtypes", test, key);
    if (Number.isInteger(index)) {
      const arg = args[index as number];
      if (Array.isArray(types) && !types.includes(arg)) {
        return;
      }
      inject(arg)(test, key, index as number);
    } else {
      for (const [index] of args.entries()) {
        handler(test, key, index);
      }
    }
  }
  return handler;
}

export const example = (...example: ExampleSet) => <T extends Test>(test: T, key: string): void => {
  if (!test.examples) {
    test.examples = {};
  }
  if (!test.examples[key]) {
    test.examples[key] = [];
  }
  test.examples[key].push(example);
  autoinject([ExampleClass])(test, key);
};

export const examples = (...examples: ExampleSets) => <T extends Test>(test: T, key: string): void => {
  for (const e of examples) {
    example(...e)(test, key);
  }
};

export const afterEach = () => (test: Test, methodName: string) => {
  if (!test.afterEach) {
    test.afterEach = [];
  }
  test.afterEach.push(methodName);
};

export const ignore = () => (test: Test, methodName: string) => {
  if (!test.ignore) {
    test.ignore = [];
  }
  test.ignore.push(methodName);
};
