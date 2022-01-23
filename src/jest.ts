import { makeRunners, TestInterface } from ".";

export const runWithJest = () => (testClass: new () => TestInterface) => {
  for (const { name, runner } of makeRunners(new testClass())) {
    test(name, runner);
  }
};
