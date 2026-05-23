import { toast as reactToast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    reactToast.success(message, { ...defaultOptions, ...options });
  },

  error: (message: string, options?: ToastOptions) => {
    reactToast.error(message, { ...defaultOptions, autoClose: 5000, ...options });
  },

  warning: (message: string, options?: ToastOptions) => {
    reactToast.warning(message, { ...defaultOptions, ...options });
  },

  info: (message: string, options?: ToastOptions) => {
    reactToast.info(message, { ...defaultOptions, ...options });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    },
    options?: ToastOptions
  ) => {
    return reactToast.promise(
      promise,
      messages,
      { ...defaultOptions, ...options }
    );
  },
};
