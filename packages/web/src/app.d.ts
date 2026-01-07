// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    interface Locals {
      user?: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
      };
      accessToken?: string;
      refreshToken?: string;
      instanceUrl?: string;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};

