import { EventData, Page } from '@nativescript/core';
import { HelloWorldModel } from './main-view-model';

export function navigatingTo(args: EventData) {
  const page = args.object as unknown as Page;
  page.bindingContext = new HelloWorldModel();
}
