"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";
import AsyncSelect from "react-select/async";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  SUPERADMIN_ID,
  ADMIN_ID,
  CLIENT_ID,
  MASTER_ID,
  BROKER_ID,
  OFFICE_ID,
} from "@/lib/constants";
import { encryptData, decryptData } from "@/hooks/crypto";
import {
  ADD_DEPOSIT,
  ADD_WITHDRAWAL,
  USER_ALL_CHILD_LIST,
  SUCCESS,
} from "@/constant/index";

type Option = { value: string; label: string };
type PaymentRequestType = "credit_in" | "credit_out" | "deposit" | "withdraw";
type WithdrawalType = "upi" | "bank";

type DeviceInfo = {
  deviceType: "desktop" | "mobile" | "web";
  browser: string;
  userAgent: string;
  newDeviceId: string;
  ip: string;
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  // 👇 this is what you already send from table row
  // ideally has: { userId, userName, role }
  defaultUser: any;
};

export default function FundsDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultUser,
}: Props) {
  const { data: session } = useSession();

  const token = (session as any)?.accessToken as string | undefined;
  const deviceTypeFromSession =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedUserId = (session?.user as any)?.userId as
    | string
    | undefined;
  const authenticatedRoleId = (session?.user as any)?.role as
    | string
    | undefined;
  const authenticatedRole = (session?.user as any)?.roleName as
    | string
    | undefined;
  const authenticatedUserName = (session?.user as any)?.userName as
    | string
    | undefined;
  const depositWithdrawAtsSystem =
    ((session?.user as any)?.depositWithdrawAtsSystem as boolean | undefined) ??
    false;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  // Common fields
  const [user, setUser] = useState<Option | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [paymentRequestType, setPaymentRequestType] =
    useState<PaymentRequestType>("deposit");
  const [comment, setComment] = useState<string>("");

  // Deposit-only
  const [statusForDeposit, setStatusForDeposit] = useState<1 | 3>(1);

  // Withdraw-only
  const [withdrawalType, setWithdrawalType] = useState<WithdrawalType>("upi");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [bankName, setBankName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [branch, setBranch] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [reEnterAccountNumber, setReEnterAccountNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isValidIfsc, setIsValidIfsc] = useState(true);
  const [statusForWithdraw, setStatusForWithdraw] = useState<1 | 2 | 3>(2);

  const showWithdrawFields = paymentRequestType === "withdraw";
  const showTxnFields = Boolean(authenticatedUserName);

  // ⭐ detect if dialog was opened for a specific user from the table
  const prefilledUserId =
    defaultUser?.userId || defaultUser?._id || defaultUser?.id || "";
  const prefilledUserName =
    defaultUser?.userName ||
    defaultUser?.name ||
    defaultUser?.phone ||
    defaultUser?.email ||
    "";
  const isPrefilledUser = Boolean(prefilledUserId);

  // Reset on open
  useEffect(() => {
    if (!open) return;

    // reset common fields
    setAmount("");
    setTransactionId("");
    setPaymentRequestType("deposit");
    setComment("");
    setStatusForDeposit(1);
    setWithdrawalType("upi");
    setBeneficiaryName("");
    setBankName("");
    setIfsc("");
    setBranch("");
    setAccountNumber("");
    setReEnterAccountNumber("");
    setUpiId("");
    setIsValidIfsc(true);
    setStatusForWithdraw(2);
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // ⭐ if we got user from row: set user state here
    if (isPrefilledUser) {
      setUser({
        value: String(prefilledUserId),
        label: String(prefilledUserName || prefilledUserId),
      });
    } else {
      // else keep it null so we show AsyncSelect
      setUser(null);
    }
  }, [open, isPrefilledUser, prefilledUserId, prefilledUserName]);

  // Load users for search (when not prefilled)
  const loadUserOptions = async (inputValue: string): Promise<Option[]> => {
    if (inputValue.trim().length < 2) return [];
    try {
      const payload = encryptData({
        search: inputValue,
        role: authenticatedRole,
        page: 0,
        limit: 1000,
      });
      const { data } = await apiClient.post(
        USER_ALL_CHILD_LIST,
        JSON.stringify({ data: payload })
      );
      if (data.statusCode !== SUCCESS) return [];
      const rdata = decryptData(data.data);
      return (rdata || []).map((u: any) => ({
        value: String(u.userId ?? ""),
        label: String(u.userName || u.phone || u.userId || ""),
      }));
    } catch {
      return [];
    }
  };

  // Device info
  const getDeviceInfo = async (): Promise<DeviceInfo> => {
    const userAgent = navigator.userAgent;
    const detectedDeviceType: "desktop" | "mobile" | "web" =
      /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
    let browser = "Unknown";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    let newDeviceId = localStorage.getItem("deviceId") || "";
    if (!newDeviceId) {
      newDeviceId = uuidv4();
      localStorage.setItem("deviceId", newDeviceId);
    }
    let deviceTypeLocal =
      (localStorage.getItem("deviceType") as "desktop" | "mobile" | "web") ||
      detectedDeviceType;
    localStorage.setItem("deviceType", deviceTypeLocal);

    let ip = "";
    try {
      const res = await axios.get("https://api.ipify.org?format=json");
      ip = res.data?.ip || "";
    } catch {}

    return {
      deviceType:
        (deviceTypeFromSession as any) || deviceTypeLocal || "desktop",
      browser,
      userAgent,
      newDeviceId,
      ip,
    };
  };

  // IFSC check
  const checkIFSC = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) {
      setIsValidIfsc(false);
      setBranch("");
      return;
    }
    try {
      const resp = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (resp.status === 404) {
        setIsValidIfsc(false);
        setBranch("");
        return;
      }
      const data = await resp.json();
      if (data?.BRANCH) {
        setIsValidIfsc(true);
        setBranch(data.BRANCH);
      } else {
        setIsValidIfsc(false);
        setBranch("");
      }
    } catch {
      setIsValidIfsc(false);
      setBranch("");
    }
  };

  // Validation
  const validate = (): string | null => {
    if (!user?.value) return "Select a user";

    const amt =
      typeof amount === "string"
        ? amount === ""
          ? NaN
          : Number(amount)
        : amount;

    if (paymentRequestType === "deposit") {
      if (Number.isNaN(amt)) return "Enter a valid amount";
      if (amt < 0) return "You cannot add a deposit amount less than 0";
    } else {
      if (!amt || amt <= 0) return "Enter a valid amount";
    }

    if (showTxnFields && !transactionId) return "Transaction ID is required";

    if (showWithdrawFields) {
      if (withdrawalType === "upi") {
        if (!upiId) return "UPI ID is required";
      } else {
        if (
          !beneficiaryName ||
          !bankName ||
          !ifsc ||
          !accountNumber ||
          !reEnterAccountNumber
        )
          return "All bank fields are required";
        if (!isValidIfsc) return "IFSC code not valid";
        if (accountNumber !== reEnterAccountNumber)
          return "Account number and confirmation do not match";
      }
      if (!depositWithdrawAtsSystem && ![1, 2, 3].includes(statusForWithdraw)) {
        return "Invalid status";
      }
    } else {
      if (![1, 3].includes(statusForDeposit))
        return "Please select a deposit status";
    }
    return null;
  };

  // Submit
  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast.error(err);
    if (!token) return toast.error("Missing token");

    const dev = await getDeviceInfo();
    const fd = new FormData();
    if (image) fd.append("image", image);

    const common = {
      // ⭐ this will now always be filled (either prefilled or selected)
      userId: user?.value,
      userName: user?.label,
      amount: Number(amount),
      parentId: authenticatedUserId,
      transactionId,
      comment,
      browser: dev.browser,
      userAgent: dev.userAgent,
      deviceId: dev.newDeviceId,
      deviceType: dev.deviceType,
      ipAddress: dev.ip,
    };

    try {
      setIsSubmitting(true);

      if (showWithdrawFields) {
        const withdrawPayload = encryptData({
          ...common,
          paymentRequestType,
          withdrawalType,
          bankName,
          beneficiaryName,
          accountNumber,
          reEnterAccountNumber,
          ifsc,
          branch,
          upiId,
          status: depositWithdrawAtsSystem ? 2 : statusForWithdraw,
        });
        fd.append("data", withdrawPayload);
        const { data } = await apiClient.post(ADD_WITHDRAWAL, fd);
        if (data.statusCode === SUCCESS) {
          toast.success(data?.meta?.message || "Withdrawal created");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(data.message);
        }
      } else {
        // deposit -> keep old payload
        const depositPayload = encryptData({
          ...common,
          paymentRequestType: "credit",
          status: statusForDeposit,
          atsBankDetails: {},
        });
        fd.append("data", depositPayload);
        const { data } = await apiClient.post(ADD_DEPOSIT, fd);
        if (data.statusCode === SUCCESS) {
          toast.success("Deposit/Credit added successfully!");
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error(data.message);
        }
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl border border-[#2a2f36] shadow-xl bg-[#16191d]/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-[#fcd535] text-xl font-bold tracking-wide">
            Add Deposit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* payment type buttons filtered by defaultUser role */}
          <div className="flex flex-wrap gap-3 mt-2">
            {(
              [
                {
                  key: "credit_in",
                  label: "Credit In",
                  roles: [CLIENT_ID],
                },
                {
                  key: "credit_out",
                  label: "Credit Out",
                  roles: [CLIENT_ID],
                },
                {
                  key: "deposit",
                  label: "Deposit",
                  roles: [ADMIN_ID, MASTER_ID, CLIENT_ID, CLIENT_ID],
                },
                {
                  key: "withdraw",
                  label: "Withdraw",
                  roles: [ADMIN_ID, MASTER_ID, CLIENT_ID, CLIENT_ID],
                },
              ] as {
                key: PaymentRequestType;
                label: string;
                roles: string[];
              }[]
            )
              .filter((opt) => opt.roles.includes(defaultUser?.role ?? ""))
              .map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPaymentRequestType(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    paymentRequestType === opt.key
                      ? "bg-[#fcd535] text-black border-[#fcd535]"
                      : "bg-[#1f242a] text-gray-300 border-[#2f363e] hover:bg-[#252b32]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
          </div>

          {/* Amount */}
          <section>
            <Label className="text-[#fcd535] font-semibold">Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Enter amount"
              className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg focus:ring-2 focus:ring-[#fcd535]/50"
            />
          </section>

          {/* User */}
          <section>
            <Label className="text-[#fcd535] font-semibold">Select User</Label>

            {isPrefilledUser ? (
              // ⭐ if opened from row -> show locked value
              <Input
                value={prefilledUserName || prefilledUserId}
                disabled
                className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
              />
            ) : (
              // normal open -> async search
              <AsyncSelect
                inputId="user-select"
                cacheOptions
                loadOptions={loadUserOptions}
                value={user}
                onChange={(opt) => setUser(opt as any)}
                placeholder="Search user..."
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "#1f242a",
                    borderColor: "#2f363e",
                    borderRadius: "0.6rem",
                    minHeight: "44px",
                  }),
                  input: (base) => ({ ...base, color: "#fff" }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "#1f242a",
                    borderRadius: "0.6rem",
                  }),
                  singleValue: (base) => ({ ...base, color: "#fff" }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? "#2f363e" : "#1f242a",
                    color: "#fff",
                  }),
                }}
              />
            )}
          </section>

          {/* Transaction fields */}
          {showTxnFields && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-[#fcd535] font-semibold">
                  Transaction ID
                </Label>
                <Input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter Transaction ID"
                  className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                />
              </div>
              <div>
                <Label className="text-[#fcd535] font-semibold">
                  Upload Screenshot
                </Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                />
              </div>
            </section>
          )}

          {/* Withdraw-only */}
          {showWithdrawFields && (
            <>
              <section>
                <Label className="text-[#fcd535] font-semibold">
                  Payout Mode
                </Label>
                <div className="flex items-center gap-6 text-gray-200 mt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="withdrawalType"
                      value="upi"
                      checked={withdrawalType === "upi"}
                      onChange={() => setWithdrawalType("upi")}
                    />
                    UPI
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="withdrawalType"
                      value="bank"
                      checked={withdrawalType === "bank"}
                      onChange={() => setWithdrawalType("bank")}
                    />
                    Bank Account
                  </label>
                </div>
              </section>

              {withdrawalType === "upi" ? (
                <section>
                  <Label className="text-[#fcd535] font-semibold">UPI ID</Label>
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@bank"
                    className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                  />
                </section>
              ) : (
                <Fragment>
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-[#fcd535] font-semibold">
                        Beneficiary Name
                      </Label>
                      <Input
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        placeholder="Enter beneficiary name"
                        className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-[#fcd535] font-semibold">
                        Bank Name
                      </Label>
                      <Input
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Enter bank name"
                        className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-[#fcd535] font-semibold">
                        IFSC
                      </Label>
                      <Input
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        onBlur={() => checkIFSC(ifsc)}
                        placeholder="Enter IFSC"
                        className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                      />
                      {!isValidIfsc && (
                        <span className="text-red-400 text-xs">
                          IFSC code not valid
                        </span>
                      )}
                      {branch && (
                        <span className="text-xs text-gray-400 ml-2">
                          {branch}
                        </span>
                      )}
                    </div>
                    <div>
                      <Label className="text-[#fcd535] font-semibold">
                        A/C Number
                      </Label>
                      <Input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Enter account number"
                        className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-[#fcd535] font-semibold">
                        Re-Enter A/C Number
                      </Label>
                      <Input
                        value={reEnterAccountNumber}
                        onChange={(e) =>
                          setReEnterAccountNumber(e.target.value)
                        }
                        placeholder="Re-enter account number"
                        className="bg-[#1f242a] border-[#2f363e] text-white rounded-lg"
                      />
                    </div>
                  </section>
                </Fragment>
              )}

              {!depositWithdrawAtsSystem && (
                <section className="flex items-center gap-8">
                  <div className="text-sm text-gray-300">Status *</div>
                  <label className="inline-flex items-center gap-2 text-gray-200">
                    <input
                      type="radio"
                      name="wd-status"
                      value={1}
                      checked={statusForWithdraw === 1}
                      onChange={() => setStatusForWithdraw(1)}
                    />
                    Approved
                  </label>
                  <label className="inline-flex items-center gap-2 text-gray-200">
                    <input
                      type="radio"
                      name="wd-status"
                      value={2}
                      checked={statusForWithdraw === 2}
                      onChange={() => setStatusForWithdraw(2)}
                    />
                    Pending
                  </label>
                  <label className="inline-flex items-center gap-2 text-gray-200">
                    <input
                      type="radio"
                      name="wd-status"
                      value={3}
                      checked={statusForWithdraw === 3}
                      onChange={() => setStatusForWithdraw(3)}
                    />
                    Dis-Approved
                  </label>
                </section>
              )}
            </>
          )}

          {/* Comment */}
          <section>
            <Label className="text-[#fcd535] font-semibold">Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment"
              className="bg-[#1f2430] border-[#2f363e] text-white rounded-lg"
            />
          </section>
        </div>

        <Separator className="my-5 bg-[#2a2f36]" />

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#fcd535] hover:bg-[#ffdc60] text-[#181a20] font-semibold rounded-lg"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="bg-[#1f242a] hover:bg-[#252b32] text-white border border-[#2f363e]"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
