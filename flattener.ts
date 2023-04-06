export const flattener = <T>(previous: T[], current: T[]): T[] => [
  ...previous,
  ...current,
];
