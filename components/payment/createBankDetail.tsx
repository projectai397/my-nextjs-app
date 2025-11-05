"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import { encryptData, decryptData } from "@/hooks/crypto";

import { toast } from "sonner";
import {
  ADMIN_API_ENDPOINT,
  BANK_DETAILS_CREATE_EDIT,
  BANK_DETAILS_VIEW,
  SUCCESS,
} from "@/constant/index";

/** Types */
type BankForm = {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  status: number;
};

interface CreateBankDetailFormProps {
  /** Required auth/env inputs from your page */
  jwtToken: string;
  deviceType: string;
  authenticatedUserId: string;

  /** Optional edit support */
  bankDetailsId?: string; // <-- pass this to enable EDIT mode

  /** Callbacks */
  onClose: () => void;
  onCreated?: () => void; // refresh list after save (create/edit)
}

/** Tailwind Binance color tokens */
const COLORS = {
  border: "border-[#2b3139]",
  text: "text-[#EAECEF]",
  inputBg: "bg-[#0b0e11]",
  inputText: "text-[#EAECEF]",
  inputPlaceholder: "placeholder-[#848E9C]",
  primaryBtnBg: "bg-[#fcd535]",
  primaryBtnText: "text-[#181a20]",
  lightBtnBg: "bg-[#2b3139]",
  lightBtnText: "text-[#EAECEF]",
};

export default function CreateBankDetailForm({
  jwtToken,
  deviceType,
  authenticatedUserId,
  bankDetailsId, // <-- NEW
  onClose,
  onCreated,
}: CreateBankDetailFormProps) {
  const [formData, setFormData] = useState<BankForm>({
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
    status: 1,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const authHeader =
    jwtToken && jwtToken.startsWith("Bearer ")
      ? jwtToken
      : `Bearer ${jwtToken}`;

  /** EDIT: prefill form if bankDetailsId provided */
  useEffect(() => {
    const fetchDataForEdit = async (id: string) => {
      try {
        setLoading(true);
        const data = JSON.stringify({
          data: encryptData({ bankDetailsId: id }),
        });
        const res = await apiClient.post(BANK_DETAILS_VIEW, data);

        if (res.data.statusCode === SUCCESS) {
          const r = decryptData(res.data.data);
          // Map exactly like your old working code
          setFormData({
            bankName: r.bankName ?? "",
            accountHolderName: r.accountHolderName ?? "",
            accountNumber: r.accountNumber ?? "",
            ifsc: r.ifsc ?? "",
            upiId: r.upiId ?? "",
            status: r.status ?? 1,
          });
        } else {
          toast.error(res.data.message);
        }
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || "Failed to load bank details"
        );
        console.error("Edit prefill error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (bankDetailsId) {
      fetchDataForEdit(bankDetailsId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankDetailsId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let nValue = value;
    if (name === "accountNumber") nValue = nValue.replace(/\D/g, "");
    if (name === "ifsc") nValue = nValue.toUpperCase();
    setFormData((prev) => ({ ...prev, [name]: nValue }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.bankName ||
      !formData.accountHolderName ||
      !formData.accountNumber ||
      !formData.ifsc ||
      !formData.upiId ||
      !formData.status
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      // Build payload exactly like your old code; include bankDetailsId if editing
      const payload: any = {
        userId: authenticatedUserId,
        bankName: formData.bankName,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        ifsc: formData.ifsc,
        upiId: formData.upiId,
        status: formData.status,
      };
      if (bankDetailsId) {
        payload.bankDetailsId = bankDetailsId; // <-- EDIT mode
      }

      const body = JSON.stringify({ data: encryptData(payload) });

      const res = await apiClient.post(BANK_DETAILS_CREATE_EDIT, body);

      if (res.data.statusCode === SUCCESS) {
        decryptData(res.data.data); // keep same logic path
        toast.success(res.data.message);
        onClose?.();
        onCreated?.(); // refresh the table after create/update
      } else {
        toast.error(res.data.message);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Request failed");
      console.error("Save error:", err);
    }
  };

  const handleCancel = () => onClose?.();

  return (
    <div className="w-full p-5">
      {loading ? (
        <div className="py-12 text-center text-sm text-[#848E9C]">Loading…</div>
      ) : (
        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          {/* Bank Name */}
          <div className="flex flex-col">
            <label htmlFor="bankName" className={`mb-1 text-sm ${COLORS.text}`}>
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              id="bankName"
              name="bankName"
              type="text"
              value={formData.bankName}
              placeholder="Enter Bank Name"
              onChange={handleChange}
              className={`w-full rounded-lg border ${COLORS.border} ${COLORS.inputBg} ${COLORS.inputText} ${COLORS.inputPlaceholder} px-3 py-2 outline-none`}
            />
          </div>

          {/* Account Holder */}
          <div className="flex flex-col">
            <label
              htmlFor="accountHolderName"
              className={`mb-1 text-sm ${COLORS.text}`}
            >
              A/C Holder <span className="text-red-500">*</span>
            </label>
            <input
              id="accountHolderName"
              name="accountHolderName"
              type="text"
              value={formData.accountHolderName}
              placeholder="Enter A/C Holder"
              onChange={handleChange}
              className={`w-full rounded-lg border ${COLORS.border} ${COLORS.inputBg} ${COLORS.inputText} ${COLORS.inputPlaceholder} px-3 py-2 outline-none`}
            />
          </div>

          {/* Account Number */}
          <div className="flex flex-col">
            <label
              htmlFor="accountNumber"
              className={`mb-1 text-sm ${COLORS.text}`}
            >
              A/C No
            </label>
            <input
              id="accountNumber"
              name="accountNumber"
              type="text"
              value={formData.accountNumber}
              placeholder="Enter A/C No"
              onChange={handleChange}
              className={`w-full rounded-lg border ${COLORS.border} ${COLORS.inputBg} ${COLORS.inputText} ${COLORS.inputPlaceholder} px-3 py-2 outline-none`}
            />
          </div>

          {/* IFSC */}
          <div className="flex flex-col">
            <label htmlFor="ifsc" className={`mb-1 text-sm ${COLORS.text}`}>
              IFSC <span className="text-red-500">*</span>
            </label>
            <input
              id="ifsc"
              name="ifsc"
              type="text"
              value={formData.ifsc}
              placeholder="Enter IFSC"
              onChange={handleChange}
              className={`w-full rounded-lg border ${COLORS.border} ${COLORS.inputBg} ${COLORS.inputText} ${COLORS.inputPlaceholder} px-3 py-2 outline-none`}
            />
          </div>

          {/* UPI ID */}
          <div className="flex flex-col">
            <label htmlFor="upiId" className={`mb-1 text-sm ${COLORS.text}`}>
              UPI ID <span className="text-red-500">*</span>
            </label>
            <input
              id="upiId"
              name="upiId"
              type="text"
              value={formData.upiId}
              placeholder="Enter UPI ID"
              onChange={handleChange}
              className={`w-full rounded-lg border ${COLORS.border} ${COLORS.inputBg} ${COLORS.inputText} ${COLORS.inputPlaceholder} px-3 py-2 outline-none`}
            />
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <span className={`mb-1 text-sm ${COLORS.text}`}>
              Status <span className="text-red-500">*</span>
            </span>
            <div className="flex items-center gap-6 rounded-lg p-2">
              <label
                className={`inline-flex items-center gap-2 ${COLORS.text}`}
              >
                <input
                  id="status-active"
                  name="status"
                  type="radio"
                  value="1"
                  checked={formData.status === 1}
                  onChange={(e) =>
                    setFormData((s) => ({
                      ...s,
                      status: Number(e.target.value),
                    }))
                  }
                  className="h-4 w-4 accent-[#fcd535]"
                />
                <span>Active</span>
              </label>

              <label
                className={`inline-flex items-center gap-2 ${COLORS.text}`}
              >
                <input
                  id="status-inactive"
                  name="status"
                  type="radio"
                  value="2"
                  checked={formData.status === 2}
                  onChange={(e) =>
                    setFormData((s) => ({
                      ...s,
                      status: Number(e.target.value),
                    }))
                  }
                  className="h-4 w-4 accent-[#fcd535]"
                />
                <span>In-Active</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-1 mt-5 flex justify-center gap-3 md:col-span-2">
            <button
              className={`rounded-lg px-5 py-2 font-semibold ${COLORS.primaryBtnBg} ${COLORS.primaryBtnText} border border-[#fcd535]`}
              type="submit"
            >
              {bankDetailsId ? "Update" : "Submit"}
            </button>
            <button
              className={`rounded-lg px-5 py-2 font-medium ${COLORS.lightBtnBg} ${COLORS.lightBtnText} border ${COLORS.border}`}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
