import {
   state,
   init,
   detect,
   matrix,
   model,
   apply,
   plydata,
} from './worldEngine.js'

function size(data) {
   state.width = data.width
   state.height = data.height
}

const handlers = {
   init,
   size,
   detect,
   matrix,
   model,
   apply,
   plydata,
}

self.onmessage = function (e) {
   const type = e.data.type
   const fn = handlers[type]
   if (typeof fn !== 'function') {
      throw new Error('no handler for type: ' + e.data.type)
   } else if (type === 'detect' || type === 'plydata') {
      self.postMessage(fn(e.data))
   } else fn(e.data)
}
