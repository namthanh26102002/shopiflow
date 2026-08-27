export interface TimelineTemplate {
  label: string;
  template: string;
  variables: string[];
  defaultDelayHours: number;
}

export const TIMELINE_TEMPLATES: TimelineTemplate[] = [
  {
    label: 'Order Received',
    template: 'Order received',
    variables: [],
    defaultDelayHours: 0,
  },
  {
    label: 'Order Processed at Warehouse',
    template: 'Order processed at warehouse – {Warehouse Name}',
    variables: ['Warehouse Name'],
    defaultDelayHours: 6,
  },
  {
    label: 'USPS Awaiting Item',
    template: 'USPS Awaiting Item',
    variables: [],
    defaultDelayHours: 12,
  },
  {
    label: 'Accepted at USPS Facility',
    template: 'Accepted at USPS Facility – {Location}',
    variables: ['Location'],
    defaultDelayHours: 24,
  },
  {
    label: 'Departed USPS Regional Facility',
    template: 'Departed USPS Regional Facility – {Location}',
    variables: ['Location'],
    defaultDelayHours: 30,
  },
  {
    label: 'Arrived at USPS Regional Facility',
    template: 'Arrived at USPS Regional Facility – {Location}',
    variables: ['Location'],
    defaultDelayHours: 48,
  },
  {
    label: 'Arrived at Post Office',
    template: 'Arrived at Post Office – {Location}',
    variables: ['Location'],
    defaultDelayHours: 72,
  },
  {
    label: 'Out for Delivery',
    template: 'Out for delivery',
    variables: [],
    defaultDelayHours: 78,
  },
  {
    label: 'Delivered',
    template: 'Delivered – {Location}',
    variables: ['Location'],
    defaultDelayHours: 96,
  },
];
