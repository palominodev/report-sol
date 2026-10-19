export interface WeekActionFeedback {
  kind: 'success' | 'error';
  text: string;
}

export interface WeekActionCallbacks {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onFeedback?: (feedback: WeekActionFeedback | null) => void;
}
