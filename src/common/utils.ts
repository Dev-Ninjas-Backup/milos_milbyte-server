export const isDev = (): boolean => process.env.NODE_ENV !== 'production';

export const devOnly = <T extends object>(data: T): T | Record<string, never> =>
  isDev() ? data : {};
