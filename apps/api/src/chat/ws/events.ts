import { EventEmitter } from 'events';

class ChatEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(1000);
  }
}

export const eventBus = new ChatEventBus();
