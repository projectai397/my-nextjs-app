"use client";

import React, { useState, Fragment, useEffect } from "react";
import { Container } from "reactstrap";
import { encryptData, decryptData } from "@/hooks/crypto";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import apiClient from "@/lib/axiosInstance";

import {
  ADMIN_API_ENDPOINT,
  SUCCESS,
  USER_RULES_REGULATION_VIEW,
  USER_RULES_REGULATION_CREATE_EDIT,
} from "@/constant/index";
import { toastSuccess, toastError } from "@/hooks/toastMsg";

/* ======================== Types ======================== */

type Nullable<T> = T | null;

interface Authenticated {
  userId: string;
  [k: string]: unknown;
}

interface RulesViewDecrypted {
  rulesAndRegulations?: string;
}

interface ApiMeta {
  message?: string;
}

interface ApiResponse {
  statusCode: number;
  data?: string;
  message?: string;
  meta?: ApiMeta;
}

/* ======================== Helpers ======================== */

function getLS<T = unknown>(key: string): Nullable<T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ======================== Component ======================== */

const RulesRegulations: React.FC = () => {
  const authenticated = getLS<Authenticated>("authenticated");

  const [content, setContent] = useState<string>("");

  const handleGetUserList = async (): Promise<void> => {
    if (!authenticated?.userId) return;

    try {
      let payload = encryptData({
        userId: authenticated.userId,
      });
      const data = JSON.stringify({ data: payload });

      const response = await apiClient.post(
        `${ADMIN_API_ENDPOINT}${USER_RULES_REGULATION_VIEW}`,
        data
      );

      if (response.data.statusCode === SUCCESS && response.data.data) {
        const resData = decryptData(response.data.data) as RulesViewDecrypted;
        setContent(resData?.rulesAndRegulations ?? "");
      } else {
        // eslint-disable-next-line no-console
        console.error("Fetch error:", response.data.message);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Fetch error:", error);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!authenticated?.userId) return;

    try {
      let payload = encryptData({
        userId: authenticated.userId,
        rulesAndRegulations: content,
      });
      const data = JSON.stringify({ data: payload });

      const response = await apiClient.post(
        `${ADMIN_API_ENDPOINT}${USER_RULES_REGULATION_CREATE_EDIT}`,
        data
      );

      if (response.data.statusCode === SUCCESS) {
        toastSuccess(response.data.meta?.message ?? "Updated successfully");
      } else {
        toastError(response.data.message ?? "Something went wrong");
      }
    } catch (err: unknown) {
      const message =
        (err as any)?.response?.data?.message ??
        (err as Error)?.message ??
        "Request failed";
      toastError(message);
    }
  };

  useEffect(() => {
    void handleGetUserList();
    document.title = "Admin Panel | Rules & Regulations";
    return () => {
      document.title = "Admin Panel";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <div className="min-h-screen bg-[#181a20] text-[#EAECEF]">
        <Container fluid>
          <div className="row">
            <div className="col-sm-12">
              <div className="rounded-xl border border-white/5 bg-[#1e2329] shadow-sm">
                <div className="pt-2 p-4 sm:p-6">
                  <form
                    className="grid grid-cols-1 gap-4"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <div>
                      <label
                        className="mb-2 block font-semibold text-[#fcd535]"
                        htmlFor="rulesEditor"
                      >
                        Rules &amp; Regulations{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="rounded-lg border border-white/10">
                        <CKEditor
                          editor={ClassicEditor as any}
                          // @ts-ignore - passthrough
                          id="rulesEditor"
                          // @ts-ignore - passthrough
                          name="instagramUrl"
                          data={content}
                          onReady={(editor: any) => {
                            // Tailwind-ify the toolbar + editable without custom CSS
                            const editable = editor.ui.getEditableElement?.();
                            const toolbar = editable?.previousElementSibling;

                            if (toolbar) {
                              toolbar.classList.add(
                                "bg-[#1e2329]",
                                "border-b",
                                "border-white/10",
                                "rounded-t-lg"
                              );
                            }
                            if (editable) {
                              editable.classList.add(
                                "bg-[#181a20]",
                                "text-[#EAECEF]",
                                "min-h-[220px]",
                                "outline-none",
                                "rounded-b-lg",
                                "border-0"
                              );
                            }
                          }}
                          onChange={(_event: any, editor: any) => {
                            const data = editor.getData();
                            setContent(data);
                          }}
                        />
                      </div>

                      <p className="mt-2 text-sm text-[#848E9C]">
                        Update the rules as needed. Changes apply immediately
                        after saving.
                      </p>
                    </div>
                  </form>
                </div>

                <div className="flex justify-end gap-2 border-t border-white/10 p-4 sm:p-6">
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    className="inline-flex items-center justify-center rounded-lg bg-[#fcd535] px-4 py-2 font-semibold text-[#181a20] focus:outline-none focus:ring-0 active:opacity-100 hover:bg-[#fcd535]"
                    // hover is neutralized by keeping same color
                  >
                    Submit
                  </button>
                </div>
              </div>

              {/* Optional page help under the card */}
              {/* <div className="mt-4 text-sm text-[#848E9C]">
                Need help? Contact support.
              </div> */}
            </div>
          </div>
        </Container>
      </div>
    </Fragment>
  );
};

export default RulesRegulations;
