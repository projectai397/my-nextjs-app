"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import ReactSelect from "react-select";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import apiClient from "@/lib/axiosInstance";
import { decryptData, encryptData } from "@/hooks/crypto";
import {
  ADMIN,
  ADMIN_API_ENDPOINT, // (kept if you use elsewhere)
  BROKER,
  CLIENT,
  CREATE_USER,
  EXCHANGE_LIST,
  MASTER,
  ROLE_LIST,
  SUCCESS,
  USER_BROKER_LIST,
  USER_LIST,
  USER_CHILD_LIST,
  SUPER_ADMIN,
  OFFICE,
} from "@/constant/index";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_ID, CLIENT_ID, MASTER_ID } from "@/lib/constants";

type FormFieldType = "text" | "number" | "email" | "password";

interface FormMeta {
  key: FormFieldKey;
  type: FormFieldType;
  placeholder?: string;
}

interface User {
  userId: string;
  userName: string;
  name: string;
  role: string;
  brkSharing: number;
  brkSharingDownLine: number;
}

type FormFieldKey = keyof FormData;

interface Exchange {
  exchangeId: string;
  name: string;
  brokerageType: "symbolwise" | "turnoverwise" | string;
  brokerageSymbolwiseAmount: number;
  brokerageTurnoverwise: number;
  leverage: number;
  newPositionSquareOffTimeLimit: number;
  carryForwardMarginAmount: number;
  exchangeFromData?: ExchangeConfig;
}

interface RoleOption {
  value: string;
  label: string;
}

interface BrokerOption {
  value: string;
  label: string;
}

interface ExchangeConfig {
  exchangeId: string;
  isTurnoverWise: boolean;
  isSymbolWise: boolean;
  brokerageSymbolwiseAmount: number;
  brokerageTurnoverwise: number;
  leverage: number;
  newPositionSquareOffTimeLimit: number;
  carryForwardMarginAmount: number;
  groupId?: string;
}

interface FormData {
  name: string;
  brokerId: string;
  phone: string;
  password: string;
  role: string;
  retype_password: string;
  domain: string;
  mainDomain: string;
  title: string;
  highLowBetweenTradeLimit: string[];
  maxAdmin: number | "";
  profitAndLossSharingDownLine: number;
  profitAndLossSharing: number;
  brkSharingDownLine: number;
  brkSharing: number;
  allowedDevices: number | "";
  freshLimitSL: boolean;
  liquadation: boolean;
  isAllowBrkLevUpdate: number;
  depositWithdrawAtsSystem: number;
  autoSquareOffPercentage: number;
  minimumDeposit: number;
  maximumDeposit: number;
  minimumWithdraw: number;
  maximumWithdraw: number;
  // Admin fields
  cmpOrder: number; // 0/1
  manualOrder: number; // 0/1
  deleteTrade: number; // 0/1
  cancelTrade: number; // 0/1
  executePendingOrder: number; // 0/1
  onlyView: number; // 0/1
  defaultLeverage: number;
  additionalDevices: string;
  // Branding (optional)
  supportEmail?: string;
  brandColor?: string;
  saasModeValue?: string | number;
  brandLogoBase64?: string;

  allowMultiLogin: boolean;
  maxConcurrentDevices: number;
  onLimitPolicy: "block" | "logout_oldest" | "notify_only";
  maxAdmins?: number | "";
  maxMaster?: number | "";
  maxUser?: number | string;
  forwardBalance?: number | "";
  maxBroker?: number | "";
  isB2B: boolean;
  parentId?: string;
  officeUsers: string[];
}

const initialFormData: FormData = {
  name: "",
  brokerId: "",
  phone: "",
  password: "",
  role: "",
  retype_password: "",
  domain: "",
  mainDomain: "",
  title: "",
  saasModeValue: "",
  highLowBetweenTradeLimit: [],
  defaultLeverage: 500,
  profitAndLossSharingDownLine: 0,
  profitAndLossSharing: 100,
  brkSharingDownLine: 0,
  brkSharing: 100,
  freshLimitSL: false,
  liquadation: false,
  isAllowBrkLevUpdate: 0,
  depositWithdrawAtsSystem: 0,
  autoSquareOffPercentage: 0,
  minimumDeposit: 0,
  maximumDeposit: 0,
  minimumWithdraw: 0,
  maximumWithdraw: 0,
  cmpOrder: 1,
  manualOrder: 1,
  deleteTrade: 1,
  cancelTrade: 1,
  executePendingOrder: 1,
  onlyView: 1,
  supportEmail: "",
  brandColor: "#fff",
  brandLogoBase64: "",
  allowedDevices: 1,
  additionalDevices: "",
  allowMultiLogin: true,
  maxConcurrentDevices: 3,
  onLimitPolicy: "logout_oldest",
  forwardBalance: 10000000,
  maxAdmin: -1,
  maxMaster: -1,
  maxUser: -1,
  maxBroker: -1,
  isB2B: false,
  parentId: "",
  officeUsers: [],
};

interface CreateUserFormProps {
  groups: Array<{ id: string; name: string; exchangeId: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateUserForm({
  groups,
  isOpen,
  onClose,
  onSuccess,
}: CreateUserFormProps) {
  const { data: session } = useSession();
  const notifySuccess = (msg: string) => toast.success(msg);
  const notifyError = (msg: string) =>
    toast.error(msg || "Something went wrong");
  const sessionRole = (session?.user as any)?.role ?? "";

  const canSeeUserSearch = () => {
    const allowedRoles = [ADMIN, SUPER_ADMIN].includes(sessionRole);
    if (!allowedRoles) return false;
    if(sessionRole === ADMIN) {

    }
  };
  const deviceType =
    typeof window !== "undefined"
      ? localStorage.getItem("deviceType") || "desktop"
      : "desktop";
  const authenticated: Partial<User> =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("authenticated") || "{}")
      : {};

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [roleFormData, setRoleFormData] = useState<RoleOption | null>(null);
  const [canSee, setCanSee] = useState<boolean>(false);
  const [exchangeFromData, setExchangeFromData] = useState<ExchangeConfig[]>(
    []
  );

  const [brokersLoading, setBrokersLoading] = useState(false);
  const [roleData, setRoleData] = useState<RoleOption[]>([]);
  const [brokerData, setBrokerData] = useState<BrokerOption[]>([]);
  const [brokerFormData, setBrokerFormData] = useState<BrokerOption | null>(
    null
  );
  const [selectedOfficeUsers, setSelectedOfficeUsers] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const [userOptions, setUserOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUserOption, setSelectedUserOption] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const [isPLSharing, setIsPLSharing] = useState(true);
  const [exchangeGroupData, setExchangeGroupData] = useState<Exchange[]>([]);
  const [checkAllCheckBox, setCheckAllCheckBox] = useState(false);
  const [togglePassword, setTogglePassword] = useState(false);
  const [ctogglePassword, setCTogglePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isB2B, setIsB2B] = useState<boolean>(false);
  const allowedExchanges =
    (session?.user as any)?.exchangeAllow?.map((e: any) => e.exchangeId) ?? [];

  const handleSearchUser = async (inputValue: string) => {
    const search = inputValue.trim();
    if (!search) {
      setUserOptions([]);
      return;
    }

    try {
      setUserLoading(true);

      // figure out who is logged in
      const authenticatedRoleId = (authenticated as any)?.role || "";

      // build the same payload shape you showed
      const payload = {
        role: authenticatedRoleId || "",
        search, // 👈 what user typed in the select
        roleId:
          authenticatedRoleId === SUPER_ADMIN
            ? MASTER
            : authenticatedRoleId === MASTER
            ? CLIENT
            : "",
        startDate: "",
        endDate: "",
        page: 1,
        limit: 50,
      };

      // pick endpoint like in your code
      const apiUrl =
        authenticatedRoleId === MASTER ? USER_LIST : USER_CHILD_LIST;

      const resp = await apiClient.post(
        ADMIN_API_ENDPOINT + apiUrl,
        JSON.stringify({ data: encryptData(payload) })
      );

      if (resp.data.statusCode === SUCCESS) {
        const rdata = decryptData(resp.data.data) as any[];
        const list = Array.isArray(rdata) ? rdata : [];

        // map to react-select format
        const mapped = list.map((u) => ({
          // your backend sends userId / _id — keep both
          value: u.userId || u._id,
          // 👇 prefer phone (you said this API gives phone)
          label:
            u.phone ||
            u.userName ||
            u.name ||
            (u.userId ? `User ${u.userId}` : "Unknown"),
        }));

        setUserOptions(mapped);
      } else {
        setUserOptions([]);
      }
    } catch (err) {
      console.error("user search error", err);
      setUserOptions([]);
    } finally {
      setUserLoading(false);
    }
  };

  // --- Helpers ---------------------------------------------------------------
  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const digitsOnly = (s: string) => s.replace(/\D+/g, "");
  const stripLeadingZeros = (s: string) => s.replace(/^0+(?=\d)/, "");

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        return notifyError("Please upload an image file (PNG/JPG/WebP).");
      }
      const maxMB = 2;
      if (file.size > maxMB * 1024 * 1024) {
        return notifyError(`Logo too large. Max ${maxMB}MB allowed.`);
      }
      const dataUrl = await fileToBase64(file);
      setFormData((prev) => ({ ...prev, brandLogoBase64: dataUrl }));
      setLogoPreview(dataUrl);
      toast.info("Logo added.");
    } catch {
      notifyError("Failed to read logo file.");
    }
  };

  const clearLogo = () => {
    setFormData((prev) => ({ ...prev, brandLogoBase64: "" }));
    setLogoPreview("");
    toast.info("Logo removed.");
  };

  // --- Exchange selection (single + select-all) -----------------------------
  const handleToChangeExchangeCheckBox = (exId: string, datae: Exchange) => {
    const isSymbolWise = datae.brokerageType === "symbolwise";
    const isTurnoverWise = !isSymbolWise;

    setExchangeFromData((prev) => {
      const idx = prev.findIndex((p) => p.exchangeId === exId);
      if (idx > -1) {
        // uncheck → remove
        const updatedExGroup = exchangeGroupData.map((item) =>
          item.exchangeId === exId
            ? { ...item, exchangeFromData: undefined }
            : item
        );
        setExchangeGroupData(updatedExGroup);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }

      // check → add default config
      const updatedExGroup = exchangeGroupData.map((item) =>
        item.exchangeId === exId
          ? {
              ...item,
              exchangeFromData: {
                exchangeId: exId,
                isTurnoverWise,
                isSymbolWise,
                brokerageSymbolwiseAmount: Number(
                  datae.brokerageSymbolwiseAmount || 0
                ),
                brokerageTurnoverwise: Number(datae.brokerageTurnoverwise || 0),
                leverage: Number(datae.leverage || 500),
                newPositionSquareOffTimeLimit: Number(
                  datae.newPositionSquareOffTimeLimit || 0
                ),
                carryForwardMarginAmount: Number(
                  datae.carryForwardMarginAmount || 0
                ),
              },
            }
          : item
      );
      setExchangeGroupData(updatedExGroup);

      return [
        ...prev,
        {
          exchangeId: exId,
          isTurnoverWise,
          isSymbolWise,
          brokerageSymbolwiseAmount: Number(
            datae.brokerageSymbolwiseAmount || 0
          ),
          brokerageTurnoverwise: Number(datae.brokerageTurnoverwise || 0),
          leverage: Number(datae.leverage || 500),
          newPositionSquareOffTimeLimit: Number(
            datae.newPositionSquareOffTimeLimit || 0
          ),
          carryForwardMarginAmount: Number(datae.carryForwardMarginAmount || 0),
        },
      ];
    });
  };

  const handleChangeExAllCheckBox = () => {
    const checked = !checkAllCheckBox;
    setCheckAllCheckBox(checked);
    if (checked) {
      const updatedArray = exchangeGroupData.map((item) => {
        const isSymbolWise = item.brokerageType === "symbolwise";
        const isTurnoverWise = !isSymbolWise;
        return {
          ...item,
          exchangeFromData: {
            exchangeId: item.exchangeId,
            isTurnoverWise,
            isSymbolWise,
            brokerageSymbolwiseAmount: Number(
              item.brokerageSymbolwiseAmount || 0
            ),
            brokerageTurnoverwise: Number(item.brokerageTurnoverwise || 0),
            leverage: Number(item.leverage || 500),
            newPositionSquareOffTimeLimit: Number(
              item.newPositionSquareOffTimeLimit || 0
            ),
            carryForwardMarginAmount: Number(
              item.carryForwardMarginAmount || 0
            ),
          },
        };
      });

      const formatted = updatedArray
        .map((i) => i.exchangeFromData)
        .filter(Boolean) as ExchangeConfig[];

      setExchangeGroupData(updatedArray);
      setExchangeFromData(formatted);
    } else {
      const updatedArray = exchangeGroupData.map((item) => ({
        ...item,
        exchangeFromData: undefined,
      }));
      setExchangeGroupData(updatedArray);
      setExchangeFromData([]);
      setFormData((p) => ({ ...p, highLowBetweenTradeLimit: [] }));
    }
  };

  const handleChangeBrkValueOption = (
    keyname: "isTurnoverWise" | "isSymbolWise",
    datae: Exchange
  ) => {
    const exId = datae.exchangeId;
    if (!exchangeFromData.length) return;

    setExchangeFromData((prev) => {
      const idx = prev.findIndex((p) => p.exchangeId === exId);
      if (idx === -1) return prev;

      const isSymbolWise = keyname === "isSymbolWise";
      const isTurnoverWise = !isSymbolWise;

      const updatedExGroup = exchangeGroupData.map((item) =>
        item.exchangeId === exId
          ? {
              ...item,
              exchangeFromData: {
                ...(item.exchangeFromData as ExchangeConfig),
                isSymbolWise,
                isTurnoverWise,
              },
            }
          : item
      );
      setExchangeGroupData(updatedExGroup);

      const updated = { ...prev[idx], isSymbolWise, isTurnoverWise };
      return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
    });
  };

  const handleChangeBLCFValue = (
    e: React.ChangeEvent<HTMLInputElement>,
    keyname:
      | "brokerageTurnoverwise"
      | "brokerageSymbolwiseAmount"
      | "leverage"
      | "newPositionSquareOffTimeLimit"
      | "carryForwardMarginAmount",
    datae: Exchange
  ) => {
    let raw = e.target.value;

    // ✅ 1️⃣ Allow only digits, one dot, and empty
    if (!/^\d*\.?\d*$/.test(raw)) return;

    // ✅ 2️⃣ Convert to number safely
    const num = raw === "" ? "" : parseFloat(raw);
    const exId = datae.exchangeId;

    setExchangeFromData((prev) => {
      const idx = prev.findIndex((p) => p.exchangeId === exId);

      // Not selected yet → create it
      if (idx === -1) {
        const isSymbolWise = datae.brokerageType === "symbolwise";
        const isTurnoverWise = !isSymbolWise;

        const newConfig: ExchangeConfig = {
          exchangeId: exId,
          isTurnoverWise,
          isSymbolWise,
          brokerageSymbolwiseAmount: Number(
            datae.brokerageSymbolwiseAmount || 0
          ),
          brokerageTurnoverwise: Number(datae.brokerageTurnoverwise || 0),
          leverage: Number(datae.leverage || 500),
          newPositionSquareOffTimeLimit: Number(
            datae.newPositionSquareOffTimeLimit || 0
          ),
          carryForwardMarginAmount: Number(datae.carryForwardMarginAmount || 0),
        };

        (newConfig as any)[keyname] = num === "" ? 0 : num;

        setExchangeGroupData((prevEx) =>
          prevEx.map((item) =>
            item.exchangeId === exId
              ? { ...item, exchangeFromData: newConfig }
              : item
          )
        );

        return [...prev, newConfig];
      }

      // Already exists → just update
      const updated = {
        ...prev[idx],
        [keyname]: num === "" ? 0 : num,
      } as ExchangeConfig;

      setExchangeGroupData((prevEx) =>
        prevEx.map((item) =>
          item.exchangeId === exId
            ? {
                ...item,
                exchangeFromData: {
                  ...(item.exchangeFromData as ExchangeConfig),
                  [keyname]: num === "" ? 0 : num,
                },
              }
            : item
        )
      );

      return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
    });
  };

  const handleChangeGroupSelect = (
    groupId: string | undefined,
    exchangeId: string
  ) => {
    setExchangeFromData((prev) => {
      const idx = prev.findIndex((p) => p.exchangeId === exchangeId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], groupId };
      return updated;
    });

    setExchangeGroupData((prev) =>
      prev.map((item) =>
        item.exchangeId === exchangeId
          ? {
              ...item,
              exchangeFromData: {
                ...(((item.exchangeFromData as ExchangeConfig) ||
                  {}) as ExchangeConfig),
                groupId,
              } as ExchangeConfig,
            }
          : item
      )
    );
  };

  // --- Sharing fields --------------------------------------------------------
  const handleProfitAndLossChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const v = value === "" ? 0 : Number(value);
    setFormData((prev) => ({
      ...prev,
      [name]: v,
      profitAndLossSharingDownLine: 100 - v,
    }));
  };

  const handleBrkSharingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const v = value === "" ? 0 : Number(value);
    if (authenticated?.role === MASTER) {
      if ((authenticated?.brkSharingDownLine ?? 0) >= v) {
        setFormData((prev) => ({
          ...prev,
          [name]: v,
          brkSharingDownLine: (authenticated?.brkSharingDownLine ?? 0) - v,
        }));
      } else {
        notifyError("Brokerage exceeds your available downline share.");
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: v,
        brkSharingDownLine: 100 - v,
      }));
    }
  };

  // --- Fetchers --------------------------------------------------------------
  const handleGetRole = async () => {
    try {
      const response = await apiClient.post(ROLE_LIST, []);
      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data);
        const formattedOptions = rdata.map((item: any) => ({
          value: item.roleId,
          label: item.name,
        }));
        setRoleData(formattedOptions);
      } else {
        notifyError(response.data?.message || "Failed to load roles.");
      }
    } catch (error: any) {
      notifyError(error.response?.data?.message || "Failed to load roles.");
      console.error("Error fetching role data:", error);
    }
  };

  const handleGetExchangeGroup = async () => {
    try {
      const data = encryptData({
        page: 1,
        limit: 10,
        search: "",
        sortKey: "createdAt",
        sortBy: -1,
      });
      const response = await apiClient.post(
        EXCHANGE_LIST,
        JSON.stringify({ data })
      );

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data);
        setExchangeGroupData(rdata);
      } else {
        notifyError(response.data?.message || "Failed to load exchanges.");
      }
    } catch (error: any) {
      notifyError(error.response?.data?.message || "Failed to load exchanges.");
      console.error("Error fetching exchange data:", error);
    }
  };

  const handleChangeValueOption = (selected: RoleOption | null) => {
    setRoleFormData(selected);
    const reset = { ...initialFormData, role: selected?.value || "" };
    setFormData(reset);
    setExchangeFromData([]);
    setCheckAllCheckBox(false);

    if (selected?.value === CLIENT) {
      setBrokersLoading(true);
      const formdat = { userId: (authenticated as User)?.userId };
      const formDataParam = encryptData(formdat);
      apiClient
        .post(USER_BROKER_LIST, JSON.stringify({ data: formDataParam }))
        .then((response) => {
          if (response.data.statusCode === SUCCESS) {
            const rdata = decryptData(response.data.data);
            const formattedOptions = rdata.map((item: any) => ({
              value: item.userId,
              label: item.userName,
            }));
            setBrokerData(formattedOptions);
          } else {
            notifyError(response.data?.message || "Failed to load brokers.");
          }
        })
        .catch((error) => {
          notifyError(
            error.response?.data?.message || "Failed to load brokers."
          );
          console.error("Error fetching broker data:", error);
        })
        .finally(() => setBrokersLoading(false));
    }
  };

  const handleChangeBrokerValueOption = (selected: BrokerOption | null) => {
    setBrokerFormData(selected);
    setFormData((prev) => ({ ...prev, brokerId: selected?.value || "" }));
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setRoleFormData(null);
    setBrokerFormData(null);
    setExchangeFromData([]);
    setCheckAllCheckBox(false);
    setLogoPreview("");
    setSelectedOfficeUsers([]);
  };

  const getDeviceInfo = async () => {
    const userAgent = navigator.userAgent;
    const calculatedDeviceType = /Mobi|Android/i.test(userAgent)
      ? "mobile"
      : "desktop";

    let browser = "Unknown";
    if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari")) browser = "Safari";
    else if (userAgent.includes("Edge")) browser = "Edge";

    let newDeviceId = localStorage.getItem("deviceId");
    if (!newDeviceId) {
      newDeviceId = uuidv4();
      localStorage.setItem("deviceId", newDeviceId);
    }

    let storedDeviceType = localStorage.getItem("deviceType");
    if (!storedDeviceType) {
      storedDeviceType = calculatedDeviceType;
      localStorage.setItem("deviceType", storedDeviceType);
    }

    let ip = "";
    try {
      const response = await axios.get("https://api.ipify.org?format=json");
      ip = response.data.ip;
    } catch (error) {
      console.error("Error getting IP address:", error);
    }

    return {
      deviceType: storedDeviceType,
      browser,
      userAgent,
      newDeviceId,
      ip,
    };
  };

  // --- Submit ---------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (
      !formData.name ||
      !formData.role ||
      !formData.phone ||
      !formData.password ||
      !formData.retype_password ||
      Number(formData.allowedDevices) <= 0
    ) {
      setLoading(false);
      return notifyError("Please fill in all required fields.");
    }

    if (formData.password.length < 8) {
      setLoading(false);
      return notifyError("Password must be at least 8 characters.");
    }

    if (formData.password !== formData.retype_password) {
      setLoading(false);
      return notifyError("Password and Retype Password don't match.");
    }

    // Role-specific checks
    if (formData.role === MASTER) {
      const invalid =
        Number(formData.defaultLeverage) <= 0 ||
        Number(formData.allowedDevices) < 1;

      if (invalid) {
        setLoading(false);
        return notifyError("Please fill in all required Master fields.");
      }

      if (
        Number(formData.brkSharing) < 0 ||
        Number(formData.brkSharing) > 100
      ) {
        setLoading(false);
        return notifyError("Brokerage Sharing must be 0–100%.");
      }

      if (isPLSharing) {
        if (
          Number(formData.profitAndLossSharing) < 0 ||
          Number(formData.profitAndLossSharing) > 100
        ) {
          setLoading(false);
          return notifyError("P/L Sharing must be 0–100%.");
        }
      } else {
        if (!formData.saasModeValue || Number(formData.saasModeValue) <= 0) {
          setLoading(false);
          return notifyError("Enter a SaaS value > 0.");
        }
      }
    }

    if (formData.role === OFFICE) {
      const maxDown = (authenticated as User)?.brkSharingDownLine ?? 0;
      if (parseFloat(formData.brkSharingDownLine.toString()) > maxDown) {
        setLoading(false);
        return notifyError(`Brk. Sharing DownLine must be ≤ ${maxDown}%.`);
      }
    }

    if (formData.role === ADMIN) {
      const flags = [
        formData.cmpOrder,
        formData.manualOrder,
        formData.deleteTrade,
        formData.cancelTrade,
        formData.executePendingOrder,
        formData.onlyView,
      ].every((v) => v === 0 || v === 1);
      if (!flags) {
        setLoading(false);
        return notifyError("Please fill in all admin permission fields.");
      }
    }

    try {
      const { deviceType, browser, userAgent, newDeviceId, ip } =
        await getDeviceInfo();

      const formdat: any = {
        role: formData.role,
        userName: formData.phone,
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        allowedDevices: Number(formData.allowedDevices || 0),
        loginBy: "Web",
        browser,
        userAgent,
        deviceId: newDeviceId,
        deviceType,
        ipAddress: ip,
      };

      if (formData.role === CLIENT) {
        const creatorRole = (authenticated as any)?.role || "";

        if (
          creatorRole === SUPER_ADMIN &&
          !formData.parentId &&
          !formData.brokerId
        ) {
          setLoading(false);
          return notifyError("Please assign this client to a user/office.");
        }

        if (formData.parentId) {
          formdat.parentId = formData.parentId; // who owns this client
        }
        if (formData.brokerId) {
          formdat.brokerId = formData.brokerId; // office/broker if needed
        }

        formdat.isB2B = isB2B;
        if (!isB2B) {
          formdat.minimumDeposit = formData.minimumDeposit;
          formdat.maximumDeposit = formData.maximumDeposit;
          formdat.minimumWithdraw = formData.minimumWithdraw;
          formdat.maximumWithdraw = formData.maximumWithdraw;
        }

        // exchanges selected in the table
        formdat.exchangeAllow = exchangeFromData;
      }

      if (formData.role === ADMIN) {
        formdat.cmpOrder = formData.cmpOrder;
        formdat.manualOrder = formData.manualOrder;
        formdat.forwardBalance = formData.forwardBalance;
        formdat.deleteTrade = formData.deleteTrade;
        formdat.cancelTrade = formData.cancelTrade;
        formdat.executePendingOrder = formData.executePendingOrder;
        formdat.onlyView = formData.onlyView;
        formdat.exchangeAllow = exchangeFromData;
        formdat.officeUsers = formData.officeUsers || [];
      }
      if (authenticated.role != MASTER) {
        formdat.parentId = formData.parentId;
      }
      if (formData.role === MASTER) {
        formdat.maxUser = Number(formData.maxUser || 0);
        formdat.defaultLeverage = Number(formData.defaultLeverage || 0);
        formdat.allowedDevices = Number(formData.allowedDevices || 0);
        formdat.forwardBalance = formData.forwardBalance;
        formdat.brkSharing = Number(formData.brkSharing || 0);
        formdat.brkSharingDownLine = 100 - formdat.brkSharing;
        // Static branding/domain defaults
        formdat.domain = "Domain";
        formdat.mainDomain = "mainDomain";
        formdat.title = formData.name || "Demo-Master";
        formdat.isB2B = isB2B;

        formdat.mode = isPLSharing ? "pl" : "saas";
        if (isPLSharing) {
          formdat.profitAndLossSharing = Number(
            formData.profitAndLossSharing || 0
          );
          formdat.profitAndLossSharingDownLine =
            100 - formdat.profitAndLossSharing;
        } else {
          formdat.saasModeValue = Number(formData.saasModeValue || 0);
        }

        formdat.highLowBetweenTradeLimit = formData.highLowBetweenTradeLimit;
        formdat.exchangeAllow = exchangeFromData;

        formdat.depositWithdrawAtsSystem = Number(
          formData.depositWithdrawAtsSystem || 0
        );
        formdat.minimumDeposit = formData.minimumDeposit;
        formdat.maximumDeposit = formData.maximumDeposit;
        formdat.minimumWithdraw = formData.minimumWithdraw;
        formdat.maximumWithdraw = formData.maximumWithdraw;

        formdat.officeUsers = formData.officeUsers || [];
      }

      if (formData.role === OFFICE) {
        formdat.brkSharing = formData.brkSharing;
        formdat.brkSharingDownLine = formData.brkSharingDownLine;
        formdat.profitAndLossSharing =
          (authenticated as User)?.brkSharingDownLine ?? 0;
        formdat.profitAndLossSharingDownLine = 0;

        // 👇 add this line
        formdat.officeUsers = formData.officeUsers || [];
      }

      const payload = encryptData(formdat);
      const response = await apiClient.post(
        CREATE_USER,
        JSON.stringify({ data: payload })
      );

      if (response.data.statusCode === SUCCESS) {
        handleReset();
        notifySuccess(response.data.message || "User created successfully.");
        onSuccess?.();
        onClose();
      } else {
        notifyError(response.data.message || "Failed to create user.");
      }
    } catch (error: any) {
      notifyError(
        error.response?.data?.message || "Network error while creating user."
      );
      console.error("Create user error:", error);
    } finally {
      setLoading(false);
    }
  };
  // --- Effects ---------------------------------------------------------------
  useEffect(() => {
    handleGetExchangeGroup();
  }, []);
  useEffect(() => {
    setCanSee(canSeeUserSearch(formData.role));
  }, []);
  useEffect(() => {
    handleGetRole();
  }, []);

  if (!isOpen) return null;

  const handleToggleChange = (e: any) =>
    setIsPLSharing(e.target.value === "plSharing");

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[80vw] max-h-[90vh] overflow-y-auto rounded-lg p-4"
        style={{ backgroundColor: "#1e2329" }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" style={{ color: "#fff" }}>
                Select User Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={roleFormData}
                onChange={handleChangeValueOption}
                options={roleData}
                isSearchable={false}
                isLoading={!roleData.length}
                placeholder="Select User Type"
                className="w-full"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "#2a2f36",
                    borderColor: "#fff",
                    borderWidth: "1px",
                    color: "#ffffff",
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "#2a2f36",
                    color: "#ffffff",
                  }),
                  option: (base, { isFocused }) => ({
                    ...base,
                    backgroundColor: isFocused ? "#3a3f46" : "#2a2f36",
                    color: "#ffffff",
                  }),
                  singleValue: (base) => ({ ...base, color: "#ffffff" }),
                }}
              />
            </div>
            {canSeeUserSearch(formData.role) && (
                <div className="space-y-2">
                  <Label htmlFor="parentId" style={{ color: "#fff" }}>
                    Assign / Select User
                  </Label>
                  <ReactSelect
                    inputId="parentId"
                    value={selectedUserOption}
                    onInputChange={(val) => {
                      // trigger search when typing
                      handleSearchUser(val);
                      return val;
                    }}
                    onChange={(opt) => {
                      setSelectedUserOption(opt as any);
                      setFormData((prev) => ({
                        ...prev,
                        parentId: (opt as any)?.value || "",
                      }));
                    }}
                    options={userOptions}
                    isLoading={userLoading}
                    placeholder="Search user..."
                    isClearable
                    filterOption={() => true}
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        borderWidth: "1px",
                        color: "#ffffff",
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: "#2a2f36",
                        color: "#ffffff",
                      }),
                      option: (base, { isFocused }) => ({
                        ...base,
                        backgroundColor: isFocused ? "#3a3f46" : "#2a2f36",
                        color: "#ffffff",
                      }),
                      singleValue: (base) => ({ ...base, color: "#ffffff" }),
                      input: (base) => ({ ...base, color: "#ffffff" }),
                      placeholder: (base) => ({ ...base, color: "#848E9C" }),
                    }}
                  />
                </div>
              )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" style={{ color: "#fff" }}>
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                placeholder="Enter Name"
                onChange={handleChange}
                className="bg-gray-800 border-yellow-500 text-white"
                style={{
                  backgroundColor: "#2a2f36",
                  borderColor: "#fff",
                  color: "#ffffff",
                }}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" style={{ color: "#fff" }}>
                Mobile Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                placeholder="Enter Mobile Number"
                onChange={(e) => {
                  const cleaned = stripLeadingZeros(
                    digitsOnly(e.target.value)
                  ).slice(0, 10);
                  setFormData((p) => ({ ...p, phone: cleaned }));
                }}
                maxLength={10}
                className="bg-gray-800 border-yellow-500 text-white"
                style={{
                  backgroundColor: "#2a2f36",
                  borderColor: "#fff",
                  color: "#ffffff",
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: "#fff" }}>
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={togglePassword ? "text" : "password"}
                  value={formData.password}
                  placeholder="Enter Password"
                  onChange={handleChange}
                  className="bg-gray-800 border-yellow-500 text-white pr-16"
                  style={{
                    backgroundColor: "#2a2f36",
                    borderColor: "#fff",
                    color: "#ffffff",
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-full px-3 py-2 bg-gray-700 border-l border-yellow-500 text-white"
                  style={{
                    backgroundColor: "#2a2f36",
                    borderColor: "#fff",
                    color: "#ffffff",
                  }}
                  onClick={() => setTogglePassword((s) => !s)}
                >
                  {togglePassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            {/* Retype Password */}
            <div className="space-y-2">
              <Label htmlFor="retype_password" style={{ color: "#fff" }}>
                Retype Password <span className="text-red-500">*</span>
              </Label>
              <span className="relative">
                <Input
                  id="retype_password"
                  name="retype_password"
                  type={ctogglePassword ? "text" : "password"}
                  value={formData.retype_password}
                  placeholder="Enter Retype Password"
                  onChange={handleChange}
                  className="bg-gray-800 border-yellow-500 text-white"
                  style={{
                    backgroundColor: "#2a2f36",
                    borderColor: "#fff",
                    color: "#ffffff",
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-full px-3 py-2 bg-gray-700 border-l border-yellow-500 text-white"
                  style={{
                    backgroundColor: "#2a2f36",
                    borderColor: "#fff",
                    color: "#ffffff",
                  }}
                  onClick={() => setCTogglePassword((s) => !s)}
                >
                  {ctogglePassword ? "Hide" : "Show"}
                </Button>
              </span>
            </div>

            {/* Allowed Devices */}
            <div className="space-y-2">
              <Label htmlFor="allowedDevices" className="text-[#fff]">
                Allowed Devices For Login{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="allowedDevices"
                name="allowedDevices"
                type="number"
                min={1}
                value={formData.allowedDevices}
                placeholder="Enter Allowed Devices For Login"
                onChange={(e) => {
                  const cleaned = stripLeadingZeros(e.target.value);
                  setFormData((p) => ({
                    ...p,
                    allowedDevices: cleaned === "" ? "" : Number(cleaned),
                  }));
                }}
                className="bg-gray-800 border-yellow-500 text-white"
                style={{
                  backgroundColor: "#2a2f36",
                  borderColor: "#fff",
                  color: "#ffffff",
                }}
              />
            </div>

            {/* CLIENT -> Broker + Office (kept as you had) */}
            {formData.role === CLIENT && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="officeId" style={{ color: "#fff" }}>
                    Select Office
                  </Label>
                  <Select
                    value={brokerFormData}
                    onChange={handleChangeBrokerValueOption}
                    options={brokerData.length === 0 ? [] : brokerData}
                    isLoading={brokersLoading}
                    placeholder="Select Office"
                    className="w-full"
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        borderWidth: "1px",
                        color: "#ffffff",
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: "#2a2f36",
                        color: "#ffffff",
                      }),
                      option: (base, { isFocused }) => ({
                        ...base,
                        backgroundColor: isFocused ? "#3a3f46" : "#2a2f36",
                        color: "#ffffff",
                      }),
                      singleValue: (base) => ({ ...base, color: "#ffffff" }),
                    }}
                  />
                </div>
              </>
            )}

            {/* Role-based caps */}
            {[SUPER_ADMIN, ADMIN, MASTER].includes(formData.role) && (
              <>
                {formData.role === SUPER_ADMIN && (
                  <div className="space-y-2">
                    <Label htmlFor="maxAdmins" style={{ color: "#fff" }}>
                      Max Admins (-1 for unlimited)
                    </Label>
                    <Input
                      id="maxAdmins"
                      name="maxAdmins"
                      type="text"
                      min={-1}
                      value={formData.maxAdmins ?? 0}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxAdmins:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        }))
                      }
                      className="bg-gray-800 border-yellow-500 text-white"
                      style={{
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                )}

                {formData.role === ADMIN && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="maxMaster" style={{ color: "#fff" }}>
                        Max Masters (-1 for unlimited)
                      </Label>
                      <Input
                        id="maxMaster"
                        name="maxMaster"
                        type="number"
                        min={-1}
                        value={formData.maxMaster ?? ""}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(
                            /^0+(?=\d)/,
                            ""
                          );
                          setFormData((prev) => ({
                            ...prev,
                            maxMaster:
                              cleaned === ""
                                ? ""
                                : Number(cleaned) < -1
                                ? -1
                                : Number(cleaned),
                          }));
                        }}
                        className="bg-gray-800 border-yellow-500 text-white"
                        style={{
                          backgroundColor: "#2a2f36",
                          borderColor: "#fff",
                          color: "#ffffff",
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxBroker" style={{ color: "#fff" }}>
                        Max Brokers (-1 for unlimited)
                      </Label>
                      <Input
                        id="maxBroker"
                        name="maxBroker"
                        type="number"
                        min={-1}
                        value={formData.maxBroker ?? ""}
                        onChange={(e) => {
                          const noZeros = e.target.value.replace(
                            /^0+(?=\d)/,
                            ""
                          );
                          setFormData((prev) => ({
                            ...prev,
                            maxBroker:
                              noZeros === ""
                                ? ""
                                : Number(noZeros) < -1
                                ? -1
                                : Number(noZeros),
                          }));
                        }}
                        onBlur={(e) => {
                          const n = Number(e.target.value || 0);
                          setFormData((prev) => ({ ...prev, maxBroker: n }));
                        }}
                        className="bg-gray-800 border-yellow-500 text-white"
                        style={{
                          backgroundColor: "#2a2f36",
                          borderColor: "#fff",
                          color: "#ffffff",
                        }}
                      />
                    </div>
                  </>
                )}

                {formData.role === MASTER && (
                  <div className="space-y-2">
                    <Label htmlFor="maxUser" style={{ color: "#fff" }}>
                      Max Users (-1 for unlimited)
                    </Label>
                    <Input
                      id="maxUser"
                      name="maxUser"
                      type="number"
                      min={-1}
                      value={formData.maxUser ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxUser:
                            e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      className="bg-gray-800 border-yellow-500 text-white"
                      style={{
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                )}

                {formData.role === ADMIN && (
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="masterWalletLimit"
                      className="font-medium"
                      style={{ color: "#fff" }}
                    >
                      Forward Balance
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="masterWalletLimit"
                      name="masterWalletLimit"
                      type="text"
                      min={-1}
                      value={formData.forwardBalance || ""}
                      placeholder="Enter wallet cap (e.g., 500000)"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          forwardBalance:
                            e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      className="bg-gray-800 border-yellow-500 text-white"
                      style={{
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {/* MASTER / BROKER / ADMIN → Sharing */}
            {[MASTER, OFFICE, ADMIN].includes(formData.role) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="brkSharing" style={{ color: "#fff" }}>
                    Brokerage Sharing (%){" "}
                    <span className="text-red-500">*</span>
                    <p className="text-sm" style={{ color: "#848E9C" }}>
                      Our: {formData.brkSharing} | Down Line:{" "}
                      {formData.brkSharingDownLine}
                    </p>
                  </Label>
                  <Input
                    id="brkSharing"
                    name="brkSharing"
                    type="text"
                    min={0}
                    value={
                      isNaN(Number(formData.brkSharing))
                        ? ""
                        : formData.brkSharing
                    }
                    placeholder="Enter Percentage"
                    onChange={handleBrkSharingChange}
                    className="bg-gray-800 border-yellow-500 text-white"
                    style={{
                      backgroundColor: "#2a2f36",
                      borderColor: "#fff",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <fieldset className="space-y-3">
                  <div className="flex items-center gap-6">
                    <label
                      className="inline-flex items-center gap-2"
                      style={{ color: "#848E9C" }}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value="plSharing"
                        checked={isPLSharing}
                        onChange={handleToggleChange}
                      />
                      <span>P/L Sharing</span>
                    </label>

                    <label
                      className="inline-flex items-center gap-2"
                      style={{ color: "#848E9C" }}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value="saasMode"
                        checked={!isPLSharing}
                        onChange={handleToggleChange}
                      />
                      <span>SaaS Mode</span>
                    </label>
                  </div>

                  {isPLSharing ? (
                    <div className="mt-3 space-y-2">
                      <Input
                        id="profitAndLossSharing"
                        name="profitAndLossSharing"
                        type="number"
                        min={0}
                        step="any"
                        value={
                          isNaN(Number(formData.profitAndLossSharing))
                            ? ""
                            : formData.profitAndLossSharing
                        }
                        placeholder="Enter Percentage"
                        onChange={handleProfitAndLossChange}
                        className="bg-gray-800 border-yellow-500 text-white"
                        style={{
                          backgroundColor: "#2a2f36",
                          borderColor: "#fff",
                          color: "#ffffff",
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <Input
                        id="saasModeValue"
                        name="saasModeValue"
                        type="number"
                        min={0}
                        step="any"
                        value={
                          isNaN(Number(formData.saasModeValue))
                            ? ""
                            : formData.saasModeValue
                        }
                        placeholder="Enter Value"
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            saasModeValue: e.target.value,
                          }))
                        }
                        className="bg-gray-800 border-blue-500 text-white"
                        style={{
                          backgroundColor: "#2a2f36",
                          borderColor: "#fff",
                          color: "#ffffff",
                        }}
                      />
                    </div>
                  )}
                </fieldset>
              </>
            )}
          </div>
          {formData.role === OFFICE && (
            <div className="space-y-2 rounded-md ">
              {/* header */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="officeUsers" style={{ color: "#fff" }}>
                    Select Users for this Office
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  {selectedOfficeUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOfficeUsers([]);
                        setFormData((prev) => ({ ...prev, officeUsers: [] }));
                      }}
                      className="text-xs text-red-300 hover:text-red-100 transition"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* select */}
              <ReactSelect
                inputId="officeUsers"
                isMulti
                value={selectedOfficeUsers}
                onInputChange={(val) => {
                  handleSearchUser(val);
                  return val;
                }}
                onChange={(opts) => {
                  const arr = Array.isArray(opts) ? opts : [];
                  setSelectedOfficeUsers(arr);
                  setFormData((prev) => ({
                    ...prev,
                    officeUsers: arr.map((o) => o.value),
                  }));
                }}
                options={userOptions}
                isLoading={userLoading}
                placeholder="Search & select multiple users..."
                filterOption={() => true}
                className="react-select-office"
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "#2a2f36",
                    borderColor: "#ffffff33",
                    borderWidth: "1px",
                    boxShadow: "none",
                    minHeight: "42px",
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "#1f242a",
                    color: "#ffffff",
                  }),
                  option: (base, { isFocused }) => ({
                    ...base,
                    backgroundColor: isFocused ? "#323841" : "#1f242a",
                    color: "#ffffff",
                    cursor: "pointer",
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: "#3a3f46",
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: "#ffffff",
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    color: "#ffffff",
                    ":hover": {
                      backgroundColor: "#ef4444",
                      color: "white",
                    },
                  }),
                  input: (base) => ({ ...base, color: "#ffffff" }),
                  placeholder: (base) => ({ ...base, color: "#848E9C" }),
                  singleValue: (base) => ({ ...base, color: "#ffffff" }),
                }}
              />
            </div>
          )}

          {/* CLIENT caps when B2B (kept) */}
          {[MASTER_ID].includes(formData.role) && !isB2B && (
            <div className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: "minimumDeposit",
                    label: "Minimum Deposit",
                    value: formData.minimumDeposit,
                    placeholder: "e.g. 500",
                  },
                  {
                    id: "maximumDeposit",
                    label: "Maximum Deposit",
                    value: formData.maximumDeposit,
                    placeholder: "e.g. 100000",
                  },
                  {
                    id: "minimumWithdraw",
                    label: "Minimum Withdraw",
                    value: formData.minimumWithdraw,
                    placeholder: "e.g. 100",
                  },
                  {
                    id: "maximumWithdraw",
                    label: "Maximum Withdraw",
                    value: formData.maximumWithdraw,
                    placeholder: "e.g. 50000",
                  },
                ].map((f) => (
                  <div className="space-y-2" key={f.id}>
                    <Label htmlFor={f.id} style={{ color: "#fff" }}>
                      {f.label}
                    </Label>
                    <Input
                      id={f.id}
                      name={f.id}
                      type="text"
                      min={0}
                      value={f.value}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [f.id]:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        }))
                      }
                      className="bg-gray-800 border-yellow-500 text-white"
                      style={{
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MASTER-only (extra fields) */}
          {formData.role === MASTER && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="masterWalletLimit"
                    className="font-medium"
                    style={{ color: "#fff" }}
                  >
                    Forward Balance
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="masterWalletLimit"
                    name="masterWalletLimit"
                    type="text"
                    min={-1}
                    value={formData.forwardBalance || ""}
                    placeholder="Enter wallet cap (e.g., 500000)"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        forwardBalance:
                          e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    className="bg-gray-800 border-yellow-500 text-white"
                    style={{
                      backgroundColor: "#2a2f36",
                      borderColor: "#fff",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <span>
                  <Label className="font-medium" style={{ color: "#fff" }}>
                    Allow Deposit Withdraw ATS System{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex-1 px- py-1 rounded-md">
                    <RadioGroup
                      value={String(formData.depositWithdrawAtsSystem)}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          depositWithdrawAtsSystem: Number(value),
                        }))
                      }
                      className="flex flex-row gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="1"
                          id="depositWithdrawAtsSystemYes"
                          className="bg-gray-700 border-yellow-500"
                        />
                        <Label
                          htmlFor="depositWithdrawAtsSystemYes"
                          style={{ color: "#848E9C" }}
                        >
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="0"
                          id="depositWithdrawAtsSystemNo"
                          className="bg-gray-700 border-yellow-500"
                        />
                        <Label
                          htmlFor="depositWithdrawAtsSystemNo"
                          style={{ color: "#848E9C" }}
                        >
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </span>

                <span>
                  <Label className="font-medium pb-2" style={{ color: "#fff" }}>
                    Is B2B?
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Checkbox
                      id="isB2B"
                      checked={isB2B}
                      onCheckedChange={(c) => setIsB2B(c as boolean)}
                      className="bg-gray-700 border-yellow-500"
                    />
                    <Label htmlFor={`isB2B`} style={{ color: "#848E9C" }}>
                      is B2B?
                    </Label>
                  </div>
                </span>
              </div>

              {/* High Low Between Limit */}
              <CardTitle style={{ color: "#fff" }}>
                High Low Between Limit
              </CardTitle>
              <div className="flex flex-wrap gap-4">
                {exchangeGroupData.map((datae, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 rounded-md border"
                    style={{ backgroundColor: "#2a2f36", borderColor: "#fff" }}
                  >
                    <Checkbox
                      id={`highLow-${index}`}
                      checked={formData.highLowBetweenTradeLimit.includes(
                        datae.exchangeId
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData((prev) => ({
                            ...prev,
                            highLowBetweenTradeLimit: [
                              ...prev.highLowBetweenTradeLimit,
                              datae.exchangeId,
                            ],
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            highLowBetweenTradeLimit:
                              prev.highLowBetweenTradeLimit.filter(
                                (item) => item !== datae.exchangeId
                              ),
                          }));
                        }
                      }}
                      className="bg-gray-700 border-yellow-500"
                    />
                    <Label
                      htmlFor={`highLow-${index}`}
                      style={{ color: "#848E9C" }}
                    >
                      {datae.name}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ADMIN → White Label + toggles (kept) */}
          {formData.role === ADMIN && (
            <>
              <CardTitle style={{ color: "#fff" }}>
                White Label Settings
              </CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: "title",
                    label: "Title",
                    required: true,
                    placeholder: "PT5 Book",
                  },
                  { id: "mainDomain", label: "Main Domain", required: true },
                  { id: "domain", label: "Domain", required: true },
                ].map(({ id, label, required, placeholder }) => (
                  <div key={id} className="space-y-2">
                    <Label htmlFor={id} style={{ color: "#fff" }}>
                      {label}{" "}
                      {required && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id={id}
                      name={id}
                      type="text"
                      value={(formData as any)[id]}
                      placeholder={placeholder || `Enter ${label}`}
                      onChange={handleChange}
                      className="bg-gray-800 border-yellow-500 text-white"
                      style={{
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                ))}

                {/* Brand Logo */}
                <div className="space-y-2">
                  <Label htmlFor="brandLogo" style={{ color: "#fff" }}>
                    Brand Logo (PNG/JPG/WebP, ≤ 2MB)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="brandLogo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      className="bg-gray-800 border-yellow-500 text-white"
                      style={{
                        backgroundColor: "#2a2f36",
                        borderColor: "#fff",
                        color: "#ffffff",
                      }}
                    />
                    {logoPreview || formData.brandLogoBase64 ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            logoPreview || (formData.brandLogoBase64 as string)
                          }
                          alt="Logo preview"
                          className="h-10 w-10 rounded border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearLogo}
                          className="bg-gray-700 border-yellow-500 text-white"
                          style={{
                            backgroundColor: "#2a2f36",
                            borderColor: "#fff",
                            color: "#ffffff",
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "#848E9C" }}>
                        If empty, UI can just show the Title (e.g., "PT5 Book").
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 grid grid-cols-2 gap-4">
                <div
                  className="p-3 rounded-md border mb-0"
                  style={{ backgroundColor: "#2a2f36", borderColor: "#fff" }}
                >
                  <Label style={{ color: "#fff" }}>
                    Allow updating Brokerage, Leverage & Carry Forward Margin{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={String(formData.isAllowBrkLevUpdate)}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        isAllowBrkLevUpdate: Number(value),
                      }))
                    }
                    className="flex flex-row space-x-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="1"
                        id="isAllowBrkLevUpdateYes"
                        className="bg-gray-700 border-yellow-500"
                      />
                      <Label
                        htmlFor="isAllowBrkLevUpdateYes"
                        style={{ color: "#848E9C" }}
                      >
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="0"
                        id="isAllowBrkLevUpdateNo"
                        className="bg-gray-700 border-yellow-500"
                      />
                      <Label
                        htmlFor="isAllowBrkLevUpdateNo"
                        style={{ color: "#848E9C" }}
                      >
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div
                    className="p-3 rounded-md border mb-0"
                    style={{ backgroundColor: "#2a2f36", borderColor: "#fff" }}
                  >
                    <Label htmlFor="freshLimitSL" style={{ color: "#fff" }}>
                      Fresh Limit SL <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="freshLimitSL"
                        checked={formData.freshLimitSL}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            freshLimitSL: Boolean(checked),
                          }))
                        }
                        className="bg-gray-700 border-yellow-500"
                      />
                      <Label
                        htmlFor="freshLimitSL"
                        style={{ color: "#848E9C" }}
                      >
                        Enable Fresh Limit SL
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CLIENT-only toggles */}
          {formData.role === CLIENT && (
            <div
              className="p-3 rounded-md border"
              style={{ backgroundColor: "#2a2f36", borderColor: "#fff" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-2">
                  <Label
                    htmlFor="freshLimitSL"
                    className="font-medium"
                    style={{ color: "#fff" }}
                  >
                    Fresh Limit SL <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="freshLimitSL"
                      checked={formData.freshLimitSL}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          freshLimitSL: Boolean(checked),
                        }))
                      }
                      className="bg-gray-700 border-yellow-500"
                    />
                    <Label
                      htmlFor="freshLimitSL"
                      className="whitespace-nowrap"
                      style={{ color: "#848E9C" }}
                    >
                      Enable Fresh Limit SL
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="liquiode"
                    className="font-medium"
                    style={{ color: "#fff" }}
                  >
                    Liquadation <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="liquadation"
                      checked={formData.liquadation}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          liquadation: Boolean(checked),
                        }))
                      }
                      className="bg-gray-700 border-yellow-500"
                    />
                    <Label
                      htmlFor="liquiode"
                      className="whitespace-nowrap"
                      style={{ color: "#848E9C" }}
                    >
                      Enable Liquadation
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONE place to show Exchange Configuration for ADMIN / MASTER / CLIENT */}
          {[ADMIN, MASTER, CLIENT_ID].includes(formData.role) && (
            <>
              <CardTitle style={{ color: "#fff" }}>
                Exchange Configuration
              </CardTitle>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-5" style={{ color: "#fff" }}>
                        <Checkbox
                          checked={checkAllCheckBox}
                          onCheckedChange={handleChangeExAllCheckBox}
                          className="bg-gray-700 border-yellow-500"
                        />
                      </TableHead>
                      <TableHead style={{ color: "#fff" }}>Exchange</TableHead>
                      <TableHead style={{ color: "#fff" }}>
                        Turnoverwise Brk.
                      </TableHead>
                      <TableHead style={{ color: "#fff" }}>
                        Symbolwise Brk.
                      </TableHead>
                      <TableHead style={{ color: "#fff" }}>
                        Brokerage %
                      </TableHead>
                      <TableHead style={{ color: "#fff" }}>Leverage</TableHead>
                      <TableHead style={{ color: "#fff" }}>
                        Carry Forward Margin
                      </TableHead>
                      <TableHead style={{ color: "#fff" }}>
                        New Position Square Off Time Limit
                      </TableHead>
                      <TableHead style={{ color: "#fff" }}>
                        Select Group
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeGroupData
                      .filter((e) =>
                        sessionRole === SUPER_ADMIN
                          ? true
                          : allowedExchanges.includes(e.exchangeId)
                      )
                      .map((datae) => {
                        const selected = exchangeFromData.find(
                          (p) => p.exchangeId === datae.exchangeId
                        );

                        const isTurnoverWise = Boolean(
                          selected?.isTurnoverWise
                        );
                        const isSymbolWise = Boolean(selected?.isSymbolWise);
                        const brokerageValue = isTurnoverWise
                          ? selected?.brokerageTurnoverwise ?? 0
                          : isSymbolWise
                          ? selected?.brokerageSymbolwiseAmount ?? 0
                          : 0;

                        return (
                          <TableRow
                            key={datae.exchangeId}
                            style={{ color: "#ffffff" }}
                          >
                            <TableCell>
                              <Checkbox
                                checked={!!selected}
                                onCheckedChange={() =>
                                  handleToChangeExchangeCheckBox(
                                    datae.exchangeId,
                                    datae
                                  )
                                }
                                className="bg-gray-700 border-yellow-500"
                              />
                            </TableCell>
                            <TableCell>{datae.name}</TableCell>
                            <TableCell>
                              <Checkbox
                                checked={isTurnoverWise}
                                onCheckedChange={() =>
                                  handleChangeBrkValueOption(
                                    "isTurnoverWise",
                                    datae
                                  )
                                }
                                className="bg-gray-700 border-yellow-500"
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={isSymbolWise}
                                onCheckedChange={() =>
                                  handleChangeBrkValueOption(
                                    "isSymbolWise",
                                    datae
                                  )
                                }
                                className="bg-gray-700 border-yellow-500"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                min={0}
                                value={brokerageValue}
                                placeholder="Enter brk"
                                onChange={(e) =>
                                  handleChangeBLCFValue(
                                    e,
                                    isTurnoverWise
                                      ? "brokerageTurnoverwise"
                                      : "brokerageSymbolwiseAmount",
                                    datae
                                  )
                                }
                                className="bg-gray-800 border-yellow-500 text-white"
                                style={{
                                  backgroundColor: "#2a2f36",
                                  borderColor: "#fff",
                                  color: "#ffffff",
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                min={0}
                                value={selected?.leverage ?? 0}
                                placeholder="Enter Leverage"
                                onChange={(e) =>
                                  handleChangeBLCFValue(e, "leverage", datae)
                                }
                                className="bg-gray-800 border-yellow-500 text-white"
                                style={{
                                  backgroundColor: "#2a2f36",
                                  borderColor: "#fff",
                                  color: "#ffffff",
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                min={0}
                                value={selected?.carryForwardMarginAmount ?? 0}
                                placeholder="Enter Carry Forward Margin Amount"
                                onChange={(e) =>
                                  handleChangeBLCFValue(
                                    e,
                                    "carryForwardMarginAmount",
                                    datae
                                  )
                                }
                                className="bg-gray-800 border-yellow-500 text-white"
                                style={{
                                  backgroundColor: "#2a2f36",
                                  borderColor: "#fff",
                                  color: "#ffffff",
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                min={0}
                                value={
                                  selected?.newPositionSquareOffTimeLimit ?? 0
                                }
                                placeholder="Enter New Position Square Off Time Limit"
                                onChange={(e) =>
                                  handleChangeBLCFValue(
                                    e,
                                    "newPositionSquareOffTimeLimit",
                                    datae
                                  )
                                }
                                className="bg-gray-800 border-yellow-500 text-white"
                                style={{
                                  backgroundColor: "#2a2f36",
                                  borderColor: "#fff",
                                  color: "#ffffff",
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <ReactSelect
                                isDisabled={!selected}
                                value={
                                  selected?.groupId
                                    ? {
                                        value: selected.groupId,
                                        label:
                                          groups.find(
                                            (g) =>
                                              g.exchangeId ===
                                                datae.exchangeId &&
                                              g.id === selected.groupId
                                          )?.name ?? "Selected",
                                      }
                                    : null
                                }
                                onChange={(selectedOption) =>
                                  handleChangeGroupSelect(
                                    selectedOption?.value,
                                    datae.exchangeId
                                  )
                                }
                                className="min-w-2xs"
                                options={groups
                                  .filter(
                                    (e) => e.exchangeId === datae.exchangeId
                                  )
                                  .map((g) => ({
                                    value: g.id,
                                    label: g.name,
                                  }))}
                                placeholder="Select Group"
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    backgroundColor: "#2a2f36",
                                    borderColor: "#fff",
                                    color: "#ffffff",
                                  }),
                                  menu: (base) => ({
                                    ...base,
                                    backgroundColor: "#2a2f36",
                                    color: "#ffffff",
                                  }),
                                  option: (base, { isFocused }) => ({
                                    ...base,
                                    backgroundColor: isFocused
                                      ? "#3a3f46"
                                      : "#2a2f36",
                                    color: "#ffffff",
                                  }),
                                  singleValue: (base) => ({
                                    ...base,
                                    color: "#ffffff",
                                  }),
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <CardFooter className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-gray-700 border-yellow-500 text-white"
              style={{
                backgroundColor: "#2a2f36",
                borderColor: "#fff",
                color: "#ffffff",
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-yellow-500 text-black"
              style={{ backgroundColor: "#fff", color: "#000000" }}
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </CardFooter>
        </form>
      </div>
    </div>
  );
}
