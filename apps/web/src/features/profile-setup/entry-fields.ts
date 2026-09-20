/** A control's edge: the ordinary one, or the danger one while it holds a problem. */
export const border = (error: string | undefined) =>
  error === undefined ? 'border-border' : 'border-border-danger';

/** A native date input: the browser's own calendar, keyboard entry and date format. */
export const DATE_INPUT = { type: 'date', min: '1900-01-01', max: '2100-12-31' } as const;
