import {
  type EventData,
  Observable,
  type ListenerEntry,
  GestureTypes,
} from '@nativescript/core';
import type { NotifyData } from '@nativescript/core/data/observable';

import { DOMEvent } from './dom-event';

declare module '@nativescript/core' {
  class Observable implements EventTarget {
    // -------------------------------------------------------------------------
    // EventTarget methods
    // -------------------------------------------------------------------------

    addEventListener(
      eventNames: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean
    ): void;

    removeEventListener(
      eventNames: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ): void;

    dispatchEvent(event: Event): boolean;

    // -------------------------------------------------------------------------
    // EventTarget aliases
    // -------------------------------------------------------------------------

    on(
      eventNames: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean
    ): void;

    off(
      eventNames: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ): void;

    notify(event: Event): boolean;

    // -------------------------------------------------------------------------
    // Private APIs we need to expose
    // -------------------------------------------------------------------------

    static _indexOfListener(
      list: Array<ListenerEntry>,
      callback:
        | EventListenerOrEventListenerObject
        | ((data: EventData) => void),
      thisArg?: any,
      capture?: boolean
    ): number;

    _getEventList(
      eventName: string,
      createIfNeeded?: boolean
    ): Array<ListenerEntry>;
    readonly _observers: { [eventName: string]: ListenerEntry[] };
  }

  // It seems we have to redeclare any subclass of Observable that redefines
  // addEventListener(), because the lowest subclass seems to clobber any
  // redeclarations made by superclasses - this is strange because I'd expect
  // them just to be merged.
  //
  // Really it would make more sense to redeclare ViewCommon than View, but for
  // unclear dark TypeScript reasons, redeclaring EventTarget APIs on ViewCommon
  // has no effect.
  abstract class View implements EventTarget {
    addEventListener(
      eventNames: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: AddEventListenerOptions | boolean
    ): void;
    // It also seems I need to redeclare this overload (if I care about
    // maintaining compatibility with non-DOM addEventListener) from ViewCommon
    // as it is otherwise clobbered.
    addEventListener(
      arg: string | GestureTypes,
      callback: (data: EventData) => void,
      thisArg?: any
    ): void;

    removeEventListener(
      eventNames: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: EventListenerOptions | boolean
    ): void;
    // Redeclare the original overload.
    removeEventListener(
      arg: string | GestureTypes,
      callback?: any,
      thisArg?: any
    ): void;
    dispatchEvent(event: Event): boolean;
  }

  interface ListenerEntry extends AddEventListenerOptions {
    callback: EventListenerOrEventListenerObject | ((data: EventData) => void);
    thisArg?: any;
  }
}

export const eventDelimiterPattern = /\s*,\s*/;

/**
 * Patches Observable to implement EventTarget.
 */
export function patchObservable(): void {
  Observable._indexOfListener = function (
    list: Array<ListenerEntry>,
    callback: EventListenerOrEventListenerObject | ((data: EventData) => void),
    thisArg?: any,
    capture?: boolean
  ): number {
    return list.findIndex(
      (entry) =>
        entry.callback === callback &&
        (!thisArg || entry.thisArg === thisArg) &&
        !!entry.capture === capture
    );
  };

  Observable.prototype.notify = function <T extends NotifyData>(
    data: T | Event
  ): boolean {
    if (isNotifyData(data)) {
      data.object = data.object || this;
    }

    // We can't support global events with this patch, as _globalEventHandlers
    // is fileprivate. It sounds like they're not important, in any case.

    const event = isNotifyData(data) ? new DOMEvent(data.eventName) : data;

    console.log(
      `Observable.notify (${isNotifyData(data)}) with event class name: ${
        event.constructor.name
      }`,
      event
    );

    return this.dispatchEvent(event);
  };

  Observable.prototype.dispatchEvent = function (event: DOMEvent): boolean {
    const data = {
      eventName: event.type,
      object: this,
      detail: event.detail,
    };

    console.log(
      `Observable.dispatchTo with event class name: ${event.constructor.name}`,
      event
    );

    return event.dispatchTo(this, data);
  };

  Observable.prototype.addEventListener = function (
    eventNames: string,
    callback:
      | EventListenerOrEventListenerObject
      | null
      | ((data: EventData) => void),
    optionsOrThisArg?: AddEventListenerOptions | boolean | any
  ) {
    if (typeof eventNames !== 'string') {
      throw new TypeError('Events name(s) must be string.');
    }

    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be function.');
    }

    const events = eventNames.trim().split(eventDelimiterPattern);
    for (let i = 0, l = events.length; i < l; i++) {
      const event = events[i];
      const list = this._getEventList(event, true);

      const treatAsEventOptions = isProbablyEventOptions(optionsOrThisArg);

      if (
        Observable._indexOfListener(
          list,
          callback,
          treatAsEventOptions ? undefined : optionsOrThisArg,
          usesCapture(optionsOrThisArg)
        ) >= 0
      ) {
        // Don't allow addition of duplicate event listeners.
        continue;
      }

      list.push({
        callback,
        thisArg: treatAsEventOptions ? undefined : optionsOrThisArg,
        // TODO: can optimise by setting properties directly rather than
        // creating this temporary object just to immediately spread it.
        ...normalizeEventOptions(optionsOrThisArg),
      });
    }
  };

  Observable.prototype.on = function (
    eventNames: string,
    callback:
      | EventListenerOrEventListenerObject
      | null
      | ((data: EventData) => void),
    optionsOrThisArg?: AddEventListenerOptions | boolean | any
  ) {
    console.log('!! on', eventNames, callback, optionsOrThisArg);
    this.addEventListener(
      eventNames,
      callback as (data: EventData) => void,
      optionsOrThisArg
    );
  };

  Observable.prototype.removeEventListener = function (
    eventNames: string,
    callback?:
      | EventListenerOrEventListenerObject
      | null
      | ((data: EventData) => void),
    optionsOrThisArg?: EventListenerOptions | boolean
  ) {
    if (typeof eventNames !== 'string') {
      throw new TypeError('Events name(s) must be string.');
    }

    if (callback && typeof callback !== 'function') {
      throw new TypeError('Callback, if provided, must be function.');
    }

    for (const event of eventNames.trim().split(eventDelimiterPattern)) {
      if (!callback) {
        delete this._observers[event];
        continue;
      }

      const list = this._getEventList(event, false);
      if (!list) {
        continue;
      }

      const index = Observable._indexOfListener(
        list,
        callback,
        isProbablyEventOptions(optionsOrThisArg) ? undefined : optionsOrThisArg,
        usesCapture(optionsOrThisArg)
      );
      if (index >= 0) {
        list.splice(index, 1);
      }
      if (list.length === 0) {
        delete this._observers[event];
      }
    }
  };

  Observable.prototype.off = Observable.prototype.removeEventListener;
}

/**
 * Polyfills Observable as the implementation for EventTarget.
 */
export function polyfillEventTarget(globalThis: any): void {
  globalThis.EventTarget = Observable;
}

/**
 * Determines what `capture` value we should assume from an `options` or
 * `thisArg` param.
 *
 * The DOM spec doesn't say how to handle non-boolean values in the third param
 * of addEventListener, so we'll return false in such cases.
 */
export function usesCapture(
  optionsOrThisArg?: AddEventListenerOptions | boolean | any
): boolean {
  if (typeof optionsOrThisArg === 'object' && optionsOrThisArg !== null) {
    // `thisArg` could theoretically be e.g. { capture: string; }, so we check
    // strictly for boolean/undefined.
    if (
      typeof optionsOrThisArg.capture === 'boolean' ||
      typeof optionsOrThisArg.capture === 'undefined'
    ) {
      return !!optionsOrThisArg.capture;
    }
    return false;
  }

  // `thisArg` could be e.g. a string, so again, we check for boolean/undefined.
  if (
    typeof optionsOrThisArg === 'boolean' ||
    typeof optionsOrThisArg === 'undefined'
  ) {
    return !!optionsOrThisArg;
  }

  return false;
}

/**
 * Normalizes optionsOrThisArg into a AddEventListenerOptions where all fields
 * are non-optional (`signal` is an explicit undefined).
 */
export function normalizeEventOptions(
  optionsOrThisArg?: AddEventListenerOptions | boolean | any
): AddEventListenerOptions {
  if (typeof optionsOrThisArg === 'object' && optionsOrThisArg !== null) {
    return {
      once: typeof optionsOrThisArg.once === 'boolean' && optionsOrThisArg.once,
      capture:
        typeof optionsOrThisArg.capture === 'boolean' &&
        optionsOrThisArg.capture,
      passive:
        typeof optionsOrThisArg.passive === 'boolean' &&
        optionsOrThisArg.passive,
      signal:
        typeof optionsOrThisArg.signal === 'function'
          ? optionsOrThisArg.signal
          : undefined,
    };
  }

  return {
    once: false,
    passive: false,
    signal: undefined,
    capture:
      typeof optionsOrThisArg === 'boolean' ||
      typeof optionsOrThisArg === 'undefined'
        ? !!optionsOrThisArg
        : false,
  };
}

/**
 * We can't be totally sure whether we've been passed a `this` arg or some
 * event listener options, because thisArg accepts any type. A particularly
 * tricky case is the empty object, or an object that extends or overlaps with
 * AddEventListenerOptions.
 *
 * Core has tests showing thisArg being used for number, Array<number>, and
 * more, but within the source, it's mainly Observable. For userland code, as
 * it's unlikely to use thisArg in the first place, it's probably preferable to
 * treat as EventOptions when in doubt, so as not to re-bind the user's event
 * listener.
 */
export function isProbablyEventOptions(
  optionsOrThisArg?: AddEventListenerOptions | boolean | any
): optionsOrThisArg is AddEventListenerOptions | boolean | undefined {
  return (
    typeof optionsOrThisArg === 'boolean' ||
    typeof optionsOrThisArg === 'undefined' ||
    (typeof optionsOrThisArg === 'object' && optionsOrThisArg !== null)
  );
}

function isNotifyData<T extends NotifyData>(data: T | Event): data is T {
  return !!(data as T).eventName;
}
