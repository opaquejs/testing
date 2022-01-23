import "reflect-metadata";

export interface ArgumentResolver {
  (context: { key: string; index: number; instance: TestInterface }): unknown;
}
export interface Hook {
  (context: { instance: TestInterface }): Promise<unknown>;
}

export class ExampleClass {}
export type Example<T> = T;
export const Example = ExampleClass;

export interface TestInterface {
  constructor: any;
  _providers?: Map<unknown, ArgumentResolver>;
  _arguments?: Map<string, (ArgumentResolver | undefined)[]>;
  _ignore?: Set<string>;
  _afterEach?: Set<Hook>;
  _beforeEach?: Set<Hook>;
  _examples?: Map<
    string,
    { lastParameterIndex: number; currentExampleIndex: number; currentExample: number; examples: unknown[][] }
  >;
}

export const provide =
  (key: unknown, value: ArgumentResolver) =>
  (test: new () => TestInterface): void => {
    if (!test.prototype._providers) test.prototype._providers = new Map();
    test.prototype._providers.set(key, value);
  };
export const inject =
  (provider?: unknown) =>
  (test: TestInterface, key: string, index: number): void => {
    if (!provider) {
      const argTypes = Reflect.getMetadata("design:paramtypes", test, key);
      provider = argTypes[index];
    }
    if (!test._arguments) test._arguments = new Map();
    if (!test._arguments.has(key)) test._arguments.set(key, []);
    test._arguments.get(key)![index] = (context) => test._providers?.get(provider)?.(context);
  };

export const exampleProvider = provide(Example, ({ instance, key, index }) => {
  const example = instance._examples?.get(key);
  if (!example) return undefined;
  if (example.lastParameterIndex >= index) {
    example.currentExample++;
    example.currentExampleIndex = 0;
  }
  example.lastParameterIndex = index;
  const result = example.examples[example.currentExample][example.currentExampleIndex];
  example.currentExampleIndex++;
  return result;
});

export const example =
  (...args: unknown[]) =>
  (test: TestInterface, key: string): void => {
    if (!test._examples) test._examples = new Map();
    if (!test._examples.has(key))
      test._examples.set(key, {
        currentExample: 0,
        lastParameterIndex: -1,
        currentExampleIndex: 0,
        examples: [],
      });
    test._examples.get(key)!.examples.push(args);
    if (!test._providers?.has("example")) exampleProvider(test.constructor);
  };

export const examples =
  (...args: unknown[][]) =>
  (test: TestInterface, key: string): void => {
    for (const e of args) {
      example(...e)(test, key);
    }
  };

export const makeRunners = <T extends TestInterface>(test: T) => {
  const runners = [];
  for (const key in test) {
    if (typeof test[key] == "function" && !key.startsWith("_") && !test._ignore?.has(key)) {
      const examples = test._examples?.get(key)?.examples;
      const noExamples = {};
      for (const example of examples || [noExamples]) {
        runners.push({
          name: example === noExamples ? key : `${key} with example ${example}`,
          runner: async () => {
            const args =
              test._arguments?.get(key)?.map((argresolver, index) => argresolver?.({ key, index, instance: test })) ||
              [];
            for (const callback of test._beforeEach || new Set()) {
              await callback({ instance: test });
            }
            await (test[key] as unknown as Function).call(test, ...args);
            for (const callback of test._afterEach || new Set()) {
              await callback({ instance: test });
            }
          },
        });
      }
    }
  }
  return runners;
};

export const afterEach = () => (test: TestInterface, methodName: string) => {
  if (!test._afterEach) {
    test._afterEach = new Set();
  }
  test._afterEach.add((context) => (context.instance as any)[methodName](context));
};
export const beforeEach = () => (test: TestInterface, methodName: string) => {
  if (!test._beforeEach) {
    test._beforeEach = new Set();
  }
  test._beforeEach.add((context) => (context.instance as any)[methodName](context));
};
export const ignore = () => (test: TestInterface, methodName: string) => {
  if (!test._ignore) {
    test._ignore = new Set();
  }
  test._ignore.add(methodName);
};

export const runPlain = () => (testClass: new () => TestInterface) => {
  Promise.resolve().then(async () => {
    for (const test of makeRunners(new testClass())) {
      await test.runner();
    }
  });
};

// @runPlain()
// @provide("hahastring", () => "hahaprovidden")
// class Test {
//   @example("myexample 1 1", "myexample 1 2")
//   @example("myexample 2 1", "myexample 2 2")
//   test(@inject("hahastring") string: string, @inject() example: Example<string>, @inject() example2: Example<number>) {
//     console.log("logging", string, example, example2);
//   }

//   @example("myexample 1 1", "othermyexample 1 2")
//   @example("othermyexample 2 1", "myexample 2 2")
//   otherTest(@inject() example: Example<string>, @inject() example2: Example<number>) {
//     console.log("logging", example, example2);
//   }

//   @beforeEach()
//   _prepare() {
//     console.log("prepare");
//   }
//   @afterEach()
//   _cleanUp() {
//     console.log("cleanup");
//   }
// }
