# nativescript-dom-events

A drop-in EventTarget implementation for NativeScript, satisfying `libdom.d.ts`.

Does the following so far:

* Introduces a new class DOMEvent, which implements Event.
* Makes Observable implement EventTarget (in terms of typings) by overloading `addEventListener()` and `removeEventListener()` with DOM-compliant equivalents and adding a `dispatchEvent()` method to Observable, which fires a DOMEvent.
* Overwrites Observable's implementations of `addEventListener()`, `removeEventListener()`, `on()`, `off()`, `once()`, and `notify()` to make use of DOMEvent. In most cases, this involves taking a best guess at the intended role of the param (`thisArg` or `options`).

TODO:

* Fill in the `example` folder (it's just a blank NativeScript project right now).
* Check whether I need to do something more complicated than `global.Event = DOMEvent` to patch global (e.g. use `Object.defineProperty()`).
* Add tests (I wrote a bunch for my [DOM Events PR](https://github.com/NativeScript/NativeScript/pull/10100), so mainly just need to port them).
* Patch gestures.
* Actually try running this code.

For now this is a proof-of-concept as I want to demonstrate the approach, but I think it's a good starting point for any DOM-related implementation as it solves the typings issue nicely.

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
