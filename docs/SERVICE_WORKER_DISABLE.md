Service Worker: temporary disable / re-enable
=========================================

What I changed
--------------

- Added a config flag to `_config.yml`: `disable_service_worker: false` (default).
- Updated `_includes/head.html` so:
  - When `disable_service_worker: true`, the page will try to unregister any active service workers and clear client caches on load.
  - When `disable_service_worker: false` the original registration behavior is used (register `/sw.js`).
 - The same flag also disables PWA assets (manifest + apple meta tags) and the `pwa.js` client script include so the site behaves like a non-PWA when disabled.

Why this helps
---------------

Setting `disable_service_worker: true` prevents the site from registering the service worker for new visitors
and also actively tries to unregister previously-registered service workers and clear caches for visiting clients.
This is intended as a temporary measure while you troubleshoot or disable PWA behavior.

How to disable the service worker (temporarily)
-----------------------------------------------

1. Open `_config.yml` and set:

```yaml
disable_service_worker: true
```

2. Rebuild / deploy the site (the usual build/deploy flow you use for this repo).

3. When users visit the site after the deployment, their browsers will run a script that attempts to:
   - unregister all service workers for the site
   - delete any site caches accessible via the Cache API

Notes about client behavior
--------------------------

- Some browsers may keep an old service worker active until all tabs/clients controlled by it are closed. Advise users (or yourself while testing) to close all tabs for the site and re-open a fresh tab after deployment.
- Clearing caches via the Cache API helps remove cached assets, but some browser caches (HTTP cache) may persist until a hard reload.

How to re-enable the service worker
----------------------------------

1. In `_config.yml` set:

```yaml
disable_service_worker: false
```

2. Rebuild / redeploy the site. The original registration code will run again and register `/sw.js` on page load.

Manual unregister (for testing / local dev)
-----------------------------------------

You can manually unregister service workers from the browser console (useful when testing locally). Open DevTools -> Console on the site and run:

```js
// Unregister all SWs for current origin
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(r){ r.unregister(); });
    console.log('Attempted to unregister', regs.length, 'service workers');
  });
}

// Remove client caches created by service worker
if (window.caches && caches.keys) {
  caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
    .then(() => console.log('Caches cleared'))
    .catch(e => console.log('Cache clear error', e));
}
```

Tips
----

- If a service worker keeps re-appearing after you re-deploy with `disable_service_worker: true`, make sure you actually deployed the updated site and that the browser is loading the updated HTML that contains the conditional. Check the page source to confirm the unregister script is present.
- For local testing, open DevTools -> Application -> Service Workers to inspect and unregister worker registrations manually.

If you want, I can also:

- Add a development-only toggle (e.g., a meta tag or env var) so you can quickly disable SW without changing `_config.yml`.
- Remove `sw.js` from the built output for a deployment (not usually recommended; the Liquid approach above is safer).

---
Generated changes:

- `_config.yml` (added `disable_service_worker: false`)
- `_includes/head.html` (registration wrapped in Liquid conditional + unregister/cleanup when disabled)
- `docs/SERVICE_WORKER_DISABLE.md` (this file)
