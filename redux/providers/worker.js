// Copyright 2015-2017 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import { setWorker } from './workerActions';

let runtime = null;
let PromiseWorker = null;
let WebWorker = null;

try {
  PromiseWorker = require('promise-worker');
  WebWorker = require('worker-loader!../../webWorker.js');
  runtime = require('serviceworker-webpack-plugin/lib/runtime');
} catch (error) {
}

function setupServiceWorker () {
  if (!('serviceWorker' in navigator) || !runtime) {
    return Promise.reject('ServiceWorker is not available in your browser.');
  }

  const getServiceWorker = () => {
    return navigator.serviceWorker.ready
      .then((registration) => {
        const worker = registration.active;

        worker.controller = registration.active;

        return new PromiseWorker(worker);
      });
  };

  return new Promise((resolve, reject) => {
    // Safe guard for registration bugs (happens in Chrome sometimes)
    const timeoutId = window.setTimeout(() => {
      console.warn('could not register ServiceWorker after 2.5s');
      getServiceWorker().then(resolve).catch(reject);
    }, 2500);

    // Setup the Service Worker
    runtime
      .register()
      .then(() => {
        window.clearTimeout(timeoutId);
        return getServiceWorker();
      })
      .then(resolve).catch(reject);
  });
}

function getWorker () {
  try {
    const worker = new PromiseWorker(new WebWorker());

    return Promise.resolve(worker);
  } catch (error) {
    return Promise.reject(error);
  }
}

export const setupWorker = (store) => {
  const { dispatch, getState } = store;

  const state = getState();
  const stateWorker = state.worker.worker;

  if (stateWorker !== undefined) {
    return;
  }

  getWorker()
    .then((worker) => {
      dispatch(setWorker(worker));
    })
    .catch((error) => {
      console.warn('setupWorker', error);
      dispatch(setWorker(null));
    });
};

// Setup the Service Worker
setupServiceWorker()
  .then(() => console.log('ServiceWorker is setup'))
  .catch((error) => console.warn('ServiceWorker error', error));
