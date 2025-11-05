"use client";

import React, {
  useState,
  useEffect,
  ChangeEvent,
  Fragment,
} from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/lib/axiosInstance";
import { toastSuccess, toastError } from "@/hooks/toastMsg";
import { encryptData, decryptData } from "@/hooks/crypto";
import {
  ADMIN_API_ENDPOINT,
  SUCCESS,
  USER_CHECK_U_DATA,
  USER_SOCIAL_URL_UPDATE,
} from "@/constant/index";

// types
interface UserSocialData {
  facebookUrl?: string;
  twitterUrl?: string;
  whatsappUrl?: string;
  telegramUrl?: string;
  instagramUrl?: string;
  // bio?: string; // if you want to save the CKEditor html later
  [key: string]: any;
}

interface AuthenticatedData {
  userId: string;
  [key: string]: any;
}

export default function Profile() {
  const { data: session } = useSession();

  // we will fill these after mount
  const [authenticated, setAuthenticated] = useState<AuthenticatedData | null>(
    null
  );
  const [jwtToken, setJwtToken] = useState<string | undefined>(undefined);
  const [deviceType, setDeviceType] = useState<string>("web");

  const [formData, setFormData] = useState<UserSocialData>({});
  const [content, setContent] = useState<string>("");

  // CKEditor dynamic refs
  const [CKEditorComp, setCKEditorComp] = useState<any>(null);
  const [ClassicEditorBuild, setClassicEditorBuild] = useState<any>(null);

  // handle input change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // fetch user socials
  const handleGetUserList = async (userId: string, token?: string, dType?: string) => {
    try {
      let data = encryptData({ userId });
      data = JSON.stringify({ data });

      const response = await apiClient.post(
        ADMIN_API_ENDPOINT + USER_CHECK_U_DATA,
        data,
        {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
            deviceType: dType || "web",
          },
        }
      );

      if (response.data.statusCode === SUCCESS) {
        const resData = decryptData(response.data.data) as UserSocialData;
        setFormData({
          facebookUrl: resData.facebookUrl || "",
          twitterUrl: resData.twitterUrl || "",
          whatsappUrl: resData.whatsappUrl || "",
          telegramUrl: resData.telegramUrl || "",
          instagramUrl: resData.instagramUrl || "",
        });
        // if later the API also returns bio, you can do:
        // setContent(resData.bio || "");
      } else {
        console.error("Error:", response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!authenticated?.userId) {
      toastError("User not found");
      return;
    }

    try {
      let data = encryptData({
        userId: authenticated.userId,
        ...formData,
        // bio: content, // if backend expects it
      });
      data = JSON.stringify({ data });

      const response = await apiClient.post(
        ADMIN_API_ENDPOINT + USER_SOCIAL_URL_UPDATE,
        data,
        {
          headers: {
            Authorization: jwtToken,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        }
      );

      if (response.data.statusCode === SUCCESS) {
        toastSuccess(response.data.meta?.message || "Updated successfully");
      } else {
        toastError(response.data.message || "Something went wrong");
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Something went wrong");
    }
  };

  // run once on client: read localStorage, session, and load CKEditor
  useEffect(() => {
    // 1) set title
    document.title = "Admin Panel | Profile";

    // 2) safe window/localStorage access
    if (typeof window !== "undefined") {
      const authRaw = window.localStorage.getItem("authenticated");
      if (authRaw) {
        try {
          const parsed = JSON.parse(authRaw) as AuthenticatedData;
          setAuthenticated(parsed);
        } catch (e) {
          console.warn("Failed to parse authenticated:", e);
        }
      }

      // deviceType from session or fallback
      const sessionDeviceType =
        ((session?.user as any)?.deviceType as string | undefined) ?? "web";
      setDeviceType(sessionDeviceType);
    }

    // 3) jwt from session (this is safe here too)
    setJwtToken((session as any)?.accessToken as string | undefined);

    // 4) dynamically import CKEditor on client only
    const loadEditor = async () => {
      const [{ CKEditor }, ClassicEditor] = await Promise.all([
        import("@ckeditor/ckeditor5-react"),
        import("@ckeditor/ckeditor5-build-classic"),
      ]);
      setCKEditorComp(() => CKEditor);
      setClassicEditorBuild(() => ClassicEditor);
    };
    loadEditor();

    return () => {
      document.title = "Admin Panel";
    };
    // we want this to run on mount + when session loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // when we actually have userId + token, call API
  useEffect(() => {
    if (authenticated?.userId) {
      handleGetUserList(authenticated.userId, jwtToken, deviceType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated?.userId, jwtToken, deviceType]);

  return (
    <Fragment>
      <div className="min-h-screen bg-[#0e0e10] text-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto bg-[#1a1b1e] shadow-xl rounded-2xl border border-gray-800">
          <div className="border-b border-gray-700 px-6 py-4">
            <h2 className="text-2xl font-semibold text-white">
              Profile Settings
            </h2>
            <p className="text-sm text-gray-400">
              Update your social media links and details.
            </p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Facebook URL", name: "facebookUrl" },
              { label: "Twitter URL", name: "twitterUrl" },
              { label: "Telegram URL", name: "telegramUrl" },
              { label: "Whatsapp URL", name: "whatsappUrl" },
              { label: "Instagram URL", name: "instagramUrl" },
            ].map((field) => (
              <div key={field.name} className="flex flex-col">
                <label
                  htmlFor={field.name}
                  className="text-sm font-medium text-gray-300 mb-1"
                >
                  {field.label}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="url"
                  placeholder={`Enter ${field.label}`}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  className="bg-[#2a2b2f] border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}

            <div className="col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-300 mb-1 block">
                Bio / Description
              </label>
              <div className="bg-white text-black rounded-lg overflow-hidden">
                {CKEditorComp && ClassicEditorBuild ? (
                  <CKEditorComp
                    editor={ClassicEditorBuild}
                    data={content}
                    onChange={(_event: any, editor: any) => {
                      const data = editor.getData();
                      setContent(data);
                    }}
                  />
                ) : (
                  <div className="p-4 text-gray-500 text-sm">
                    Loading editor...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 px-6 py-4 text-right">
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
