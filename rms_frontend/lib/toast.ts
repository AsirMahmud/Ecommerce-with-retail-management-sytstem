import { toast as sonnerToast } from "sonner";

/**
 * Standardized application toast utility using Sonner
 */
export const appToast = {
  success: (title: string, description?: string) => {
    sonnerToast.success(title, {
      description,
      duration: 3500,
    });
  },

  error: (title: string, description?: string) => {
    sonnerToast.error(title, {
      description: description || "An unexpected error occurred. Please try again.",
      duration: 4500,
    });
  },

  warning: (title: string, description?: string) => {
    sonnerToast.warning(title, {
      description,
      duration: 4000,
    });
  },

  info: (title: string, description?: string) => {
    sonnerToast.info(title, {
      description,
      duration: 3500,
    });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};
