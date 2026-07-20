// Expo replaces EXPO_PUBLIC_* at build time via babel; declare the shape for TS.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
