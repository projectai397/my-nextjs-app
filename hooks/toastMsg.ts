import { toast, Bounce, ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 800,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
  transition: Bounce,
};

export const toastSuccess = (message: string): void => {
  toast.success(message, defaultOptions);
};

export const toastError = (message: string): void => {
  toast.error(message, defaultOptions);
};
