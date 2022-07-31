import {proxy} from './proxy'

addEventListener('fetch', (e) => e.respondWith(proxy(e.request)))
