# Crank.js
Write JSX-driven components with functions, promises and generators.

Documentation is available at [crank.js.org](https://crank.js.org). Crank.js is in a beta phase, and some APIs may change. To read more about the motivations for this library, you can read the [introductory blog post](https://crank.js.org/blog/introducing-crank).

## Features
### Declarative
Crank uses the same JSX syntax and diffing algorithm popularized by React, allowing you to write HTML-like code directly in JavaScript.

### Just Functions
All components in Crank are just functions or generator functions. No classes, hooks, proxies or template languages are needed.

### Promise-friendly
Crank provides first-class support for promises. You can define components as async functions and race renderings to display fallback UIs.

### Lightweight
Crank has no dependencies, and its core is a single file. It currently measures at [5KB minified and gzipped](https://bundlephobia.com/result?p=@b9g/crank).

### Performant
[According to benchmarks](https://github.com/krausest/js-framework-benchmark), Crank beats React in terms of speed and memory usage, and is currently comparable to Preact or Vue.

### Extensible
The core renderer can be extended to target alternative environments such as WebGL libraries, terminals, smartphones or smart TVs.

## Installation
Crank is available on [NPM](https://npmjs.org/@b9g/crank) in the ESModule and CommonJS formats.

```shell
$ npm install @b9g/crank
```

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

If your environment does not support ESModules (you may see a message like `SyntaxError: Unexpected token export`), you can import the CommonJS versions of the library under the `cjs` directory.

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank/cjs";
import {renderer} from "@b9g/crank/cjs/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Key Examples
### A Simple Component
```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

renderer.render(<Greeting />, document.body);
```

[Try on CodeSandbox](https://codesandbox.io/s/a-simple-crank-component-mhciu)

### A Stateful Component
```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    while (true) {
      yield <div>Seconds: {seconds}</div>;
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(<Timer />, document.body);
```

[Try on CodeSandbox](https://codesandbox.io/s/a-stateful-crank-component-hh8zx)

### An Async Component
```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

async function QuoteOfTheDay() {
  const res = await fetch("https://favqs.com/api/qotd");
  const {quote} = await res.json();
  return (
    <p>
      “{quote.body}” – <a href={quote.url}>{quote.author}</a>
    </p>
  );
}

renderer.render(<QuoteOfTheDay />, document.body);
```

[Try on CodeSandbox](https://codesandbox.io/s/an-async-crank-component-ru02q)

### A Loading Component
```jsx
/** @jsx createElement */
import {createElement, Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

async function LoadingIndicator() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return <div>Fetching a good boy...</div>;
}

async function RandomDog({throttle = false}) {
  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return (
    <a href={data.message}>
      <img src={data.message} alt="A Random Dog" width="300" />
    </a>
  );
}

async function *RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp() {
  let throttle = false;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      throttle = !throttle;
      this.refresh();
    }
  });

  while (true) {
    yield (
      <Fragment>
        <div>
          <button>Show me another dog.</button>
        </div>
        <RandomDogLoader throttle={throttle} />
      </Fragment>
    );
  }
}

renderer.render(<RandomDogApp />, document.body);
```

[Try on CodeSandbox](https://codesandbox.io/s/a-loading-crank-component-pci9d)
