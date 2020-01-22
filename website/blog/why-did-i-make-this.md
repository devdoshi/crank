# Introducing Crank

## Not another web framework.
After months of development, I’m happy to introduce Crank, a new framework for creating JSX-driven components with functions, promises and generators. And I know what you’re thinking: ***oh no, not another web framework.*** There are already so many of them out there (React, Angular, Vue, Ember, Svelte) and each carries a non-negligible cost in terms of learning it and building an ecosystem around it, so it makes sense that you would instinctively reject newcomers if only to avoid the deep sense of exhaustion which has come to be known colloquially amongst frontend developers as “JavaScript fatigue.” Therefore, this post is both an introduction to Crank as well as an apology: I’m sorry for creating yet another framework, and I hope that by explaining the circumstances which led me to do so, you will forgive me.

I will be honest; before embarking on this project I had never made a “web framework” nor even considered myself capable of doing such a thing. I don’t maintain any particularly popular open-source libraries, and most of the early commits to this project had messages like “why on Earth are you doing this?” Before working on Crank, my framework of choice was React, and I had used it dutifully for almost every project within my control since the `React.createClass` days. And as React evolved, I must admit, I was intrigued and excited with the announcement of each new code-named React feature like “Fibers,” “Concurrent Mode,” “Hooks” and “Suspense.” I spent days attempting to decipher tweets like the following by Sebastian Markbage, one of the principal architects behind React and felt like React would last at least well into the next decade.

TKTK INSERT TWEET ABOUT HIERARCHIES AS WELL AS A CAPTION 

However, over time, I grew increasingly alienated by what I perceived to be the more general direction of React, which was to reframe it as a “UI runtime.” Each new concrete API produced by the React team felt increasingly convoluted, and I was unhappy with the peculiar footguns the new hooks API provided. *I already have a UI runtime*,  I would think whenever I read the latest on React, *it’s called JavaScript.*

Towards the end, I felt marooned, because on the one hand I had completely fallen out of love with React, but on the other hand, I did not want to use any of the alternative frameworks. I agreed with the criticisms which Vue, Svelte and Ember advocates lobbed in the direction of React, but I was unwilling to convert to these frameworks because they all seemed to prominently feature HTML template-driven APIs.

I like JSX. I like the small surface area it provides compared to template languages, which each provide custom syntax, custom html attributes and custom elements to do basic things like iterating over an array. And while there were other libraries which used JSX like Preact and Inferno, they seemed to follow React blindly in its evolution from “a view layer” into “a UI runtime.” Rather than thinking critically about each new React feature, these JSX libraries seemed eager to cargo cult each new feature like Suspense and Hooks, opting to distinguish themselves in terms of library metrics like bundle size (Preact) or runtime performance (Inferno). My problems with React weren’t related to bundle size or runtime performance; in my view, it was the API that needed fixing. I felt like React, which had up to this point been the standard-bearer of JSX, was no longer up to the task of defending its colors.

## Tired of the Suspense

The tipping point for me was React’s perennially unready `Suspense` API, React’s solution for async rendering. For the most part, I ignored talks and articles describing Suspense, partially because the React team was continuously signaling that the API was in flux, but mainly because most discussions of Suspense just went over my head. I assumed that the React team was working it out, and we’d eventually have something like `async`/`await` for React components, and continued to incorporate React into projects without thinking too hard about it.

This was until I decided to explore the Suspense API when I was trying to create a React hook for usage with async iterators. I had created an async iterator library that I was proud of ([Repeater.js](https://github.com/repeaterjs/repeater)), and I wanted to figure out a way to increase adoption, not just of the library, but also of async iterators in general. The answer seemed logical: create a React hook. At the time, it seemed like every API in existence was being transformed into a React hook somehow, and I thought it would be nice for there to be hooks which allowed developers to use async iterators within components as well.

The result of this effort is available at [repeaterjs/react-hooks](https://github.com/repeaterjs/react-hooks), and while this library is usuable, I mostly abandoned the effort and any sort of greenfield React development, because of my new understanding of what React Suspense was. As of January 2020, the mechanism behind Suspense is for components with async dependencies to throw a promise from the render function to indicate that the component is doing something asynchronously. “Throw” as in the way you would “throw” an error in JavaScript. I say “as of January 2020,” because the React team has consistently said the exact details of the Suspense API might change, and has used this declaration to pre-empt any criticism of the Suspense API. However, as far as I can tell, that’s how it will work, and how almost everyone who has written libraries featuring Suspense assumes it will work for the foreseeable future. In short, React will attempt to render your components and if a thenable is thrown in the course of rendering, React will catch it in a special parent component called `Suspense`, await it, render a fallback if sufficient time has elapsed, and then attempt to render the component again when the promise fulfills. 

If this sounds wild to you, that’s because it is. It’s an unusual way to use promises and throw statements in JavaScript. And I almost could get past this, trusting that the React team knew what they were doing, until I understood the add-on ramifications of this design decision. When a component throws a promise to suspend, most likely that component has not rendered, so there’s no state or refs or component instance which corresponds to this thrown promise. And when the thrown promise fulfills, React will attempt to render the component again, and hopefully whatever API you called which initially threw the promise, an API which would otherwise be useless or ill-behaved in regular JavaScript, would in this second renderering of the component, not throw a promise but return with the fulfilled value synchronously.

All of a sudden, what little I had heard about React Suspense made sense. I understood, for instance, why discussions of Suspense almost always involved mentions of a cache. The cache is necessary because as I said, there is no component instance on which to store the thrown promise, so when the component attempts to render a second time, it needs to make the same call and hope that promise is not thrown again. And while caching async requests is a useful technique for creating responsive, performant, offline-ready applications, I balked at the idea of this hard requirement of a cache to use promises within a React application. This is because to cache a promise, you need to two things. First, you need to be able to uniquely key the async call which produced the promise according to its arguments. This is what will allow you to come back to a function call which had previously thrown a promise and produce a value synchronously. Second, you need to know when to invalidate this cached result. In other words, you need to be able to identify when the underlying data which the cached result represents  might have changed, so that the user doesn’t end up seeing stale data on their screens.

Take a step back. Take a high-level look at an application you’re working on. If you’re using promises and async/await, think of all the async calls you make, and whether 1. you can both uniquely key each call, and 2. know exactly when the results of these calls become stale. This is a hard problem; in fact, cache invalidation is one of two problems which we joke about as being “the hardest problems in computer science.” Even if you like the idea of caching your async calls, do you want to add this requirement when you’re making a one-off call to some random API or when you’re trying to bootstrap a demo?

## React’s Dogmatic Assertion

At this point my curiosity boiled over into despair and frustration, and I started to wonder, why can’t render functions just be async, why can’t React components simply return a promise from the render method which resolves to React elements? I searched Github for issues where people suggested this API change, and there was at least one such issue in each of the major JSX libraries (React, Preact, Inferno), but each time it was brought up the maintainers simply dismissed the idea out of hand. For React, the issue was closed with a comment saying that Suspense would solve everything.

TKTK INSERT ACTUAL QUOTES
But Suspense solves this problem at the cost of requiring a caching mechanism for promises, which as I described feels like such a huge ask. I went back and listened to the actual discussions of Suspense and I felt like I was being gaslit. “Suspense allows you to treat async code like it’s synchronous,” a React maintainer would say. But we already have a way to make async code look synchronous; it’s `async`/`await` syntax, and JavaScript will literally *suspend* your functions when promises are awaited and resumes them when your promises fulfill. The literature on Suspense seemed invent new issues with promises which I don’t think are real, like the idea that async code “waterfall,” where code which is meant to run in parallel runs sequentially. It’s not a problem, I thought, because people who used `async`/`await` have found ways to make async functions run concurrently, usually with `Promise.all`.

I realized Suspense, and the mechanism behind it, was not the most ideal API that the React team could have designed; rather it was borne of a single dogmatic assertion which the React team held and continues to hold, that “the user interface should be a pure function of state.” Functional purity can mean many things, but here, for all intents and purposes it means that rendering must always be done in a synchronous function, so async functions, which are really just functions which return promises, were excluded by definition. Why? Because promises are stateful, “impure.”

Knowing that this was the one axom on which the React team refused to budge, suddenly, React’s latest API decisions each seemed to fall in place. Suspense was a hack to get around the fact that sync functions could not suspend, and hooks, the much-discussed React solution for avoiding class-based components, were designed to get around the fact that `return` statements are final. In this new light, hooks seemed less like an innovation and more like a hack to frontload code which would naturally go after the function had returned.

Correspondingly, a lot of the pain points of React begin to make sense. All of the struggles which React developers faced, like the various hacks to render components with async dependencies on the server, or the whole period of time where React developers thought render props were a good way to do things, could be explained by React’s original sin of requiring rendering to be synchronous. The principle leaked into the ecosystem, radiating into developer’s lives and their code when using React.

Freed from this dogmatic assertion, I pondered for a week or so on the kind of JSX-based library you could create if components didn’t have to be synchronous functions. After all JavaScript has at present four separate function syntaxes (`function`, `async function`, `function *`, and `async function *`); wouldn’t it be nice if we could use this entire palette to write UI components? Could there be a use-case for generator functions as well, which the React team again dismissed by definition, because generator objects are stateful and therefore “impure.”

At this point, I was intrigued by this idea but I also didn’t want to write a React alternative, I wanted to write applications, not build and maintain a framework. And so I was about to move on to something else, when all of a sudden it dawned on me: The entire React lifecycle, all the `componentDidWhat` methods, everything which the React team was trying to do with hooks and state and refs, all of it could be expressed within a single async generator function. 

```js
async function *MyComponent(props) {
  let state = componentWillMount(props);
  let ref = yield <MyElement />;
  state = componentDidMount(props, state, ref);
  try {
    for await (const nextProps of updates()) {
      if (shouldComponentUpdate(props, nextProps, state)) {
        state = componentWillUpdate(props, nextProps, state);
        ref = yield <MyElement />;
        state = componentDidUpdate(props, nextProps, state, ref);
      }

      props = nextProps;
    }
  } catch (err) {
    return componentDidCatch(err);
  } finally {
    componentWillUnmount(ref);
  }
}
```

This is pseudo-code, and the actual Crank API turned out to be a little different, but in the moment I felt like I had captured lightning in a bottle. By yielding JSX elements rather than returning them, you could have code which ran before or after the component rendered, emulating the `componentWillUpdate` or `componentDidUpdate` lifecycle methods. New props could be passed in by stepping through a framework provided async iterator. The concept of local state, which in React requires calls to `this.setState` or the `useState` hook, could simply be expressed with local variables. And, the framework could, upon rendering DOM nodes, pass these nodes back into the generator, so you could do direct DOM manipulations without React’s notion of “refs.” And finally, you could even implement something like the `componentDidCatch` and `componentWillUnmount` lifecycle methods directly within the async generator by wrapping your yield operators in `try`/`catch`/`finally` blocks. All these things which React required separate methods or hooks to accomplish could be done within async generators with the regular control-flow operators, in a way that was as easy as writing a `for` loop.

This idea didn’t come all at once, but it dazzled me nonetheless, and for the first time I felt like the task of creating a web framework was achievable. I didn’t know all the details behind how to call the function above, what that function call to `updates` returned, and I still didn’t know how the framework would handle async functions or sync generator functions, but I saw the start and the end, something to motivate me when I got stuck. And the best part of the idea was that it felt like “innovation arbitrage,” where, while the React team and its considerable engineering talent was spending its resources on creating a “UI runtime,” I could just delegate the hard stuff to JavaScript. I didn’t need to flatten call stacks into a “fiber” data structure so that computations could be arbitrarily paused and resumed; rather, I could just allow the `await` and `yield` operators to do the suspending and resuming for me. And I didn’t need to create a scheduler, I could just use promises and the microtask queue provided by the runtime to coordinate asynchrony between components. For all the hard things that the React team was doing, a solution seemed latent within the JavaScript runtime, I just had to discover it.

## Not another web framework

Crank is the result of a months-long investigation into the viability of this idea, that JSX-based components could be written not just with sync functions, but also with async functions, and with sync and async generator functions. Much of this time was spent refining the design of the API, figuring out what to do for instance, when an async component has not yet fulfilled but is rerendered, and how things like event handling should work. I’m very pleased with the result; I literally started tearing up while implementing TodoMVC in Crank, partly because it was the culmination of months of work, but also because it felt so natural and easy.

In 2019 and beyond, there’s been a big push to figure out “reactivity” in each of the web frameworks, how best to track changes to application state and update the UI in response to these changes. What felt like a solved problem became again unsolved, as the various frameworks attempted to refactor their APIs away from classes, and co-locate code which would ordinarily have gone into different lifecycle methods, so that you didn’t group code based on when it was run but by concern. React invested in “hooks,” and the creation of a custom UI runtime, Vue invested in a Proxy-based observation system, Svelte invested in a compiler which hacked statement labels and export declarations to mark variables as having changed. On the other hand, Crank just uses promises, async/await, and generator functions, language features which have been available in JavaScript since ECMAScript 2015 and are now heavily entrenched in the ecosystem.

By combining these relatively old, almost boring technologies with JSX syntax, I think I’ve discovered a new way to write components, which is expressive, easy to reason about, and more composeable than any of the solutions the other frameworks have provided. In short, I think Crank is “not just another web framework,” but a pattern which would have eventually been discovered by the JavaScript community anyways. Because while the other frameworks will argue that their APIs allow you to write “Just JavaScript™️,” Crank really is just javascript; all we’re doing is calling functions which return or yield JSX elements in a specific way. And again, I’m sorry for creating another web framework, but I hope, if you’ve read this far, you understand why I did it; namely, because I thought React was dropping the ball in terms of their newest APIs, and also because of the sudden realization that we could be doing so much more with the different function syntaxes available to us in JavaScript.

If any of this interested you, if you don’t share the deep skepticism the React team has of promises and generators, if you don’t want to use templates over JSX, if you’re looking for a framework which has, arguably, the simplest story for reactivity, I encourage you to check out Crank. It’s still in its early days, and there’s still a lot of work to be done before it can be considered a full-fledged framework or even production ready, but I think the ideas the design of the API is sound and have an incredibly high ceiling in terms of both improving developer productivity and performance. TK CTA TO GETTING STARTED AND GITHUB REPOSITORY. I can’t wait to see what people build with Crank.