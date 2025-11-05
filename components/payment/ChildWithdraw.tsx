"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Select, { SingleValue } from "react-select";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axiosInstance";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toast } from "sonner";
import {
  ADMIN_API_ENDPOINT,
  ADD_WITHDRAWAL,
  USER_ALL_CHILD_LIST,
  SUCCESS,
} from "@/constant/index";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Role = string;

type Authenticated = {
  userName: string;
  userId: string;
  role: Role;
  depositWithdrawAtsSystem?: boolean;
};

type UserOption = { value: string; label: string };
type WithdrawalType = "upi" | "bank";
type PaymentRequestType = "debit" | "credit";

type FormData = {
  userName: string;
  userId: UserOption | null;
  amount: number | "";
  branch: string;
  ifsc: string;
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  reEnterAccountNumber: string;
  upiId: string;
  withdrawalType: WithdrawalType;
  paymentRequestType: PaymentRequestType;
  status: number;
  comment?: string;
  transactionId?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess?: () => void;
  onSuccessNavigateTo?: string;
  defaultUser?: UserOption | { userId: string; name: string; phone?: string };
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function WithdrawForm({
  open,
  onOpenChange,
  onSuccess,
  onSuccessNavigateTo = "/admin/payment/withdraw-requests",
  defaultUser,
}: Props) {
  const router = useRouter();

  // ---- Auth / LS ----
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const authenticated = safeParse<Authenticated>(
    typeof window !== "undefined"
      ? localStorage.getItem("authenticated")
      : null,
    { userName: "", userId: "", role: "", depositWithdrawAtsSystem: false }
  );

  // ---- Local state ----
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isValidIfsc, setIsValidIfsc] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const initialForm: FormData = useMemo(
    () => ({
      userName: authenticated.userName,
      userId: null,
      amount: "",
      branch: "",
      ifsc: "",
      beneficiaryName: "",
      bankName: "",
      accountNumber: "",
      reEnterAccountNumber: "",
      upiId: "",
      withdrawalType: "upi",
      paymentRequestType: "debit",
      status: 2, // pending by default
      comment: "",
      transactionId: "",
    }),
    [authenticated.userName]
  );

  const [form, setForm] = useState<FormData>(initialForm);

  // Preselect default user when dialog opens / defaultUser changes
  useEffect(() => {
    if (!open) return;
    setForm(initialForm); // reset on open
    if (defaultUser) {
      const opt: UserOption =
        "value" in defaultUser
          ? defaultUser
          : {
              value: String(defaultUser.userId ?? ""),
              label: `${defaultUser.name}${
                defaultUser.phone ? ` (${defaultUser.phone})` : ""
              }`,
            };
      setForm((p) => ({ ...p, userId: opt }));
    }
  }, [open, defaultUser, initialForm]);

  // Fetch users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const body = JSON.stringify({
        data: encryptData({ role: authenticated.role, page: 0, limit: 500 }),
      });
      const res = await apiClient.post(USER_ALL_CHILD_LIST, body, {
        headers: {
          Authorization: jwt_token ?? "",
          "Content-Type": "application/json",
        },
      });

      if (res.data?.statusCode === SUCCESS) {
        const r = decryptData(res.data.data) as Array<{
          userId: string;
          userName: string;
        }>;
        setUserOptions(
          (r || []).map((u) => ({ value: u.userId, label: u.userName }))
        );
      } else {
        toast.error(res.data?.message ?? "Failed to fetch users");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Network error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Helpers
  const setField = (name: keyof FormData, value: any) =>
    setForm((p) => ({ ...p, [name]: value }));

  const handleText = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (name === "ifsc") return setField("ifsc", value.toUpperCase());
    if (name === "amount") {
      const n = value === "" ? "" : Number(value);
      return setField("amount", Number.isFinite(n) ? n : "");
    }
    if (name === "status") return setField("status", Number(value));
    setField(name as keyof FormData, type === "number" ? Number(value) : value);
  };

  const handleUser = (selected: SingleValue<UserOption>) => {
    setField("userId", selected ?? null);
  };

  const validate = (): string | null => {
    if (!form.userId) return "Select user is required";
    if (!form.amount || Number(form.amount) <= 0)
      return "Amount must be greater than 0";
    if (!form.transactionId) return "Transaction ID is required";

    if (form.withdrawalType === "upi") {
      if (!form.upiId) return "UPI ID is required";
    } else {
      if (
        !form.beneficiaryName ||
        !form.bankName ||
        !form.ifsc ||
        !form.accountNumber ||
        !form.reEnterAccountNumber
      )
        return "All bank fields are required";
      if (!isValidIfsc) return "IFSC code not valid";
      if (form.accountNumber !== form.reEnterAccountNumber)
        return "Account number and confirmation do not match";
    }
    return null;
  };

  const checkIFSC = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) {
      setIsValidIfsc(false);
      setField("branch", "");
      return;
    }
    try {
      const resp = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (resp.status === 404) {
        setIsValidIfsc(false);
        setField("branch", "");
        return;
      }
      const data = await resp.json();
      if (data?.BRANCH) {
        setIsValidIfsc(true);
        setField("branch", data.BRANCH);
      } else {
        setIsValidIfsc(false);
        setField("branch", "");
      }
    } catch {
      setIsValidIfsc(false);
      setField("branch", "");
    }
  };

  const getDeviceInfo = async () => {
    const ua = navigator.userAgent;
    const inferredType = /Mobi|Android/i.test(ua) ? "mobile" : "desktop";
    let deviceId = localStorage.getItem("deviceId") || "";
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem("deviceId", deviceId);
    }
    let deviceType = localStorage.getItem("deviceType") || inferredType;
    localStorage.setItem("deviceType", deviceType);

    let ip = "";
    try {
      const r = await axios.get("https://api.ipify.org?format=json");
      ip = r.data?.ip ?? "";
    } catch {}

    let browser = "Unknown";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    return { deviceType, browser, userAgent: ua, deviceId, ip };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    const { deviceType, browser, userAgent, deviceId, ip } =
      await getDeviceInfo();

    const payload = {
      userId: form.userId?.value,
      parentId: authenticated.userId,
      amount: Number(form.amount),
      transactionId: form.transactionId,
      paymentRequestType: form.paymentRequestType,
      withdrawalType: form.withdrawalType,
      bankName: form.bankName,
      beneficiaryName: form.beneficiaryName,
      accountNumber: form.accountNumber,
      ifsc: form.ifsc,
      upiId: form.upiId,
      status: form.status,
      comment: form.comment,
      browser,
      userAgent,
      deviceId,
      deviceType,
      ipAddress: ip,
    };

    setSubmitting(true);
    try {
      const res = await apiClient.post(
        ADD_WITHDRAWAL,
        JSON.stringify({ data: encryptData(payload) }),
        {
          headers: {
            Authorization: jwt_token ?? "",
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.statusCode === SUCCESS) {
        toast.success(res.data?.meta?.message ?? "Withdrawal created");
        onOpenChange(false);
        onSuccess?.();
        if (onSuccessNavigateTo) router.push(onSuccessNavigateTo);
      } else {
        toast.error(res.data?.message ?? "Request failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#1e2329] border border-[#2a2f36]">
        <DialogHeader>
          <DialogTitle className="text-[#fcd535]">Withdraw</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Type */}
          <div className="md:col-span-2">
            <Label className="block text-sm mb-1 text-gray-300">Type *</Label>
            <div className="flex items-center gap-6 text-gray-200">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="withdrawalType"
                  value="upi"
                  checked={form.withdrawalType === "upi"}
                  onChange={(e) =>
                    setField("withdrawalType", e.target.value as WithdrawalType)
                  }
                />
                UPI
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="withdrawalType"
                  value="bank"
                  checked={form.withdrawalType === "bank"}
                  onChange={(e) =>
                    setField("withdrawalType", e.target.value as WithdrawalType)
                  }
                />
                Bank Account
              </label>
            </div>
          </div>

          {/* User */}
          <div>
            <Label className="block text-sm mb-1 text-gray-300">
              Select User *
            </Label>
            <Select<UserOption, false>
              classNamePrefix="react-select"
              className="bg-gray-800 text-white" // Ensure the background color is the same
              value={form.userId}
              onChange={handleUser}
              options={userOptions}
              isLoading={loadingUsers && !userOptions.length}
              placeholder="Choose a user"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: "#2a2f36", // Dark background
                  color: "#fff", // Text color inside the control (input field)
                  borderColor: "#3a3f46", // Border color
                  borderRadius: "4px",
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: "#2a2f36", // Dropdown menu background
                  borderColor: "#3a3f46", // Dropdown menu border color
                }),
                option: (base, { isSelected, isFocused }) => ({
                  ...base,
                  backgroundColor: isSelected
                    ? "#fcd535" // Selected option background
                    : isFocused
                    ? "#3a3f46" // Focused option background
                    : "#2a2f36", // Default option background
                  color: "#fff", // Text color for options
                }),
                placeholder: (base) => ({
                  ...base,
                  color: "#fff", // Placeholder text color
                }),
                singleValue: (base) => ({
                  ...base,
                  color: "#fff", // Text color for selected value
                }),
              }}
            />
          </div>

          {/* Amount */}
          <div>
            <Label className="block text-sm mb-1 text-gray-300">Amount *</Label>
            <input
              className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
              id="amount"
              name="amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={handleText}
              placeholder="Enter amount"
            />
          </div>

          {/* Transaction ID */}
          <div className="md:col-span-2">
            <Label className="block text-sm mb-1 text-gray-300">
              Transaction ID *
            </Label>
            <input
              className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
              id="transactionId"
              name="transactionId"
              type="text"
              value={form.transactionId}
              onChange={handleText}
              placeholder="Enter transaction ID"
            />
          </div>

          {/* UPI */}
          {form.withdrawalType === "upi" && (
            <div className="md:col-span-2">
              <Label className="block text-sm mb-1 text-gray-300">
                UPI ID *
              </Label>
              <input
                className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
                id="upiId"
                name="upiId"
                type="text"
                value={form.upiId}
                onChange={handleText}
                placeholder="name@bank"
              />
            </div>
          )}

          {/* Bank */}
          {form.withdrawalType === "bank" && (
            <Fragment>
              <div>
                <Label className="block text-sm mb-1 text-gray-300">
                  Beneficiary Name *
                </Label>
                <input
                  className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
                  id="beneficiaryName"
                  name="beneficiaryName"
                  type="text"
                  value={form.beneficiaryName}
                  onChange={handleText}
                  placeholder="Enter beneficiary name"
                />
              </div>

              <div>
                <Label className="block text-sm mb-1 text-gray-300">
                  Bank Name *
                </Label>
                <input
                  className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
                  id="bankName"
                  name="bankName"
                  type="text"
                  value={form.bankName}
                  onChange={handleText}
                  placeholder="Enter bank name"
                />
              </div>

              <div>
                <Label className="block text-sm mb-1 text-gray-300">
                  IFSC *
                </Label>
                <input
                  className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
                  id="ifsc"
                  name="ifsc"
                  type="text"
                  value={form.ifsc}
                  onChange={handleText}
                  onBlur={() => checkIFSC(form.ifsc)}
                  placeholder="Enter IFSC"
                />
                {!isValidIfsc && (
                  <span className="text-red-400 text-xs">
                    IFSC code not valid
                  </span>
                )}
                {form.branch && (
                  <span className="text-xs text-gray-400 ml-2">
                    {form.branch}
                  </span>
                )}
              </div>

              <div>
                <Label className="block text-sm mb-1 text-gray-300">
                  A/C Number *
                </Label>
                <input
                  className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
                  id="accountNumber"
                  name="accountNumber"
                  type="text"
                  value={form.accountNumber}
                  onChange={handleText}
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <Label className="block text-sm mb-1 text-gray-300">
                  Re-Enter A/C Number *
                </Label>
                <input
                  className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
                  id="reEnterAccountNumber"
                  name="reEnterAccountNumber"
                  type="text"
                  value={form.reEnterAccountNumber}
                  onChange={handleText}
                  placeholder="Re-enter account number"
                />
              </div>
            </Fragment>
          )}

          {/* Comment */}
          <div className="md:col-span-2">
            <Label className="block text-sm mb-1 text-gray-300">Comment</Label>
            <textarea
              className="w-full rounded border border-gray-700 bg-[#2A2F36] px-3 py-2 text-white"
              id="comment"
              name="comment"
              rows={3}
              value={form.comment}
              onChange={handleText}
              placeholder="Add a note (optional)"
            />
          </div>

          {/* Status (show only if ATS disabled) */}
          {authenticated.depositWithdrawAtsSystem === false && (
            <div className="md:col-span-2 flex items-center gap-8">
              <div className="text-sm text-gray-300">Status *</div>
              <label className="inline-flex items-center gap-2 text-gray-200">
                <input
                  type="radio"
                  name="status"
                  value={1}
                  checked={form.status === 1}
                  onChange={handleText}
                />
                Approved
              </label>
              <label className="inline-flex items-center gap-2 text-gray-200">
                <input
                  type="radio"
                  name="status"
                  value={3}
                  checked={form.status === 3}
                  onChange={handleText}
                />
                Dis-Approved
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="md:col-span-2 flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded border border-gray-700 bg-gray-800 text-white"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (loadingUsers && !userOptions.length)}
              className="px-4 py-2 rounded bg-[#fcd535] text-black disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
