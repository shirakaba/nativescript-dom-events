import { polyfillEvent } from './dom-event';
import { patchObservable, polyfillEventTarget } from './event-target';

/**
 * Patches Observable to implement EventTarget.
 * Polyfills Event onto globalThis.
 *
 * See README for limitations.
 *
 * TODO: patch gesture handlers
 */
export function runAllPatches(globalThis: any): void {
  polyfillEvent(globalThis);

  patchObservable();
  polyfillEventTarget(globalThis);
}
