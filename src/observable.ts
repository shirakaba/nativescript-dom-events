import { EventData, Observable, ViewBase } from '@nativescript/core';

import { DOMEvent } from './dom-event';

export const eventDelimiterPattern = /\s*,\s*/;
export function normalizeEventOptions(
  options?: AddEventListenerOptions | boolean
) {
  return typeof options === 'object' ? options : { capture: options };
}

Observable._indexOfListener = function (
  list: Array<ListenerEntry>,
  callback: (data: EventData) => void,
  thisArg?: any,
  options?: EventListenerOptions | boolean
): number {
  const capture = normalizeEventOptions(options)?.capture ?? false;
  return list.findIndex(
    (entry) =>
      entry.callback === callback &&
      (!thisArg || entry.thisArg === thisArg) &&
      !!entry.capture === capture
  );
};

Observable.prototype.notify = function (data, options?: CustomEventInit) {
  // This line is most likely not needed in the first place, but can be safely
  // removed once the Events cleanup PR gets merged.
  data.object = data.object || this;

  // _globalEventHandlers is not exported, so... no global events for now!
  new DOMEvent(data.eventName, options).dispatchTo(this, data as EventData);
};

Observable.prototype.dispatchEvent = function (event: DOMEvent): boolean {
  const data = {
    eventName: event.type,
    object: this,
    detail: event.detail,
  };

  // _globalEventHandlers is not exported, so... no global events for now!
  return event.dispatchTo(this, data);
};

Observable.prototype.isViewBase = function () {
  return this._isViewBase;
};

Observable.prototype.addEventListener = function (
  eventNames: string,
  callback: (data: EventData) => void,
  thisArg?: any,
  options?: AddEventListenerOptions | boolean
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
    if (
      (Observable as ObservablePrivateStatic)._indexOfListener(
        list,
        callback as (data: EventData) => void,
        thisArg,
        options
      ) >= 0
    ) {
      // Don't allow addition of duplicate event listeners.
      continue;
    }

    // TODO: Performance optimization - if we do not have the thisArg specified, do not wrap the callback in additional object (ObserveEntry)
    list.push({
      callback: callback as (data: EventData) => void,
      thisArg,
      ...normalizeEventOptions(options),
    });
  }
};

Observable.prototype.on = function (
  eventNames: string,
  callback: (data: EventData) => void,
  thisArg?: any,
  options?: AddEventListenerOptions | boolean
) {
  this.addEventListener(eventNames, callback, thisArg, options);
};

Observable.prototype.off = function (
  eventNames: string,
  callback: (data: EventData) => void,
  thisArg?: any,
  options?: EventListenerOptions | boolean
) {
  this.removeEventListener(eventNames, callback, thisArg, options);
};

Observable.prototype.removeEventListener = function (
  eventNames: string,
  callback: (data: EventData) => void,
  thisArg?: any,
  options?: EventListenerOptions | boolean
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
      callback as (data: EventData) => void,
      thisArg,
      options
    );
    if (index >= 0) {
      list.splice(index, 1);
    }
    if (list.length === 0) {
      delete this._observers[event];
    }
  }
};

Observable.prototype.once = function (
  event: string,
  callback: (data: EventData) => void,
  thisArg?: any,
  options?: (AddEventListenerOptions & { once: true }) | boolean
) {
  this.addEventListener(event, callback, thisArg, {
    ...normalizeEventOptions(options),
    once: true,
  });
};

interface ListenerEntry extends AddEventListenerOptions {
  callback: (data: EventData) => void;
  thisArg: any;
}

type ObservablePrivateStatic = typeof Observable & {
  _indexOfListener(
    list: Array<ListenerEntry>,
    callback: (data: EventData) => void,
    thisArg?: any,
    options?: EventListenerOptions | boolean
  ): number;
};

export interface ObservableEventTarget
  extends Omit<Observable, keyof EventTarget>,
    EventTarget {
  isViewBase(): this is ViewBase;
}
