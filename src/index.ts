import { polyfillEvent } from './dom-event';
import { patchObservable, polyfillEventTarget } from './event-target';
import { patchGestures } from './gestures-common';

/**
 * Patches Observable to implement EventTarget.
 * Polyfills Event onto globalThis.
 * Patches GesturesObserver to emit DOMEvents.
 *
 * See README for limitations.
 */
export function runAllPatches(globalThis: any): void {
  polyfillEvent(globalThis);

  patchObservable();
  polyfillEventTarget(globalThis);

  patchGestures();
}
