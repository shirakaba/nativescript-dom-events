**NativeScript DOM Events** is a drop-in EventTarget implementation for NativeScript, satisfying `libdom.d.ts`.

It does the following so far:

* Introduces a new class DOMEvent, which implements Event.
* Makes Observable implement EventTarget (in terms of typings) by overloading `addEventListener()` and `removeEventListener()` with DOM-compliant equivalents and adding a `dispatchEvent()` method to Observable, which fires a DOMEvent.
* Overwrites Observable's implementations of `addEventListener()`, `removeEventListener()`, `on()`, `off()`, `once()`, and `notify()` to make use of DOMEvent. In most cases, this involves taking a best guess at the intended role of the param (`thisArg` or `options`).

### TODO

* Fill in the `example` folder with something more substantial.
* Check whether I need to do something more complicated than `global.Event = DOMEvent` to patch global (e.g. use `Object.defineProperty()`).
* Add tests (I wrote a bunch for my [DOM Events PR](https://github.com/NativeScript/NativeScript/pull/10100), so mainly just need to port them).
* Patch gestures.

For now this is a proof-of-concept as I want to demonstrate the approach, but I think it's a good starting point for any DOM-related implementation as it solves the typings issue nicely.

# Known issues

## Asserting `observable as View` fails

Asserting an Observable instance as any subclass below ViewBase will fail:

```ts
export function navigatingTo(args: EventData): void {
  const viewBase = args.object as ViewBase; // Succeeds

  const view = args.object as View;
  //           ^^^^^^^^^^^^^^^^^^^
  // Error: Conversion of type 'Observable' to type 'View' may be a mistake
  // because neither type sufficiently overlaps with the other.

  const page = args.object as Page;
  //           ^^^^^^^^^^^^^^^^^^^
  // Error: Conversion of type 'Observable' to type 'Page' may be a mistake
  // because neither type sufficiently overlaps with the other.
}
```

I expect that this is some unfortunate interaction of our declaration-merging and NativeScript Core's troublesome hand-written, non-strict, and (in some cases) cyclic types. But as there is also no documentation on the correct way to do declaration-merging for subclasses, it may simply be that I'm missing something and it's a solvable problem. I have tried a bunch of different approaches, however.

For now, the best solution I can offer is:

```ts
const view = args.object as unknown as View;
const page = args.object as unknown as Page;
```

Once this library has proven itself, we may be able to get our EventTarget compatibility (type-only) patches merged directly into Core so that it doesn't need to be done with declaration merging, hopefully alleviating these uncooperative types.

## Usage

```sh
# Not yet published to npm, but it'll be something like this
npm install --save nativescript-dom-events
```

Ideally we'd run this before any other modules via some Webpack plugin, but conceptually:

```ts
// In your NativeScript app's entrypoint file
import { runAllPatches } from 'nativescript-dom-events';

// Before calling any NativeScript Core code
runAllPatches(global);
```

Having run it, you'll be able to call EventTarget APIs on Observable:

```ts
import { Observable } from '@nativescript/core';

const obs = new Observable();
obs.addEventListener(
  'arbitrary',
  (evt) => console.log('Arbitrary event', evt),
  { capture: true }
);
obs.dispatchEvent(new Event('arbitrary', { bubbles: false }));
```
