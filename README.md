# Opaque Testing Suite

Write your jest tests in class syntax. The test runner runs every method as a test.

## Example Test

```ts
import { runAsTest } from "@opaquejs/testing";

@runAsTest()
export class SomeTest {
  async testSomething() {
    // Your assertions here...
    expect(somevar).toBe(true);
  }
}
```

Please notice the `@runAsTest()` call. This decorator actually executes your test code.

## Running for Examples

You can use the `@example` and the `@examples` decorators to run a test for each example. You need to have the `emitDecoratorMetadata` option in typescript enabled.

```ts
import { runAsTest, example, examples, Example } from "@opaquejs/testing";

@runAsTest()
export class SomeTest {
  @example("string 1", 1)
  @example("string 2", 2)
  // Is the same as...
  @examples(["string 2", 2], ["string 1", 1])
  async testSomething(str: Example<string>, num: Example<number>) {
    // Your assertions here...
  }
}
```

## Ignoring methods

You can ignore methods using the `@ignore` decorator, or prefixing them with an underscore like this: `_iWillBeIgnored() {}`

```ts
import { runAsTest, ignore } from "@opaquejs/testing";

@runAsTest()
export class SomeTest {
  @ignore()
  async someHelper() {
    // ...
  }

  async _someHelper() {
    // ...
  }
}
```
