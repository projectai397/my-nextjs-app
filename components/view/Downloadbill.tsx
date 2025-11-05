"use client";

import apiClient from "@/lib/axiosInstance";

import React, { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // or "next/router" for pages router

import Select from "react-select";
import {
  ADMIN,
  ADMIN_API_ENDPOINT,
  BILL_GENERATE,
  CLIENT,
  MASTER,
  SUCCESS,
  SUPER_ADMIN,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { toast } from "sonner";
// shadcn/ui
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type OptionType = { label: string; value: string };

type DateData = {
  currentWeekStartDate: Date | string;
  currentWeekEndDate: Date | string;
  previousWeekStartDate: Date | string;
  previousWeekEndDate: Date | string;
};

type FormData = {
  userId: OptionType | null;
  time: OptionType | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
};

const restrictedRoles = [ADMIN, SUPER_ADMIN, MASTER];

const DownloadBill: React.FC = () => {
  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authenticated = (typeof window !== "undefined" &&
    JSON.parse(localStorage.getItem("authenticated") || "null")) as {
    role?: string;
  } | null;
  const router = useRouter();

  const [userData, setUserData] = useState<OptionType[]>([]);
  const [dateData, setDateData] = useState<DateData>({
    currentWeekStartDate: "",
    currentWeekEndDate: "",
    previousWeekStartDate: "",
    previousWeekEndDate: "",
  });
  const [dateRangeData, setDateRangeData] = useState<OptionType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const initialFormData: FormData = {
    userId: null,
    time: null,
    startDate: "",
    endDate: "",
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleChangeValueOption = (
    selectedOptions: OptionType | null,
    name: string
  ) => {
    if (name === "time") {
      if (selectedOptions?.value === "currentWeek") {
        setFormData({
          ...formData,
          startDate: dateData.currentWeekStartDate,
          endDate: dateData.currentWeekEndDate,
          time: selectedOptions,
        });
      } else if (selectedOptions?.value === "previousWeek") {
        setFormData({
          ...formData,
          startDate: dateData.previousWeekStartDate,
          endDate: dateData.previousWeekEndDate,
          time: selectedOptions,
        });
      } else {
        setFormData({
          ...formData,
          startDate: "",
          endDate: "",
          time: selectedOptions,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: selectedOptions,
      } as FormData);
    }
  };

  const handleInputChange = (inputValue: string) => {
    fetchOptions(inputValue);
  };

  const handleFormInputChange: React.ChangeEventHandler<HTMLInputElement> = (
    e
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updatedFormData: FormData = { ...prev };

      if (name === "startDate") {
        if (
          updatedFormData.endDate &&
          typeof updatedFormData.endDate === "string" &&
          value > updatedFormData.endDate
        ) {
          updatedFormData.startDate = "";
          toast.error("To Date cannot be earlier than From Date");
        } else {
          updatedFormData.startDate = value;
        }
      }

      if (name === "endDate") {
        if (
          updatedFormData.startDate &&
          typeof updatedFormData.startDate === "string" &&
          value < updatedFormData.startDate
        ) {
          updatedFormData.endDate = "";
          toast.error("From Date cannot be later than To Date");
        } else {
          updatedFormData.endDate = value;
        }
      }

      return updatedFormData;
    });
  };

  const fetchOptions = async (inputValue: string) => {
    if (inputValue && 2 < inputValue.length) {
      try {
        let data = encryptData({
          filterType: 0,
          userId: "",
          status: 0,
          roleId: CLIENT,
          search: inputValue,
          page: 1,
          limit: 50,
        });
        const payload = JSON.stringify({ data });

        apiClient
          .post(ADMIN_API_ENDPOINT + USER_SEARCH_LIST, payload, {
            headers: {
              Authorization: jwt_token,
              "Content-Type": "application/json",
              deviceType: deviceType,
            },
          })
          .then((response) => {
            if (response.data.statusCode === SUCCESS) {
              const rdata = decryptData(response.data.data) as Array<{
                userName: string;
                userId: string;
              }>;
              const rRes: OptionType[] = rdata.map((item) => ({
                label: item.userName,
                value: item.userId,
              }));
              setUserData(rRes);
            } else {
              toast.error(response.data.message);
            }
          })
          .catch((error) => {
            toast.error(error?.response?.data?.message || "Request failed");
            console.error("Login error:", error);
          });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const handleSubmit: React.MouseEventHandler<HTMLButtonElement> = async (
    e
  ) => {
    e.preventDefault();

    if (!formData.userId?.value || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    try {
      let data = encryptData({
        userId: formData.userId.value,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });
      const payload = JSON.stringify({ data });

      apiClient
        .post(ADMIN_API_ENDPOINT + BILL_GENERATE, payload, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
          responseType: "blob",
        })
        .then((response) => {
          if (response.status === SUCCESS) {
            const blob = new Blob([response.data], { type: "application/pdf" });
            const contentDisposition = response.headers["content-disposition"];
            let fileName = "bill.pdf";

            if (contentDisposition) {
              const match = contentDisposition.match(/filename="?([^"]+)"?/);
              if (match && match[1]) {
                fileName = match[1];
              }
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            setFormData(initialFormData);
            toast.success("Bill downloaded successfully.");
          } else {
            toast.error("Something went wrong. Please try again later.");
          }
        })
        .catch((error) => {
          console.log("error: ", error);
        });
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setIsSubmitting(false);
    setLoading(false);
  };

  useEffect(() => {
    if (!restrictedRoles.includes(authenticated?.role || "")) {
      router.push("/admin");
    }

    const today = new Date();
    const currentWeekStartDate = new Date(
      today.setDate(today.getDate() - today.getDay() + 1)
    ); // Monday
    const currentWeekEndDate = new Date(today.setDate(today.getDate() + 6)); // Sunday

    const todayn = new Date();
    const firstDayOfWeek = new Date(
      todayn.setDate(todayn.getDate() - todayn.getDay() + 1)
    ); // Monday
    const previousWeekStart = new Date(
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() - 7)
    ); // previous week
    const previousWeekEnd = new Date(
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() + 6)
    ); // previous week

    const formatDate = (date: Date | string) =>
      new Date(date).toLocaleDateString("en-GB");

    setDateData({
      currentWeekStartDate,
      currentWeekEndDate,
      previousWeekStartDate: previousWeekStart,
      previousWeekEndDate: previousWeekEnd,
    });

    const currentWeekDateRangeOptions: OptionType = {
      value: "currentWeek",
      label: `This week (${formatDate(currentWeekStartDate)} to ${formatDate(
        currentWeekEndDate
      )})`,
    };

    const previousWeekDateRangeOptions: OptionType = {
      value: "previousWeek",
      label: `Previous week (${formatDate(previousWeekStart)} to ${formatDate(
        previousWeekEnd
      )})`,
    };

    const customOptions: OptionType = {
      value: "customPeriod",
      label: "Custom Period",
    };

    setDateRangeData([
      currentWeekDateRangeOptions,
      previousWeekDateRangeOptions,
      customOptions,
    ]);

    document.title = "Admin Panel | Download Bill";
    return () => {
      document.title = "Admin Panel";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default select previous week for MASTER
  useEffect(() => {
    if (
      authenticated?.role === MASTER &&
      dateRangeData.length > 0 &&
      !formData.time
    ) {
      const defaultOption = dateRangeData.find(
        (option) => option.value === "previousWeek"
      );
      if (defaultOption) {
        setFormData((prev) => ({
          ...prev,
          time: defaultOption,
          startDate: dateData.previousWeekStartDate,
          endDate: dateData.previousWeekEndDate,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeData, formData.time]);

  const isCustom = formData.time?.value === "customPeriod";

  return (
    <>
      {/* Main background with Binance theme */}
      <div
        className="min-h-screen flex justify-center items-center"
        style={{ backgroundColor: "#181a20" }}
      >
        {/* Container replacement using Tailwind utility (keeps layout similar) */}
        <div className="container mx-auto px-3">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-3" />
            <div className="col-span-12 md:col-span-6 ">
              {loading ? (
                <div className="flex h-[200px] items-center justify-center">
                  <Loader2
                    className="h-6 w-6 animate-spin text-yellow-400"
                    aria-label="loading"
                  />
                </div>
              ) : (
                <Card
                  className="shadow-sm "
                  style={{ backgroundColor: "#1e2329" }}
                >
                  <CardHeader className="">
                    <CardTitle style={{ color: "#fcd535" }}>
                      Download Bill
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-2">
                    <form className="grid grid-cols-12 gap-8">
                      <div className="col-span-12 md:col-span-12">
                        <Label htmlFor="userId" style={{ color: "#fff" }}>
                          User Name <span className="mb-4">*</span>
                        </Label>
                        <Select
                          inputId="userId"
                          value={formData.userId as any}
                          onChange={(opt) =>
                            handleChangeValueOption(
                              opt as OptionType | null,
                              "userId"
                            )
                          }
                          options={userData}
                          onInputChange={(value) => handleInputChange(value)}
                          isSearchable
                          placeholder="Type to search..."
                          styles={{
                            control: (base) => ({
                              ...base,
                              backgroundColor: "#2B3139",
                              borderColor: "#2B3139",
                              color: "#fff",
                            }),
                            menu: (base) => ({
                              ...base,
                              backgroundColor: "#2B3139",
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isFocused
                                ? "#374151"
                                : "#2B3139",
                              color: "#fff",
                            }),
                            singleValue: (base) => ({
                              ...base,
                              color: "#fff",
                            }),
                            input: (base) => ({
                              ...base,
                              color: "#fff",
                            }),
                          }}
                        />
                      </div>

                      <div className="col-span-12">
                        <Label htmlFor="time" style={{ color: "#fff" }}>
                          Time <span className="mb-2">*</span>
                        </Label>
                        <Select
                          inputId="time"
                          options={dateRangeData}
                          value={formData.time as any}
                          onChange={(opt) =>
                            handleChangeValueOption(
                              opt as OptionType | null,
                              "time"
                            )
                          }
                          styles={{
                            control: (base) => ({
                              ...base,
                              backgroundColor: "#2B3139",
                              borderColor: "#2B3139",
                              color: "#fff",
                            }),
                            menu: (base) => ({
                              ...base,
                              backgroundColor: "#2B3139",
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isFocused
                                ? "#374151"
                                : "#2B3139",
                              color: "#fff",
                            }),
                            singleValue: (base) => ({
                              ...base,
                              color: "#fff",
                            }),
                          }}
                        />
                      </div>

                      {isCustom && (
                        <>
                          <div className="col-span-12 md:col-span-6">
                            <Label
                              htmlFor="startDate"
                              style={{ color: "#848E9C" }}
                            >
                              From Date
                            </Label>
                            <Input
                              id="startDate"
                              name="startDate"
                              type="date"
                              value={
                                typeof formData.startDate === "string"
                                  ? formData.startDate
                                  : formData.startDate
                                  ? new Date(formData.startDate)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
                              onChange={handleFormInputChange}
                              max={new Date().toISOString().split("T")[0]}
                              placeholder="Select Start Date"
                              className="bg-gray-800 text-white border-gray-700"
                            />
                          </div>

                          <div className="col-span-12 md:col-span-6">
                            <Label
                              htmlFor="endDate"
                              style={{ color: "#848E9C" }}
                            >
                              To Date
                            </Label>
                            <Input
                              id="endDate"
                              name="endDate"
                              type="date"
                              value={
                                typeof formData.endDate === "string"
                                  ? formData.endDate
                                  : formData.endDate
                                  ? new Date(formData.endDate)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
                              onChange={handleFormInputChange}
                              min={
                                typeof formData.startDate === "string"
                                  ? formData.startDate || ""
                                  : formData.startDate
                                  ? new Date(formData.startDate)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
                              max={new Date().toISOString().split("T")[0]}
                              placeholder="Select End Date"
                              className="bg-gray-800 text-white border-gray-700"
                            />
                            {formData.endDate &&
                              formData.startDate &&
                              typeof formData.endDate === "string" &&
                              typeof formData.startDate === "string" &&
                              formData.endDate < formData.startDate && (
                                <span className="text-sm text-red-600">
                                  To Date cannot be earlier than From Date
                                </span>
                              )}
                          </div>
                        </>
                      )}
                    </form>
                  </CardContent>

                  <CardFooter className="justify-center space-x-3">
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleReset}
                      className="bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      Clear
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DownloadBill;
