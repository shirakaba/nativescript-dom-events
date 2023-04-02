import {
  EventData,
  GestureEventData,
  GesturesObserver,
  GestureTypes,
  ListenerEntry,
  Observable,
  View,
} from '@nativescript/core';
import { getEventOrGestureName } from '@nativescript/core/ui/core/bindable';
import { ViewCommon } from '@nativescript/core/ui/core/view';
import {
  fromString as gestureFromString,
  toString as gestureToString,
} from '@nativescript/core/ui/gestures';

import {
  eventDelimiterPattern,
  isProbablyEventOptions,
  normalizeEventOptions,
  usesCapture,
} from './event-target';
import { patchGesturesObserver } from './gestures';

declare module '@nativescript/core' {
  class GesturesObserver {
    // -------------------------------------------------------------------------
    // Private APIs we need to expose
    // -------------------------------------------------------------------------

    /**
     * @private the internal API used to execute a callback corresponding to a
     * given gesture. We expose this so that we can override it dispatch a
     * DOMEvent instead.
     */
    _executeCallback(args: GestureEventData): void;
  }
}

// declare module '@nativescript/core/ui/core/view' {
//   abstract class ViewCommon {}
// }

/**
 * Patches the gesture-handling code (e.g. in
 * packages/core/ui/gestures/gestures-common.ts) to make gesture handlers emit
 * DOMEvents instead of simply calling callbacks.
 *
 * Only works on iOS for now, as the necessary API for patching Android is
 * unfortunately fileprivate.
 */
export function patchGestures(): void {
  patchGesturesObserver();

  // TODO: https://github.com/NativeScript/NativeScript/pull/10100/files#diff-2310136477c597bb685a93dd23e0cbad8626a75f3f82124fe0dc1bb07fde8867
  // packages/core/ui/core/view/index.android.ts
  // packages/core/ui/core/view/view-common.ts

  ViewCommon.prototype._observe = function (
    type: GestureTypes,
    callback: (args: GestureEventData) => void,
    optionsOrThisArg?: AddEventListenerOptions | boolean | any
  ): void {
    const gestureObservers = this._gestureObservers as {
      [gestureName: string]: ObserverEntry[];
    };

    if (!gestureObservers[type]) {
      gestureObservers[type] = [];
    }

    const treatAsEventOptions = isProbablyEventOptions(optionsOrThisArg);
    const thisArg = treatAsEventOptions ? undefined : optionsOrThisArg;

    if (
      ViewCommon._indexOfListener(
        gestureObservers[type],
        callback as (args: EventData) => void,
        thisArg,
        usesCapture(optionsOrThisArg)
      ) >= 0
    ) {
      // Prevent adding an identically-configured gesture observer twice.
      return;
    }

    const observer = new GesturesObserver(
      this as unknown as Partial<View>,
      callback,
      thisArg
    );
    observer.observe(type);

    gestureObservers[type].push({
      callback: callback as (args: EventData) => void,
      observer,
      thisArg,
      ...normalizeEventOptions(optionsOrThisArg),
    });
  };

  // We can't augment ViewCommon for some reason (probably the same as the known
  // issue behind type assertions mentioned in the README)
  (ViewCommon as any).prototype.getGestureObservers =
    function getGestureObservers(type: GestureTypes): readonly ObserverEntry[] {
      return this._gestureObservers[type] || [];
    };

  // We annoyingly can't access super from a reassigned function
  const superAddEventListener = Observable.prototype.addEventListener;
  const superRemoveEventListener = Observable.prototype.removeEventListener;

  ViewCommon.prototype.addEventListener = function addEventListener(
    this: ViewCommon,
    arg: string | GestureTypes,
    callback: EventListenerOrEventListenerObject | ((data: EventData) => void),
    optionsOrThisArg?: AddEventListenerOptions | boolean | any
  ): void {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be function.');
    }

    // To avoid a full refactor of the Gestures system when migrating to DOM
    // Events, we mirror the this._gestureObservers record, creating
    // corresponding DOM Event listeners for each gesture.
    //
    // The callback passed into this._observe() for constructing a
    // GesturesObserver is *not* actually called by the GesturesObserver
    // upon the gesture. It is merely used as a unique symbol by which add
    // and remove the GesturesObserver from the this._gestureObservers
    // record.
    //
    // Upon the gesture, the GesturesObserver actually fires a DOM event
    // named after the gesture, which triggers our listener (registered at
    // the same time).

    if (typeof arg === 'number') {
      this._observe(
        arg,
        callback as (data: EventData) => void,
        optionsOrThisArg
      );
      superAddEventListener.call(
        this,
        gestureToString(arg),
        callback as EventListenerOrEventListenerObject,
        optionsOrThisArg
      );
      return;
    }

    arg = getEventOrGestureName(arg);

    const events = arg.trim().split(eventDelimiterPattern);

    for (const event of events) {
      const gesture = gestureFromString(event);
      if (
        gesture &&
        // private method
        !(this as unknown as { _isEvent(name: string): boolean })._isEvent(arg)
      ) {
        this._observe(
          gesture,
          callback as (data: EventData) => void,
          optionsOrThisArg
        );
      }
      superAddEventListener.call(
        this,
        event,
        callback as EventListenerOrEventListenerObject,
        optionsOrThisArg
      );
    }
  };

  ViewCommon.prototype.removeEventListener = function removeEventListener(
    arg: string | GestureTypes,
    callback?: EventListenerOrEventListenerObject | ((data: EventData) => void),
    optionsOrThisArg?: AddEventListenerOptions | boolean | any
  ): void {
    if (callback && typeof callback !== 'function') {
      throw new TypeError('Callback, if provided, must be function.');
    }

    if (typeof arg === 'number') {
      // private method
      (
        this as unknown as {
          _disconnectGestureObservers(
            type: GestureTypes,
            callback?:
              | EventListenerOrEventListenerObject
              | ((data: EventData) => void),
            optionsOrThisArg?: AddEventListenerOptions | boolean | any
          ): void;
        }
      )._disconnectGestureObservers(
        arg,
        callback as (data: EventData) => void,
        optionsOrThisArg
      );
      superRemoveEventListener.call(
        this,
        gestureToString(arg),
        callback as EventListenerOrEventListenerObject,
        optionsOrThisArg
      );
      return;
    }

    const events = arg.trim().split(eventDelimiterPattern);

    for (const event of events) {
      const gesture = gestureFromString(event);
      if (
        gesture &&
        // private method
        !(this as unknown as { _isEvent(name: string): boolean })._isEvent(arg)
      ) {
        // private method
        (
          this as unknown as {
            _disconnectGestureObservers(
              type: GestureTypes,
              callback?:
                | EventListenerOrEventListenerObject
                | ((data: EventData) => void),
              optionsOrThisArg?: AddEventListenerOptions | boolean | any
            ): void;
          }
        )._disconnectGestureObservers(
          gesture,
          callback as (data: EventData) => void,
          optionsOrThisArg
        );
      }
      superRemoveEventListener.call(
        this,
        event,
        callback as EventListenerOrEventListenerObject,
        optionsOrThisArg
      );
    }
  };
}

interface ObserverEntry extends ListenerEntry {
  observer: GesturesObserver;
}
