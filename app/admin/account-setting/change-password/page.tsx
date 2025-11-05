"use client";

import React, { useState, useEffect, Fragment, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import apiClient from "@/lib/axiosInstance";
import { encryptData } from "@/hooks/crypto";
import { ADMIN_API_ENDPOINT, SUCCESS, CHANGE_PASSWORD } from "@/constant/index";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const ChangePass: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  // 🔐 adjust these to your actual session shape
  const jwt_token =
    // common custom placements
    (session as any)?.accessToken ||
    (session as any)?.token ||
    (session as any)?.user?.token ||
    "";
  const deviceType =
    (session as any)?.user?.deviceType ||
    (session as any)?.deviceType ||
    "web";

  const [formData, setFormData] = useState<ChangePasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangePassword = async () => {
    try {
      if (
        !formData.currentPassword ||
        !formData.newPassword ||
        !formData.confirmNewPassword
      ) {
        toast.error("Please fill in all fields");
        return;
      }

      if (formData.newPassword.length < 8) {
        toast.error("New Password must be greater than 8 characters.");
        return;
      }

      if (formData.newPassword !== formData.confirmNewPassword) {
        toast.error("New Password and Confirm New Password doesn't match");
        return;
      }

      const data = encryptData({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      const payload = JSON.stringify({ data });

      const response = await apiClient.post(
        ADMIN_API_ENDPOINT + CHANGE_PASSWORD,
        payload,
        {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        }
      );

      if (response.data.statusCode == SUCCESS) {
        toast.success(response.data.meta.message);

        // ✅ instead of clearing localStorage, end session
        await signOut({ callbackUrl: "/" });
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    }
  };

  useEffect(() => {
    document.title = "Change Password";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  return (
    <Fragment>
      <div className="grid gap-6 md:max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                Current Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                placeholder="Enter Current Password"
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                New Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                placeholder="Enter New Password"
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">
                Confirm New Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                value={formData.confirmNewPassword}
                placeholder="Confirm New Password"
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button onClick={handleChangePassword}>Submit</Button>
          </CardFooter>
        </Card>
      </div>
    </Fragment>
  );
};

export default ChangePass;
