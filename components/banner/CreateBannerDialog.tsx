
"use client";

import React, { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

// ---- app imports ----
import { ADMIN_API_ENDPOINT, BANNER_CREATE_EDIT, BANNER_VIEW, SUCCESS } from "@/constant/index";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toastError, toastSuccess } from "@/hooks/toastMsg";

// ---- shadcn/ui ----
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bannerId?: string | null;
  onSuccess?: () => void;
};

type Authenticated = { userId: string; role?: number | string };

type BannerForm = {
  title: string;
  shortDescription: string;
  status: 1 | 2;
};

const initialForm: BannerForm = { title: "", shortDescription: "", status: 1 };

export const CreateBannerDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  bannerId,
  onSuccess,
}) => {
  const deviceType = (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token = (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authenticated: Authenticated =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("authenticated") || "{}")) || ({} as Authenticated);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<BannerForm>(initialForm);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const isEdit = Boolean(bannerId);

  useEffect(() => {
    const load = async () => {
      if (!open || !bannerId) return;
      try {
        const payload = encryptData({ bannerId });
        const body = JSON.stringify({ data: payload });
        const response = await apiClient.post(BANNER_VIEW, body);

        if (response.data.statusCode === SUCCESS) {
          const r = decryptData(response.data.data);
          setForm({
            title: r.title || "",
            shortDescription: r.shortDescription || "",
            status: (r.status as 1 | 2) ?? 1,
          });
        } else toastError(response.data.message);
      } catch (error: any) {
        toastError(error?.response?.data?.message || "Failed to load banner");
        console.error("Banner view error:", error);
      }
    };
    load();
    if (!bannerId) {
      setForm(initialForm);
      setBannerFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, bannerId]);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setBannerFile(null);
      return;
    }
    const valid = ["image/jpeg", "image/jpg", "image/png"];
    if (!valid.includes(f.type)) {
      setBannerFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toastError("Invalid file type. Only JPEG and PNG are allowed.");
      return;
    }
    setBannerFile(f);
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => {
    const { name, value } = e.target;
    if (name === "status") {
      setForm((p) => ({ ...p, status: (Number(value) as 1 | 2) || 1 }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.shortDescription || !form.status) {
      toastError("Please fill in all fields.");
      return;
    }
    if (!isEdit && !bannerFile) {
      toastError("Banner image is required.");
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData();
      if (bannerFile) fd.append("bannerImage", bannerFile);

      let payload: any = {
        userId: authenticated.userId,
        title: form.title,
        shortDescription: form.shortDescription,
        status: form.status,
      };
      if (isEdit && bannerId) payload.bannerId = bannerId;

      fd.append("data", encryptData(payload));

      const response = await apiClient.post(BANNER_CREATE_EDIT, fd, {
        headers: { Authorization: jwt_token, "Content-Type": "multipart/form-data", deviceType },
      });

      if (response.data.statusCode === SUCCESS) {
        toastSuccess(response.data.message);
        setForm(initialForm);
        setBannerFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onSuccess?.();
      } else toastError(response.data.message);
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Save failed");
      console.error("Banner save error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl border-none"
        style={{ backgroundColor: "#1e2329", color: "#fff" }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-[1.2rem] font-semibold"
            style={{ color: "#fcd535" }}
          >
            {isEdit ? "Edit Banner" : "Create Banner"}
            {isEdit && <Badge variant="secondary">Edit</Badge>}
          </DialogTitle>
        </DialogHeader>
        <Separator className="bg-[#181a20]" />
        <div className="grid gap-4 py-2" style={{  borderRadius: "8px", padding: "12px" }}>
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title" style={{ color: "#fcd535" }}>
              Title <span className="text-[#fcd535]">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="Enter title"
              className="bg-[#1e2329] border border-[#2a2f36] text-white focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Short Description */}
          <div className="grid gap-2">
            <Label htmlFor="shortDescription" style={{ color: "#fcd535" }}>
              Short Description <span className="text-[#fcd535]">*</span>
            </Label>
            <Textarea
              id="shortDescription"
              name="shortDescription"
              value={form.shortDescription}
              onChange={onChange}
              placeholder="Enter short description"
              rows={4}
              className="bg-[#1e2329] border border-[#2a2f36] text-white focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Image */}
          <div className="grid gap-2">
            <Label style={{ color: "#fcd535" }}>
              Upload Banner Image {!isEdit && <span className="text-[#fcd535]">*</span>}
            </Label>
            <Input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              className="bg-[#1e2329] border border-[#2a2f36] text-white focus:ring-0 focus:outline-none"
            />
            <p className="text-xs" style={{ color: "#848E9C" }}>
              Banner Size: 1540×500 • Format: JPEG/PNG • Max ~400KB
            </p>
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label style={{ color: "#fcd535" }}>Status</Label>
            <RadioGroup
              value={String(form.status)}
              onValueChange={(val) =>
                setForm((p) => ({ ...p, status: (Number(val) as 1 | 2) || 1 }))
              }
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="1"
                  id="status-1"
                  className="border border-[#2a2f36] text-[#fcd535]"
                />
                <Label htmlFor="status-1" style={{ color: "#848E9C" }}>
                  Active
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="2"
                  id="status-2"
                  className="border border-[#2a2f36] text-[#fcd535]"
                />
                <Label htmlFor="status-2" style={{ color: "#848E9C" }}>
                  In-Active
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="bg-[#1e2329] border border-[#2a2f36] text-[#848E9C] hover:bg-[#1e2329]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#fcd535] text-[#181a20] font-semibold hover:bg-[#fcd535]"
          >
            {loading ? "Saving..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
