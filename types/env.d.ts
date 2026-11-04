declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL: string;
      EXPO_PUBLIC_ANDROID_STORE_URL?: string;
      EXPO_PUBLIC_IOS_STORE_URL?: string;
    }
  }
}

export {};
