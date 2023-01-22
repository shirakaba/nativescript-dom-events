// Make sure this .d.ts file is referenced in any project making use of DOM
// Events, as it augments the Core types to support them.
// https://github.com/microsoft/TypeScript/issues/36146#issuecomment-1190925432
declare global {
  module '@nativescript/core' {
    export interface ListenerEntry extends AddEventListenerOptions {
      callback: (data: EventData) => void;
      thisArg: any;
    }

    export class Observable implements EventTarget {
      readonly _observers: { [eventName: string]: ListenerEntry[] };

      static _indexOfListener(
        list: ListenerEntry[],
        callback: (data: EventData) => void,
        thisArg?: any,
        options?: EventListenerOptions | boolean
      ): number;

      isViewBase(): this is ViewBase;

      _getEventList(
        eventName: string,
        createIfNeeded?: boolean
      ): ListenerEntry[];

      dispatchEvent(event: Event): boolean;

      on(
        eventNames: string,
        callback:
          | EventListenerOrEventListenerObject
          | ((data: EventData) => void),
        thisArg?: any,
        options?: AddEventListenerOptions | boolean
      ): void;

      addEventListener(
        eventNames: string,
        callback:
          | EventListenerOrEventListenerObject
          | ((data: EventData) => void),
        thisArg?: any,
        options?: AddEventListenerOptions | boolean
      ): void;

      once(
        eventNames: string,
        callback:
          | EventListenerOrEventListenerObject
          | ((data: EventData) => void),
        thisArg?: any,
        options?: (AddEventListenerOptions & { once: true }) | boolean
      ): void;

      removeEventListener(
        eventNames: string,
        callback?:
          | EventListenerOrEventListenerObject
          | ((data: EventData) => void),
        thisArg?: any,
        options?: EventListenerOptions | boolean
      ): void;

      off(
        eventNames: string,
        callback?:
          | EventListenerOrEventListenerObject
          | ((data: EventData) => void),
        thisArg?: any,
        options?: EventListenerOptions | boolean
      ): void;
    }
  }
}

typeof EventTarget;
