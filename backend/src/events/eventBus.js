const { EventEmitter } = require("node:events");

/**
 * Zdarzenia domenowe. Services emitują je dopiero PO commicie transakcji,
 * żeby handler nie zobaczył stanu, który zaraz zniknie przy rollbacku.
 *
 * Handler działa asynchronicznie i jego błąd nie może wywrócić requestu –
 * nieudany mail nie unieważnia wysłanej paczki.
 */
function createEventBus({ logger = console } = {}) {
  const emitter = new EventEmitter();

  function on(event, handler) {
    emitter.on(event, (payload) => {
      Promise.resolve()
        .then(() => handler(payload))
        .catch((error) => {
          logger.error(`[events] handler for "${event}" failed:`, error.message);
        });
    });
  }

  function emit(event, payload) {
    emitter.emit(event, payload);
  }

  return { on, emit };
}

module.exports = { createEventBus };
