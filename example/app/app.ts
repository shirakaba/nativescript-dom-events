import { runAllPatches } from 'nativescript-dom-events';
import 'nativescript-dom-events/dist/observable';

runAllPatches(global);

import { Application, Observable, StackLayout } from '@nativescript/core';

Application.run({
  create: () => {
    const observable = new Observable();

    const stackLayout = new StackLayout();
    observable.addEventListener(
      'arbitrary',
      (evt: Event) => console.log('arbitrary observable', evt),
      { capture: true }
    );
    stackLayout.addEventListener(
      'arbitrary',
      (evt: Event) => console.log('arbitrary stackLayout', evt),
      { capture: true }
    );
    observable.dispatchEvent(new Event('arbitrary'));

    return stackLayout;
  },
});

/*
Do not place any code after the application has been started as it will not
be executed on iOS.
*/
