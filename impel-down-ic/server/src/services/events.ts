import { EventEmitter } from 'events';

class InternalEventBus extends EventEmitter {
  emitEvent(eventName: string, payload: any) {
    this.emit(eventName, payload);
  }
}

export const eventBus = new InternalEventBus();

// Events
export const EventBusTypes = {
  INCIDENT_CREATED: 'INCIDENT_CREATED',
  INCIDENT_UPDATED: 'INCIDENT_UPDATED',
  INCIDENT_RESOLVED: 'INCIDENT_RESOLVED',
  INCIDENT_ESCALATED: 'INCIDENT_ESCALATED',
  BUSTER_CALL_TRIGGERED: 'BUSTER_CALL_TRIGGERED',
};
