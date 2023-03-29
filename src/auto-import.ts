import { runAllPatches } from './index';

declare const global: any;

runAllPatches(global);
console.log('Sanity check - just ran auto-import');
