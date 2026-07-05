import { useCallback, useState } from "react";
import { toast } from "sonner";

export const notifySuccess = (msg: string, options?: Parameters<typeof toast.success>[1]) =>
  toast.success(msg, options);
export const notifyError = (msg: string, options?: Parameters<typeof toast.error>[1]) =>
  toast.error(msg, options);
export const notifyWarning = (msg: string, options?: Parameters<typeof toast.warning>[1]) =>
  toast.warning(msg, options);

function isErrorMessage(message: string) {
  return [
    "akses tidak",
    "already",
    "belum",
    "cannot",
    "could not",
    "duplikat",
    "duplicate",
    "error",
    "expired",
    "failed",
    "forbidden",
    "foreign key",
    "gagal",
    "invalid",
    "kosong",
    "missing",
    "network",
    "not ",
    "not found",
    "null",
    "permission",
    "policy",
    "pilih",
    "required",
    "silakan coba",
    "timeout",
    "tidak",
    "unauthorized",
    "violates",
    "wajib",
  ].some((keyword) => message.toLowerCase().includes(keyword));
}

export function useNotifiedMessage() {
  const [message, setMessageState] = useState("");

  const setMessage = useCallback((nextMessage: string) => {
    setMessageState(nextMessage);
    if (!nextMessage.trim()) return;
    if (isErrorMessage(nextMessage)) notifyError(nextMessage);
    else notifySuccess(nextMessage);
  }, []);

  return [message, setMessage] as const;
}
