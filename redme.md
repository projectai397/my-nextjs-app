"use client";

import React, { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

// ---- shadcn/ui components ----
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// ---- your project imports ----
import { ADMIN_API_ENDPOINT, SUCCESS, CHANGE_PASSWORD } from "@/constant/index";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toastError, toastSuccess } from "@/hooks/toastMsg";

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const ChangePass: React.FC = () => {
  const router = useRouter();

  const authenticated =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "null")
      : null;
  const deviceType =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const [formData, setFormData] = useState<FormData>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  useEffect(() => {
    document.title = "Admin Panel | Change Password";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChangePassword = async () => {
    try {
      const { currentPassword, newPassword, confirmNewPassword } = formData;

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        toastError("Please fill in all fields");
        return;
      }
      if (newPassword.length < 8) {
        toastError("New Password must be greater than 8 characters.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toastError("New Password and Confirm New Password doesn't match");
        return;
      }

      let data = encryptData({
        currentPassword,
        newPassword,
      });
      const payload = JSON.stringify({ data });

      const response = await axios.post(
        ADMIN_API_ENDPOINT + CHANGE_PASSWORD,
        payload,
        {
          headers: {
            Authorization: jwt_token || "",
            "Content-Type": "application/json",
            deviceType: deviceType || "",
          },
        }
      );

      if (response.data.statusCode === SUCCESS) {
        localStorage.removeItem("authenticated");
        localStorage.removeItem("token");
        localStorage.setItem("authenticated", "false");
        toastSuccess(response.data.meta.message);
        router.push("/login");
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Fragment>
      <div className="container mx-auto py-8 px-4 max-w-xl">
        <Card className="shadow-md border border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center">
              Change Password
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-5 mt-5">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                Current Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="Enter Current Password"
                value={formData.currentPassword}
                onChange={handleChange}
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
                placeholder="Enter New Password"
                value={formData.newPassword}
                onChange={handleChange}
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
                placeholder="Confirm New Password"
                value={formData.confirmNewPassword}
                onChange={handleChange}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button onClick={handleChangePassword} className="w-full md:w-auto">
              Submit
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Fragment>
  );
};

export default ChangePass;
