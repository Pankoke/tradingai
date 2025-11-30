export type EventImpact = 1 | 2 | 3;

export type EventDomainModel = {
  id: string;
  title: string;
  category: string;
  impact: EventImpact;
  country?: string;
  scheduledAt: Date;
  source: string;
};

export interface EventProvider {
  getEvents(params: { from: Date; to: Date }): Promise<EventDomainModel[]>;
}
