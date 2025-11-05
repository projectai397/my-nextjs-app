"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";
import apiClient from "@/lib/axiosInstance";

import Select from "react-select";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
// ---- shadcn/ui ----
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ---- your utils/constants (keep your paths) ----

import {
  ADMIN_API_ENDPOINT,
  USER_SEARCH_LIST,
  ADD_DEPOSIT,
  SYMBOL_LIST,
  SUCCESS,
  CLIENT,
  EXCHANGE_LIST,
  MANUALLY_TRADE_ADDED_FOR,
  MANUALLY_TRADE_SUPER_ADMIN,
  INTRADAY,
  BUY,
  SELL,
} from "@/constant/index";


// import { formatAmount } from "@/hooks/range";
import { encryptData, decryptData, decryptData1 } from '@/hooks/crypto';
import { toast } from "sonner";


// Types
type OptionType = { label: string; value: any; data?: any };

type FormState = {
  userId: any;
  symbolId: any;
  exchangeId: any;
  quantity: number;
  totalQuantity: number;
  price: number;
  referencePrice: number;
  lotSize: number;
  orderType: string;
  tradeType: string;
  productType: string;
  executionDateTime: string;
  isBrokerageCalculatedOrNot: number | string;
  manuallyTradeAddedFor: any;
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  browser: string;
  deviceType: string;
};

export default function ManualTradePage() {
  const deviceTypeLS =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : null;
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authenticated =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : {};

  const [userData, setUserData] = useState<OptionType[]>([]);
  const [exchangeData, setExchangeData] = useState<OptionType[]>([]);
  const [symbolData, setSymbolData] = useState<OptionType[]>([]);
  const [userListData, setUserListData] = useState<any[]>([]); // kept for parity

  const initialFormData: FormState = {
    userId: [] as any,
    symbolId: [] as any,
    exchangeId: [] as any,
    quantity: 0,
    totalQuantity: 0,
    price: 0,
    referencePrice: 0,
    lotSize: 0,
    orderType: "market",
    tradeType: "",
    productType: INTRADAY,
    executionDateTime: "",
    isBrokerageCalculatedOrNot: "" as any,
    manuallyTradeAddedFor: [] as any,
    ipAddress: "",
    deviceId: "",
    userAgent: "",
    browser: "",
    deviceType: "",
  };

  const [formData, setFormData] = useState<FormState>(initialFormData);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<File | null>(null);

  const handleChangeValueOption = (selectedOptions: any, name: keyof FormState) => {
    if (name === "symbolId") {
      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
        lotSize: selectedOptions.data?.lotSize ?? 0,
        totalQuantity: selectedOptions.data?.lotSize ?? 0,
        quantity: 1,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
      }));
    }

    if (name === "exchangeId") {
      let data = encryptData({
        page: 1,
        limit: 1000,
        search: "",
        exchangeId: (selectedOptions as OptionType)?.value,
        sortKey: "name",
        sortBy: 1,
      });
      const payload = JSON.stringify({ data });

      axios
        .post(ADMIN_API_ENDPOINT + SYMBOL_LIST, payload, {
          headers: {
            "Content-Type": "application/json",
            deviceType: deviceTypeLS || "",
            Authorization: jwt_token || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data);
            const rRes: OptionType[] = rdata.map((item: any) => ({
              label: item.symbolName,
              value: item.symbolId,
              data: item,
            }));
            setSymbolData(rRes);
          }
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });
    }
  };

  const handleInputChange = (inputValue: string) => {
    fetchOptions(inputValue);
  };

  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target as { name: keyof FormState; value: any };

    if (name === "totalQuantity") {
      let oty = 0;
      if (formData.lotSize != 0) {
        oty = Number(value) / Number(formData.lotSize);
      }
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value),
        quantity: oty,
      }));
    } else if (name === "quantity") {
      let oty = 0;
      if (formData.lotSize != 0) {
        oty = Number(value) * Number(formData.lotSize);
      }
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value),
        totalQuantity: oty,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "price" ? Number(value) : value,
      }));
    }
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

        axios
          .post(ADMIN_API_ENDPOINT + USER_SEARCH_LIST, payload, {
            headers: {
              Authorization: jwt_token || "",
              "Content-Type": "application/json",
              deviceType: deviceTypeLS || "",
            },
          })
          .then((response) => {
            if (response.data.statusCode == SUCCESS) {
              const rdata = decryptData(response.data.data);
              const rRes: OptionType[] = rdata.map((item: any) => ({
                label: item.userName,
                value: item.userId,
              }));
              setUserData(rRes);
            } else {
              toast.error(response.data.message);
            }
          })
          .catch((error) => {
            toast.error(error?.response?.data?.message || "Error");
            console.error("Login error:", error);
          });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const handleGetExchange = async () => {
    let data = encryptData({
      page: 1,
      limit: 10,
      search: "",
      sortKey: "createdAt",
      sortBy: -1,
    });
    const payload = JSON.stringify({ data });

    axios
      .post(ADMIN_API_ENDPOINT + EXCHANGE_LIST, payload, {
        headers: {
          "Content-Type": "application/json",
          deviceType: deviceTypeLS || "",
          Authorization: jwt_token || "",
        },
      })
      .then((response) => {
        if (response.data.statusCode == SUCCESS) {
          const rdata = decryptData(response.data.data);
          const rRes: OptionType[] = rdata.map((item: any) => ({
            label: item.name,
            value: item.exchangeId,
          }));
          setExchangeData(rRes);
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  };

  const getDeviceInfo = async () => {
    const userAgent = navigator.userAgent;
    let newDeviceType = "desktop";
    let browser = "Unknown";

    if (/Mobi|Android/i.test(userAgent)) newDeviceType = "mobile";

    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    let newDeviceId = localStorage.getItem("deviceId") || "";
    if (!newDeviceId) {
      newDeviceId = uuidv4();
      localStorage.setItem("deviceId", newDeviceId);
    }

    let deviceType = localStorage.getItem("deviceType") || "";
    if (!deviceType) {
      deviceType = newDeviceType;
      localStorage.setItem("deviceType", deviceType);
    }

    let ip = "";
    try {
      const response = await axios.get("https://api.ipify.org?format=json");
      ip = response.data.ip;
      return { deviceType, browser, userAgent, newDeviceId, ip };
    } catch (error) {
      return { deviceType, browser, userAgent, newDeviceId, ip };
    }
  };

  const handleSubmit = async (tradeType: any) => {
    try {
      if (
        !formData.userId?.value ||
        !formData.symbolId?.value ||
        !formData.exchangeId?.value ||
        !formData.price ||
        formData.price == 0 ||
        !formData.totalQuantity ||
        formData.totalQuantity == 0 ||
        !formData.quantity ||
        formData.quantity == 0 ||
        !formData.executionDateTime ||
        !formData.isBrokerageCalculatedOrNot ||
        !formData.manuallyTradeAddedFor
      ) {
        toast.error("Please fill in all fields");
        return;
      }
      if (0 > Number(formData.price)) {
        toast.error("Price Require Greater Then 0");
        return;
      }
      if (0 > Number(formData.quantity)) {
        toast.error("Quantity Require Greater Then 0");
        return;
      }
      if (0 > Number(formData.totalQuantity)) {
        toast.error("Quantity Require Greater Then 0");
        return;
      }

      const { deviceType, browser, userAgent, newDeviceId, ip } =
        await getDeviceInfo();

      let data = encryptData({
        userId: formData.userId.value,
        parentId: authenticated.userId,
        symbolId: formData.symbolId.value,
        quantity: parseFloat(String(formData.quantity)).toFixed(2),
        totalQuantity: parseFloat(String(formData.totalQuantity)).toFixed(2),
        price: parseFloat(String(formData.price)),
        referencePrice: parseFloat(String(formData.price)),
        lotSize: parseFloat(String(formData.lotSize)),
        tradeType: tradeType,
        exchangeId: formData.exchangeId.value,
        orderType: formData.orderType,
        productType: INTRADAY,
        executionDateTime: formData.executionDateTime,
        isBrokerageCalculatedOrNot: formData.isBrokerageCalculatedOrNot,
        manuallyTradeAddedFor: formData.manuallyTradeAddedFor.value,
        ipAddress: ip,
        deviceId: newDeviceId,
        userAgent: userAgent,
        browser: browser,
        deviceType: deviceType,
      });
      const payload = JSON.stringify({ data });

      axios
        .post(ADMIN_API_ENDPOINT + MANUALLY_TRADE_SUPER_ADMIN, payload, {
          headers: {
            Authorization: jwt_token || "",
            "Content-Type": "application/json",
            deviceType: deviceTypeLS || "",
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const resData = decryptData(response.data.data);
            // retain selected exchange/user/time as in your logic
            const preservedExchange = formData.exchangeId;
            const preservedUser = formData.userId;
            const preservedTime = formData.executionDateTime;

            const nextState = { ...initialFormData };
            nextState.exchangeId = preservedExchange as any;
            nextState.userId = preservedUser as any;
            nextState.executionDateTime = preservedTime;
            setFormData(nextState);

            toast.success(response?.data?.meta?.message || "Success");
          } else {
            toast.error(response.data.message);
          }
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || "Error");
        });
    } catch (error) {
      console.log(error);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
  };

  useEffect(() => {
    handleGetExchange();
    document.title = "Admin Panel | Manual Trade";
    return () => {
      document.title = "Admin Panel";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <Card className="border">
          <CardHeader>
            <CardTitle>Manual Trade</CardTitle>
            <CardDescription>
              Fill the below form to create a new Manual Trade.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <form className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* User Name */}
              <div className="md:col-span-2">
                <Label htmlFor="userId">
                  User Name <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  <Select
                    inputId="userId"
                    value={formData.userId as any}
                    onChange={(opt) => handleChangeValueOption(opt, "userId")}
                    options={userData}
                    onInputChange={(v) => handleInputChange(v)}
                    isSearchable
                    placeholder="Type to search..."
                    classNamePrefix="react-select"
                  />
                </div>
              </div>

              {/* Exchange */}
              <div>
                <Label htmlFor="exchangeId">
                  Select Exchange <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  <Select
                    inputId="exchangeId"
                    options={exchangeData}
                    value={formData.exchangeId as any}
                    onChange={(opt) => handleChangeValueOption(opt, "exchangeId")}
                    isLoading={!exchangeData.length}
                    classNamePrefix="react-select"
                  />
                </div>
              </div>

              {/* Symbol */}
              <div>
                <Label htmlFor="symbolId">
                  Select Symbol <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  <Select
                    inputId="symbolId"
                    options={symbolData}
                    value={formData.symbolId as any}
                    onChange={(opt) => handleChangeValueOption(opt, "symbolId")}
                    isLoading={!symbolData.length}
                    classNamePrefix="react-select"
                  />
                </div>
              </div>

              {/* Quantity (totalQuantity) */}
              <div>
                <Label htmlFor="totalQuantity">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="totalQuantity"
                  name="totalQuantity"
                  type="number"
                  min={0}
                  value={formData.totalQuantity}
                  placeholder="Enter Quantity"
                  onChange={handleFormInputChange}
                  className="mt-2"
                />
              </div>

              {/* Lot (quantity) */}
              <div>
                <Label htmlFor="quantity">
                  Lot <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={0}
                  value={formData.quantity}
                  placeholder="Enter Lot"
                  onChange={handleFormInputChange}
                  className="mt-2"
                />
              </div>

              {/* Rate (price) */}
              <div>
                <Label htmlFor="price">
                  Rate <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  value={formData.price}
                  placeholder="Enter Rate"
                  onChange={handleFormInputChange}
                  className="mt-2"
                />
              </div>

              {/* Execution Time */}
              <div>
                <Label htmlFor="executionDateTime">
                  Execution Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="executionDateTime"
                  name="executionDateTime"
                  type="datetime-local"
                  value={formData.executionDateTime}
                  placeholder="Execution Time"
                  onChange={handleFormInputChange}
                  className="mt-2"
                />
              </div>

              {/* Is Brokerage Calculated Or Not */}
              <div className="md:col-span-2">
                <Label>
                  Is Brokerage Calculated Or Not{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2 flex items-center gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input
                      className="h-4 w-4"
                      id="isBrokerageCalculatedOrNotYes"
                      name="isBrokerageCalculatedOrNot"
                      type="radio"
                      value="1"
                      checked={String(formData.isBrokerageCalculatedOrNot) === "1"}
                      onClick={handleFormInputChange}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      className="h-4 w-4"
                      id="isBrokerageCalculatedOrNotNo"
                      name="isBrokerageCalculatedOrNot"
                      type="radio"
                      value="2"
                      checked={String(formData.isBrokerageCalculatedOrNot) === "2"}
                      onClick={handleFormInputChange}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Trade display for */}
              <div className="md:col-span-2">
                <Label htmlFor="manuallyTradeAddedFor">
                  Trade display for <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  {/* Keeping react-select to preserve your value shape */}
                  <Select
                    inputId="manuallyTradeAddedFor"
                    options={MANUALLY_TRADE_ADDED_FOR as any}
                    value={formData.manuallyTradeAddedFor as any}
                    onChange={(opt) =>
                      handleChangeValueOption(opt, "manuallyTradeAddedFor")
                    }
                    classNamePrefix="react-select"
                  />
                </div>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between">
            <div className="flex gap-3">
              <Button onClick={() => handleSubmit(BUY)}>Buy</Button>
              <Button variant="destructive" onClick={() => handleSubmit(SELL)}>
                Sell
              </Button>
            </div>
            <div>
              <Button variant="secondary" onClick={handleReset}>
                Clear
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Fragment>
  );
}

