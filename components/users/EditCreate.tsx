"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import ReactSelect from "react-select";
import apiClient from "@/lib/axiosInstance";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { ArrowLeft, Save, X, Edit } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  ADMIN_API_ENDPOINT,
  EDIT_USER,
  EXCHANGE_LIST,
  SUCCESS,
  ROLE_LIST,
  USER_BROKER_LIST,
  USER_LIST,
  USER_CHILD_LIST,
  ADMIN,
  BROKER,
  CLIENT,
  MASTER,
  SUPER_ADMIN,
  OFFICE,
} from "@/constant/index";
import { encryptData, decryptData } from "@/hooks/crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Type definitions (same as in your original component)
interface ExchangeData {
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

interface ExchangeGroupData {
  exchangeId: string;
  name: string;
  brokerageType: string;
  brokerageSymbolwiseAmount: number;
  brokerageTurnoverwise: number;
  leverage: number;
  newPositionSquareOffTimeLimit: number;
  carryForwardMarginAmount: number;
  exchangeFromData: ExchangeData;
}

interface User {
  userId: string;
  name: string;
  role: string;
  domain?: string;
  mainDomain?: string;
  title?: string;
  allowedDevices: number;
  depositWithdrawAtsSystem: number;
  cmpOrder?: number;
  manualOrder?: number;
  deleteTrade?: number;
  cancelTrade?: number;
  executePendingOrder?: number;
  onlyView?: number;
  brkSharing: number;
  brkSharingDownLine: number;
  freshLimitSL: boolean;
  highLowBetweenTradeLimit?: string[];
  autoSquareOffPercentage?: number;
  isAllowBrkLevUpdate?: number;
  minimumDeposit?: number;
  maximumDeposit?: number;
  minimumWithdraw?: number;
  maximumWithdraw?: number;
  userWiseExchangeData: ExchangeData[];
  phone?: string;
  brokerId?: string;
  maxAdmin?: number;
  maxMaster?: number;
  maxUser?: number;
  maxBroker?: number;
  forwardBalance?: number;
  isB2B?: boolean;
  brandLogoBase64?: string;
  brandColor?: string;
  supportEmail?: string;
  liquadation?: boolean;
  profitAndLossSharing?: number;
  profitAndLossSharingDownLine?: number;
  saasModeValue?: number;
  defaultLeverage?: number;
  selectedUserId?: string;
  parentId?: string;
  officeUsers?: string[];
  additionalDevices?: string;
  allowMultiLogin?: boolean;
  maxConcurrentDevices?: number;
  onLimitPolicy?: "block" | "logout_oldest" | "notify_only";
}

interface AuthenticatedUser {
  role: string;
  brkSharingDownLine: number;
}

interface RoleOption {
  value: string;
  label: string;
}

interface BrokerOption {
  value: string;
  label: string;
}

interface EditUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
  groups?: any[];
}

export default function EditCreate({
  isOpen,
  onClose,
  user,
  onSuccess,
  groups = [],
}: EditUserFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const jwt_token = (session as any)?.accessToken as string | undefined;
  const deviceType =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedUserId = (session?.user as any)?.userId as
    | string
    | undefined;
  const authenticatedRole = (session?.user as any)?.roleName as
    | string
    | undefined;

  const authenticated =
    typeof window !== "undefined"
      ? (JSON.parse(
          localStorage.getItem("authenticated") || "{}"
        ) as AuthenticatedUser)
      : null;
  const sessionRole = (session?.user as any)?.role ?? "";
  const canSeeUserSearch = [ADMIN, SUPER_ADMIN, MASTER].includes(sessionRole);

  const [formData, setFormData] = useState({
    userId: "",
    name: "",
    role: "",
    phone: "",
    password: "",
    retype_password: "",
    domain: "",
    mainDomain: "",
    title: "",
    allowedDevices: 0,
    depositWithdrawAtsSystem: 0,
    freshLimitSL: false,
    brkSharingDownLine: 0,
    brkSharing: 0,
    cmpOrder: 0,
    manualOrder: 0,
    deleteTrade: 0,
    cancelTrade: 0,
    executePendingOrder: 0,
    onlyView: 0,
    highLowBetweenTradeLimit: [] as string[],
    autoSquareOffPercentage: 0,
    isAllowBrkLevUpdate: 0,
    minimumDeposit: 0,
    maximumDeposit: 0,
    minimumWithdraw: 0,
    maximumWithdraw: 0,
    brokerId: "",
    maxAdmin: -1,
    maxMaster: -1,
    maxUser: -1,
    maxBroker: -1,
    forwardBalance: 10000000,
    isB2B: false,
    brandLogoBase64: "",
    brandColor: "#fff",
    supportEmail: "",
    liquadation: false,
    profitAndLossSharing: 100,
    profitAndLossSharingDownLine: 0,
    saasModeValue: 0,
    defaultLeverage: 500,
    selectedUserId: "",
    parentId: "",
    officeUsers: [] as string[],
    additionalDevices: "",
    allowMultiLogin: true,
    maxConcurrentDevices: 3,
    onLimitPolicy: "block" as "block" | "logout_oldest" | "notify_only",
  });

  const [exchangeFromData, setExchangeFromData] = useState<ExchangeData[]>([]);
  const [exchangeGroupData, setExchangeGroupData] = useState<
    ExchangeGroupData[]
  >([]);
  const [checkAllCheckBox, setCheckAllCheckBox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roleData, setRoleData] = useState<RoleOption[]>([]);
  const [roleFormData, setRoleFormData] = useState<RoleOption | null>(null);
  const [brokerData, setBrokerData] = useState<BrokerOption[]>([]);
  const [brokerFormData, setBrokerFormData] = useState<BrokerOption | null>(
    null
  );
  const [brokersLoading, setBrokersLoading] = useState(false);
  const [isPLSharing, setIsPLSharing] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [togglePassword, setTogglePassword] = useState(false);
  const [ctogglePassword, setCTogglePassword] = useState(false);
  const [userOptions, setUserOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUserOption, setSelectedUserOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [selectedOfficeUsers, setSelectedOfficeUsers] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        userId: user.userId,
        name: user.name,
        role: user.role,
        phone: user.phone || "",
        password: "",
        retype_password: "",
        domain: user.domain || "",
        mainDomain: user.mainDomain || "",
        title: user.title || "",
        allowedDevices: user.allowedDevices,
        depositWithdrawAtsSystem: user.depositWithdrawAtsSystem,
        freshLimitSL: user.freshLimitSL,
        brkSharingDownLine: user.brkSharingDownLine,
        brkSharing: user.brkSharing,
        cmpOrder: user.cmpOrder || 0,
        manualOrder: user.manualOrder || 0,
        deleteTrade: user.deleteTrade || 0,
        cancelTrade: user.cancelTrade || 0,
        executePendingOrder: user.executePendingOrder || 0,
        onlyView: user.onlyView || 0,
        highLowBetweenTradeLimit: user.highLowBetweenTradeLimit || [],
        autoSquareOffPercentage: user.autoSquareOffPercentage || 0,
        isAllowBrkLevUpdate: user.isAllowBrkLevUpdate || 0,
        minimumDeposit: user.minimumDeposit || 0,
        maximumDeposit: user.maximumDeposit || 0,
        minimumWithdraw: user.minimumWithdraw || 0,
        maximumWithdraw: user.maximumWithdraw || 0,
        brokerId: user.brokerId || "",
        maxAdmin: user.maxAdmin || -1,
        maxMaster: user.maxMaster || -1,
        maxUser: user.maxUser || -1,
        maxBroker: user.maxBroker || -1,
        forwardBalance: user.forwardBalance || 10000000,
        isB2B: user.isB2B || false,
        brandLogoBase64: user.brandLogoBase64 || "",
        brandColor: user.brandColor || "#fff",
        supportEmail: user.supportEmail || "",
        liquadation: user.liquadation || false,
        profitAndLossSharing: user.profitAndLossSharing || 100,
        profitAndLossSharingDownLine: user.profitAndLossSharingDownLine || 0,
        saasModeValue: user.saasModeValue || 0,
        defaultLeverage: user.defaultLeverage || 500,
        selectedUserId: user.selectedUserId || "",
        parentId: user.parentId || "",
        officeUsers: user.officeUsers || [],
        additionalDevices: user.additionalDevices || "",
        allowMultiLogin:
          user.allowMultiLogin !== undefined ? user.allowMultiLogin : true,
        maxConcurrentDevices: user.maxConcurrentDevices || 3,
        onLimitPolicy: user.onLimitPolicy || "block",
      });

      // Set role form data
      const roleOption = roleData.find((r) => r.value === user.role);
      setRoleFormData(roleOption || null);

      // Set broker form data if client
      if (user.role === CLIENT && user.brokerId) {
        const brokerOption = brokerData.find((b) => b.value === user.brokerId);
        setBrokerFormData(brokerOption || null);
      }

      // Set exchange data
      setExchangeFromData(user.userWiseExchangeData || []);

      // Set PL sharing mode
      setIsPLSharing(
        user.profitAndLossSharing !== undefined && user.profitAndLossSharing > 0
      );

      // Set logo preview
      if (user.brandLogoBase64) {
        setLogoPreview(user.brandLogoBase64);
      }

      // Set selected user if available
      if (user.selectedUserId) {
        setSelectedUserOption({
          value: user.selectedUserId,
          label: user.selectedUserId, // You might want to fetch the actual label
        });
      }

      // Set selected office users
      if (user.officeUsers && user.officeUsers.length > 0) {
        // You might want to fetch the actual labels for these users
        setSelectedOfficeUsers(
          user.officeUsers.map((userId: string) => ({
            value: userId,
            label: userId, // Replace with actual user name if available
          }))
        );
      }
    }
  }, [user, roleData, brokerData]);

  // Fetch exchange data
  useEffect(() => {
    if (isOpen) {
      fetchExchangeGroup();
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      const response = await apiClient.post(ROLE_LIST, [], {
        headers: {
          "Content-Type": "application/json",
          deviceType: deviceType,
          Authorization: jwt_token,
        },
      });

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data);
        const formattedOptions = rdata.map((item: any) => ({
          value: item.roleId,
          label: item.name,
        }));
        setRoleData(formattedOptions);

        // Set role form data after roles are loaded
        if (user) {
          const roleOption = formattedOptions.find(
            (r) => r.value === user.role
          );
          setRoleFormData(roleOption || null);
        }
      }
    } catch (error) {
      console.error("Error fetching role data:", error);
      toast.error("Failed to fetch role data");
    }
  };

  const fetchExchangeGroup = async () => {
    try {
      const data = encryptData({
        page: 1,
        limit: 10,
        search: "",
        sortKey: "createdAt",
        sortBy: -1,
      });
      const payload = JSON.stringify({ data: data });

      const response = await apiClient.post(
        ADMIN_API_ENDPOINT + EXCHANGE_LIST,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            deviceType: deviceType,
            Authorization: jwt_token,
          },
        }
      );

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data);
        handleToSetAData(rdata);
      }
    } catch (error) {
      console.error("Error fetching exchange data:", error);
      toast.error("Failed to fetch exchange data");
    }
  };

  const fetchBrokers = async () => {
    if (formData.role !== CLIENT) return;

    try {
      setBrokersLoading(true);
      const formdat = { userId: authenticatedUserId };
      const formDataParam = encryptData(formdat);
      const response = await apiClient.post(
        USER_BROKER_LIST,
        JSON.stringify({ data: formDataParam }),
        {
          headers: {
            "Content-Type": "application/json",
            deviceType: deviceType,
            Authorization: jwt_token,
          },
        }
      );

      if (response.data.statusCode === SUCCESS) {
        const rdata = decryptData(response.data.data);
        const formattedOptions = rdata.map((item: any) => ({
          value: item.userId,
          label: item.userName,
        }));
        setBrokerData(formattedOptions);

        // Set broker form data after brokers are loaded
        if (user && user.brokerId) {
          const brokerOption = formattedOptions.find(
            (b) => b.value === user.brokerId
          );
          setBrokerFormData(brokerOption || null);
        }
      }
    } catch (error) {
      console.error("Error fetching broker data:", error);
      toast.error("Failed to fetch broker data");
    } finally {
      setBrokersLoading(false);
    }
  };

  const handleSearchUser = async (inputValue: string) => {
    const search = inputValue.trim();
    if (!search) {
      setUserOptions([]);
      return;
    }

    try {
      setUserLoading(true);

      // who is logged in (you already have `authenticated` from localStorage)
      const authenticatedRoleId = (authenticated as any)?.role || "";

      // payload your backend expects
      const payload = {
        role: authenticatedRoleId || "",
        search, // what user typed
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

      // choose endpoint based on who is logged in
      const apiUrl =
        authenticatedRoleId === MASTER ? USER_LIST : USER_CHILD_LIST;

      const resp = await apiClient.post(
        ADMIN_API_ENDPOINT + apiUrl,
        JSON.stringify({ data: encryptData(payload) })
      );

      if (resp.data.statusCode === SUCCESS) {
        const rdata = decryptData(resp.data.data) as any[];
        const list = Array.isArray(rdata) ? rdata : [];

        const mapped = list.map((u) => ({
          value: u.userId || u._id,
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

  const handleToSetAData = (rdata: any[]) => {
    if (!user) return;

    let udata: ExchangeGroupData[] = [];
    const updatedArray = rdata.map((item) => {
      const exchangeIndex = user.userWiseExchangeData.findIndex(
        (p: any) => p.exchangeId === item.exchangeId
      );
      if (exchangeIndex > -1) {
        item.exchangeFromData = {
          exchangeId: item.exchangeId,
          isTurnoverWise:
            user.userWiseExchangeData[exchangeIndex].isTurnoverWise,
          isSymbolWise: user.userWiseExchangeData[exchangeIndex].isSymbolWise,
          brokerageSymbolwiseAmount:
            user.userWiseExchangeData[exchangeIndex].brokerageSymbolwiseAmount,
          brokerageTurnoverwise:
            user.userWiseExchangeData[exchangeIndex].brokerageTurnoverwise,
          leverage: user.userWiseExchangeData[exchangeIndex].leverage,
          newPositionSquareOffTimeLimit:
            user.userWiseExchangeData[exchangeIndex]
              .newPositionSquareOffTimeLimit,
          carryForwardMarginAmount:
            user.userWiseExchangeData[exchangeIndex].carryForwardMarginAmount,
          groupId: user.userWiseExchangeData[exchangeIndex].groupId,
        };
        udata.push(item);
      } else {
        udata.push(item);
      }
      return item;
    });
    setExchangeGroupData(udata);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleRoleChange = (selected: RoleOption | null) => {
    setRoleFormData(selected);
    setFormData({
      ...formData,
      role: selected?.value || "",
    });

    // Reset broker data when role changes
    if (selected?.value !== CLIENT) {
      setBrokerFormData(null);
      setBrokerData([]);
    } else {
      fetchBrokers();
    }
  };

  const handleBrokerChange = (selected: BrokerOption | null) => {
    setBrokerFormData(selected);
    setFormData({
      ...formData,
      brokerId: selected?.value || "",
    });
  };

  const handleToChangeExchangeCheckBox = (
    exId: string,
    datae: ExchangeGroupData
  ) => {
    const value = exId;
    let brksymbolType = false;
    let brkTruType = true;
    if (datae.brokerageType === "symbolwise") {
      brksymbolType = true;
      brkTruType = false;
    }
    setExchangeFromData((prevState) => {
      const exchangeIndex = prevState.findIndex((p) => p.exchangeId === value);
      if (exchangeIndex > -1) {
        const updatedArray = exchangeGroupData.map((item) =>
          item["exchangeId"] === value
            ? { ...item, exchangeFromData: {} as ExchangeData }
            : item
        );
        setExchangeGroupData(updatedArray);
        return [
          ...prevState.slice(0, exchangeIndex),
          ...prevState.slice(exchangeIndex + 1),
        ];
      } else {
        const updatedArray = exchangeGroupData.map((item) =>
          item["exchangeId"] === value
            ? {
                ...item,
                exchangeFromData: {
                  exchangeId: value,
                  isTurnoverWise: brkTruType,
                  isSymbolWise: brksymbolType,
                  brokerageSymbolwiseAmount: datae.brokerageSymbolwiseAmount,
                  brokerageTurnoverwise: datae.brokerageTurnoverwise,
                  leverage: datae.leverage,
                  newPositionSquareOffTimeLimit:
                    datae.newPositionSquareOffTimeLimit,
                  carryForwardMarginAmount: datae.carryForwardMarginAmount,
                },
              }
            : item
        );
        setExchangeGroupData(updatedArray);
        return [
          ...prevState,
          {
            exchangeId: value,
            isTurnoverWise: brkTruType,
            isSymbolWise: brksymbolType,
            brokerageSymbolwiseAmount: datae.brokerageSymbolwiseAmount,
            brokerageTurnoverwise: datae.brokerageTurnoverwise,
            leverage: datae.leverage,
            newPositionSquareOffTimeLimit: datae.newPositionSquareOffTimeLimit,
            carryForwardMarginAmount: datae.carryForwardMarginAmount,
          },
        ];
      }
    });
  };

  const handleChangeExAllCheckBox = () => {
    let checked = true;
    if (checkAllCheckBox) {
      checked = false;
    }
    setCheckAllCheckBox(checked);
    if (checked) {
      const updatedArray = exchangeGroupData.map((item) => ({
        ...item,
        exchangeFromData: {
          exchangeId: item.exchangeId,
          isTurnoverWise: item.brokerageType === "symbolwise" ? false : true,
          isSymbolWise: item.brokerageType === "symbolwise" ? true : false,
          brokerageSymbolwiseAmount: item.brokerageSymbolwiseAmount,
          brokerageTurnoverwise: item.brokerageTurnoverwise,
          leverage: item.leverage,
          newPositionSquareOffTimeLimit: item.newPositionSquareOffTimeLimit,
          carryForwardMarginAmount: item.carryForwardMarginAmount,
        },
      }));
      const formattedOptions = updatedArray.map((item) => ({
        ...item.exchangeFromData,
      }));
      setExchangeGroupData(updatedArray);
      setExchangeFromData(formattedOptions);
    } else {
      const updatedArray = exchangeGroupData.map((item) => ({
        ...item,
        exchangeFromData: {} as ExchangeData,
      }));
      setFormData({
        ...formData,
        highLowBetweenTradeLimit: [],
      });
      const formattedOptions = updatedArray.map((item) => ({
        ...item.exchangeFromData,
      }));
      setExchangeGroupData(updatedArray);
      setExchangeFromData(formattedOptions);
    }
  };

  const handleChangeHighLowCheckBox = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value } = e.target;
    if (exchangeFromData.find((p) => p.exchangeId === value) !== undefined) {
      setFormData((prev) => {
        const isChecked = prev.highLowBetweenTradeLimit.includes(value);
        const updatedCheckdata = isChecked
          ? prev.highLowBetweenTradeLimit.filter((item) => item !== value)
          : [...prev.highLowBetweenTradeLimit, value];
        return { ...prev, highLowBetweenTradeLimit: updatedCheckdata };
      });
    }
  };

  const handleChangeFreshLimit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleChangeBLCFValue = (
    e: React.ChangeEvent<HTMLInputElement>,
    keyname: string,
    datae: ExchangeGroupData
  ) => {
    const { value } = e.target;
    const exId = datae.exchangeId;
    if (exchangeFromData.length !== 0) {
      setExchangeFromData((prevState) => {
        const exchangeIndex = prevState.findIndex((p) => p.exchangeId === exId);
        if (exchangeIndex > -1) {
          const updatedArray = exchangeGroupData.map((item) =>
            item["exchangeId"] === exId
              ? {
                  ...item,
                  exchangeFromData: {
                    ...item.exchangeFromData,
                    [keyname]: parseInt(value),
                  },
                }
              : item
          );
          setExchangeGroupData(updatedArray);

          const updatedProduct = {
            ...prevState[exchangeIndex],
            [keyname]: parseInt(value),
          };

          return [
            ...prevState.slice(0, exchangeIndex),
            updatedProduct,
            ...prevState.slice(exchangeIndex + 1),
          ];
        }
        return prevState;
      });
    }
  };

  const handleChangeGroupSelect = (
    groupId: string | undefined,
    exchangeId: string
  ) => {
    // Update exchangeFromData entry for the exchange (if present)
    setExchangeFromData((prev) => {
      const idx = prev.findIndex((p) => p.exchangeId === exchangeId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], groupId };
      return updated;
    });

    // Also reflect the change in exchangeGroupData so the UI row stays consistent
    setExchangeGroupData((prev) =>
      prev.map((item) =>
        item.exchangeId === exchangeId
          ? {
              ...item,
              exchangeFromData: {
                ...(((item.exchangeFromData as ExchangeData) ||
                  {}) as ExchangeData),
                groupId,
              } as ExchangeData,
            }
          : item
      )
    );
  };

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
        toast.error("Brokerage exceeds your available downline share.");
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: v,
        brkSharingDownLine: 100 - v,
      }));
    }
  };

  const handleToggleChange = (e: any) =>
    setIsPLSharing(e.target.value === "plSharing");

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        return toast.error("Please upload an image file (PNG/JPG/WebP).");
      }
      const maxMB = 2;
      if (file.size > maxMB * 1024 * 1024) {
        return toast.error(`Logo too large. Max ${maxMB}MB allowed.`);
      }
      const dataUrl = await fileToBase64(file);
      setFormData((prev) => ({ ...prev, brandLogoBase64: dataUrl }));
      setLogoPreview(dataUrl);
      toast.info("Logo added.");
    } catch {
      toast.error("Failed to read logo file.");
    }
  };

  const clearLogo = () => {
    setFormData((prev) => ({ ...prev, brandLogoBase64: "" }));
    setLogoPreview("");
    toast.info("Logo removed.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (!formData.name || !formData.allowedDevices) {
        toast.error("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      // Password validation only if password is provided
      if (formData.password && formData.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        setIsLoading(false);
        return;
      }

      if (formData.password && formData.password !== formData.retype_password) {
        toast.error("Password and Retype Password don't match");
        setIsLoading(false);
        return;
      }

      if (formData.role === MASTER) {
        if (
          !formData.domain ||
          !formData.title ||
          !formData.mainDomain ||
          !formData.minimumDeposit ||
          !formData.maximumDeposit ||
          !formData.minimumWithdraw ||
          !formData.maximumWithdraw ||
          formData.minimumDeposit === 0 ||
          formData.maximumDeposit === 0 ||
          formData.minimumWithdraw === 0 ||
          formData.maximumWithdraw === 0
        ) {
          toast.error("Please fill in all required fields");
          setIsLoading(false);
          return;
        }

        for (const iteds of exchangeFromData) {
          if (
            !iteds.leverage ||
            iteds.leverage === 0 ||
            !iteds.newPositionSquareOffTimeLimit ||
            iteds.newPositionSquareOffTimeLimit === 0 ||
            !iteds.carryForwardMarginAmount ||
            iteds.carryForwardMarginAmount === 0
          ) {
            toast.error("Please fill in all exchange fields");
            setIsLoading(false);
            return;
          }
          if (!iteds.isTurnoverWise && !iteds.isSymbolWise) {
            toast.error("Please select brokerage type");
            setIsLoading(false);
            return;
          }
          if (parseFloat(iteds.carryForwardMarginAmount.toString()) > 100) {
            toast.error("Carry Forward Margin Amount must be less than 100%");
            setIsLoading(false);
            return;
          }
        }

        if (parseFloat(formData.autoSquareOffPercentage.toString()) > 100) {
          toast.error("Auto Square Off Percentage must be less than 100%");
          setIsLoading(false);
          return;
        }

        if (parseFloat(formData.autoSquareOffPercentage.toString()) <= 0) {
          toast.error("Auto Square Off Percentage must be greater than 0%");
          setIsLoading(false);
          return;
        }
      }

      if (formData.role === ADMIN) {
        if (
          formData.cmpOrder === undefined ||
          formData.manualOrder === undefined ||
          formData.deleteTrade === undefined ||
          formData.cancelTrade === undefined ||
          formData.executePendingOrder === undefined ||
          formData.onlyView === undefined
        ) {
          toast.error("Please fill in all admin fields");
          setIsLoading(false);
          return;
        }
      }

      // Get device info
      const { deviceType, browser, userAgent, newDeviceId, ip } =
        await getDeviceInfo();

      // Prepare form data - MATCHING CREATE FORM PAYLOAD
      let formdat: any = {
        userId: formData.userId,
        role: formData.role,
        name: formData.name,
        allowedDevices: formData.allowedDevices,
        depositWithdrawAtsSystem: formData.depositWithdrawAtsSystem,
        brkSharing: formData.brkSharing,
        brkSharingDownLine: formData.brkSharingDownLine,
        freshLimitSL: formData.freshLimitSL,
        loginBy: "Web",
        browser,
        userAgent,
        deviceId: newDeviceId,
        deviceType,
        ipAddress: ip,
        additionalDevices: formData.additionalDevices,
        allowMultiLogin: formData.allowMultiLogin,
        maxConcurrentDevices: formData.maxConcurrentDevices,
        onLimitPolicy: formData.onLimitPolicy,
      };

      // Add phone if provided
      if (formData.phone) {
        formdat.phone = formData.phone;
      }

      // Add password if provided
      if (formData.password) {
        formdat.password = formData.password;
      }

      // Add selected user if provided
      if (formData.selectedUserId) {
        formdat.selectedUserId = formData.selectedUserId;
      }

      // Add parent ID if provided
      if (formData.parentId) {
        formdat.parentId = formData.parentId;
      }

      // Add office users if provided
      if (formData.officeUsers && formData.officeUsers.length > 0) {
        formdat.officeUsers = formData.officeUsers;
      }

      if (formData.role === CLIENT) {
        const creatorRole = (authenticated as any)?.role || "";

        if (
          creatorRole === SUPER_ADMIN &&
          !formData.parentId &&
          !formData.brokerId
        ) {
          setIsLoading(false);
          return toast.error("Please assign this client to a user/office.");
        }

        if (formData.parentId) {
          formdat.parentId = formData.parentId;
        }
        if (formData.brokerId) {
          formdat.brokerId = formData.brokerId;
        }

        formdat.isB2B = formData.isB2B;
        if (!formData.isB2B) {
          formdat.minimumDeposit = formData.minimumDeposit;
          formdat.maximumDeposit = formData.maximumDeposit;
          formdat.minimumWithdraw = formData.minimumWithdraw;
          formdat.maximumWithdraw = formData.maximumWithdraw;
        }

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
        formdat.domain = formData.domain || "Domain";
        formdat.mainDomain = formData.mainDomain || "mainDomain";
        formdat.title = formData.name || "Demo-Master";
        formdat.isB2B = formData.isB2B;

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
        formdat.parentId = formData.parentId;
      }

      if (formData.role === OFFICE) {
        formdat.brkSharing = formData.brkSharing;
        formdat.brkSharingDownLine = formData.brkSharingDownLine;
        formdat.profitAndLossSharing =
          (authenticated as User)?.brkSharingDownLine ?? 0;
        formdat.profitAndLossSharingDownLine = 0;
        formdat.officeUsers = formData.officeUsers || [];
      }

      // Submit to API
      let formDataParam = encryptData(formdat);
      formDataParam = JSON.stringify({ data: formDataParam });

      const response = await apiClient.post(
        ADMIN_API_ENDPOINT + EDIT_USER,
        formDataParam,
        {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType: deviceType,
          },
        }
      );

      if (response.data.statusCode === SUCCESS) {
        toast.success("User updated successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update user");
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const digitsOnly = (s: string) => s.replace(/\D+/g, "");
  const stripLeadingZeros = (s: string) => s.replace(/^0+(?=\d)/, "");

  // Re-usable Exchange Configuration block (Admin/Master/Client)
  const ExchangeConfigBlock = ({
    title,
    compactForClient = false,
  }: {
    title: string;
    compactForClient?: boolean;
  }) => (
    <>
      <CardTitle className="text-[#fcd535]">{title}</CardTitle>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-5 text-[#fcd535]">
                <Checkbox
                  checked={checkAllCheckBox}
                  onCheckedChange={handleChangeExAllCheckBox}
                  className="bg-[#2a2f36] border-[#fcd535]"
                />
              </TableHead>
              <TableHead className="text-[#fcd535]">Exchange</TableHead>
              <TableHead className="text-[#fcd535]">
                Turnoverwise Brk.
              </TableHead>
              <TableHead className="text-[#fcd535]">Symbolwise Brk.</TableHead>
              <TableHead className="text-[#fcd535]">Brokerage %</TableHead>
              <TableHead className="text-[#fcd535]">Leverage</TableHead>
              <TableHead className="text-[#fcd535]">
                Carry Forward Margin
              </TableHead>
              <TableHead className="text-[#fcd535]">
                New Position Square Off Time Limit
              </TableHead>
              <TableHead className="text-[#fcd535]">Select Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exchangeGroupData.map((datae, index) => {
              const selected = exchangeFromData.find(
                (p) => p.exchangeId === datae.exchangeId
              );
              const isTurnoverWise = Boolean(selected?.isTurnoverWise);
              const isSymbolWise = Boolean(selected?.isSymbolWise);
              const brokerageValue = isTurnoverWise
                ? selected?.brokerageTurnoverwise ?? 0
                : isSymbolWise
                ? selected?.brokerageSymbolwiseAmount ?? 0
                : 0;

              const disableInputs = !selected || compactForClient;

              return (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox
                      checked={!!selected}
                      onCheckedChange={() =>
                        handleToChangeExchangeCheckBox(datae.exchangeId, datae)
                      }
                      className="bg-[#2a2f36] border-[#fcd535]"
                    />
                  </TableCell>
                  <TableCell className="text-[#848E9C]">{datae.name}</TableCell>
                  <TableCell>
                    <Checkbox
                      disabled={disableInputs}
                      checked={isTurnoverWise}
                      onCheckedChange={() =>
                        setExchangeFromData((prev) => {
                          const idx = prev.findIndex(
                            (p) => p.exchangeId === datae.exchangeId
                          );
                          if (idx === -1) return prev;
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            isTurnoverWise: true,
                            isSymbolWise: false,
                          };
                          return updated;
                        })
                      }
                      className="bg-[#2a2f36] border-[#fcd535]"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      disabled={disableInputs}
                      checked={isSymbolWise}
                      onCheckedChange={() =>
                        setExchangeFromData((prev) => {
                          const idx = prev.findIndex(
                            (p) => p.exchangeId === datae.exchangeId
                          );
                          if (idx === -1) return prev;
                          const updated = [...prev];
                          updated[idx] = {
                            ...updated[idx],
                            isTurnoverWise: false,
                            isSymbolWise: true,
                          };
                          return updated;
                        })
                      }
                      className="bg-[#2a2f36] border-[#fcd535]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      disabled={disableInputs}
                      type="number"
                      min={0}
                      value={brokerageValue}
                      onChange={(e) =>
                        handleChangeBLCFValue(
                          e,
                          isTurnoverWise
                            ? "brokerageTurnoverwise"
                            : "brokerageSymbolwiseAmount",
                          datae
                        )
                      }
                      className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      disabled={disableInputs}
                      type="number"
                      min={0}
                      value={selected?.leverage ?? 0}
                      onChange={(e) =>
                        handleChangeBLCFValue(e, "leverage", datae)
                      }
                      className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      disabled={disableInputs}
                      type="number"
                      min={0}
                      value={selected?.carryForwardMarginAmount ?? 0}
                      onChange={(e) =>
                        handleChangeBLCFValue(
                          e,
                          "carryForwardMarginAmount",
                          datae
                        )
                      }
                      className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      disabled={disableInputs}
                      type="number"
                      min={0}
                      value={selected?.newPositionSquareOffTimeLimit ?? 0}
                      onChange={(e) =>
                        handleChangeBLCFValue(
                          e,
                          "newPositionSquareOffTimeLimit",
                          datae
                        )
                      }
                      className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
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
                                    g.exchangeId === datae.exchangeId &&
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
                        .filter((e) => e.exchangeId === datae.exchangeId)
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
                          backgroundColor: isFocused ? "#3a3f46" : "#2a2f36",
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
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-6xl max-h-[90vh] overflow-y-auto bg-[#1e2329] border border-[#2a2f36]">
        <DialogHeader>
          <DialogTitle className="text-[#fcd535] flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User: {user?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Top grid - Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Role */}
              <div>
                <Label htmlFor="role" className="text-[#848E9C]">
                  User Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={roleFormData}
                  onChange={handleRoleChange}
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

              {/* User Search for ADMIN, SUPER_ADMIN, MASTER */}
              {canSeeUserSearch &&
                ![ADMIN, MASTER].includes(formData.role) && (
                  <div>
                    <Label htmlFor="userSelect" className="text-[#848E9C]">
                      Assign / Select User
                    </Label>
                    <ReactSelect
                      inputId="userSelect"
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
                          selectedUserId: (opt as any)?.value || "",
                        }));
                      }}
                      options={userOptions}
                      isLoading={userLoading}
                      placeholder="Search user..."
                      isClearable
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
              <div>
                <Label htmlFor="name" className="text-[#848E9C]">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-[#848E9C]">
                  Mobile Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => {
                    const cleaned = stripLeadingZeros(
                      digitsOnly(e.target.value)
                    ).slice(0, 10);
                    setFormData((p) => ({ ...p, phone: cleaned }));
                  }}
                  maxLength={10}
                  className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-[#848E9C]">
                  Password (Leave empty to keep current)
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={togglePassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-[#181a20] border-[#3a3f47] text-[#fcd535] pr-16"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-full px-3 py-2 bg-[#2a2f36] border-l border-[#3a3f47] text-[#848E9C]"
                    onClick={() => setTogglePassword(!togglePassword)}
                  >
                    {togglePassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              {/* Retype Password */}
              <div>
                <Label htmlFor="retype_password" className="text-[#848E9C]">
                  Retype Password
                </Label>
                <div className="relative">
                  <Input
                    id="retype_password"
                    name="retype_password"
                    type={ctogglePassword ? "text" : "password"}
                    value={formData.retype_password}
                    onChange={handleChange}
                    className="bg-[#181a20] border-[#3a3f47] text-[#fcd535] pr-16"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-full px-3 py-2 bg-[#2a2f36] border-l border-[#3a3f47] text-[#848E9C]"
                    onClick={() => setCTogglePassword(!ctogglePassword)}
                  >
                    {ctogglePassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              {/* Allowed Devices */}
              <div>
                <Label htmlFor="allowedDevices" className="text-[#848E9C]">
                  Allowed Devices For Login{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="allowedDevices"
                  name="allowedDevices"
                  type="number"
                  min={1}
                  value={formData.allowedDevices}
                  onChange={(e) => {
                    const cleaned = stripLeadingZeros(e.target.value);
                    setFormData((p: any) => ({
                      ...p,
                      allowedDevices: cleaned === "" ? "" : Number(cleaned),
                    }));
                  }}
                  className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                  required
                />
              </div>

              {/* Client-specific fields */}
              {formData.role === CLIENT && (
                <div>
                  <Label htmlFor="brokerId" className="text-[#848E9C]">
                    Select Office
                  </Label>
                  <Select
                    value={brokerFormData}
                    onChange={handleBrokerChange}
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
              )}
            </div>

            {/* Role-based caps */}
            {[SUPER_ADMIN, ADMIN, MASTER].includes(formData.role) && (
              <div>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {formData.role === SUPER_ADMIN && (
                      <div>
                        <Label htmlFor="maxAdmin" className="text-[#848E9C]">
                          Max Admins (-1 for unlimited)
                        </Label>
                        <Input
                          id="maxAdmin"
                          name="maxAdmin"
                          type="number"
                          min={-1}
                          value={formData.maxAdmin ?? 0}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              maxAdmin:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            }))
                          }
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        />
                      </div>
                    )}

                    {formData.role === ADMIN && (
                      <>
                        <div>
                          <Label
                            htmlFor="maxMasters"
                            className="text-[#848E9C]"
                          >
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
                              setFormData((prev: any) => ({
                                ...prev,
                                maxMaster:
                                  cleaned === ""
                                    ? ""
                                    : Number(cleaned) < -1
                                    ? -1
                                    : Number(cleaned),
                              }));
                            }}
                            className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxBroker" className="text-[#848E9C]">
                            Max Brokers (-1 for unlimited)
                          </Label>
                          <Input
                            id="maxBroker"
                            name="maxBroker"
                            type="number"
                            min={-1}
                            value={formData.maxBroker ?? ""}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(
                                /^0+(?=\d)/,
                                ""
                              );
                              setFormData((prev: any) => ({
                                ...prev,
                                maxBroker:
                                  cleaned === ""
                                    ? ""
                                    : Number(cleaned) < -1
                                    ? -1
                                    : Number(cleaned),
                              }));
                            }}
                            className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          />
                        </div>
                      </>
                    )}

                    {formData.role === MASTER && (
                      <div>
                        <Label htmlFor="maxUser" className="text-[#848E9C]">
                          Max Users (-1 for unlimited)
                        </Label>
                        <Input
                          id="maxUser"
                          name="maxUser"
                          type="number"
                          min={-1}
                          value={formData.maxUser ?? ""}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              maxUser:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            }))
                          }
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        />
                      </div>
                    )}

                    {formData.role === ADMIN && (
                      <div>
                        <Label
                          htmlFor="forwardBalance"
                          className="text-[#848E9C]"
                        >
                          Forward Balance
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="forwardBalance"
                          name="forwardBalance"
                          type="number"
                          min={-1}
                          value={formData.forwardBalance || ""}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              forwardBalance:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            }))
                          }
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            )}

            {/* OFFICE Users Selection */}
            {formData.role === OFFICE && (
              <div className="space-y-2 rounded-md ">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="officeUsers" className="text-[#848E9C]">
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

            {/* Role-specific fields */}
            {formData.role === ADMIN && (
              <Card className="bg-[#252a30] border border-[#3a3f47]">
                <CardHeader>
                  <CardTitle className="text-[#fcd535]">
                    Admin Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        id="cmpOrder"
                        name="cmpOrder"
                        type="checkbox"
                        checked={formData.cmpOrder === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cmpOrder: e.target.checked ? 1 : 0,
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="cmpOrder" className="text-[#848E9C]">
                        CMP Order
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="manualOrder"
                        name="manualOrder"
                        type="checkbox"
                        checked={formData.manualOrder === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            manualOrder: e.target.checked ? 1 : 0,
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="manualOrder" className="text-[#848E9C]">
                        Manual Order
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="deleteTrade"
                        name="deleteTrade"
                        type="checkbox"
                        checked={formData.deleteTrade === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            deleteTrade: e.target.checked ? 1 : 0,
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="deleteTrade" className="text-[#848E9C]">
                        Delete Trade
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="cancelTrade"
                        name="cancelTrade"
                        type="checkbox"
                        checked={formData.cancelTrade === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cancelTrade: e.target.checked ? 1 : 0,
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="cancelTrade" className="text-[#848E9C]">
                        Cancel Trade
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="executePendingOrder"
                        name="executePendingOrder"
                        type="checkbox"
                        checked={formData.executePendingOrder === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            executePendingOrder: e.target.checked ? 1 : 0,
                          })
                        }
                        className="rounded"
                      />
                      <Label
                        htmlFor="executePendingOrder"
                        className="text-[#848E9C]"
                      >
                        Execute Pending Order
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        id="onlyView"
                        name="onlyView"
                        type="checkbox"
                        checked={formData.onlyView === 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            onlyView: e.target.checked ? 1 : 0,
                          })
                        }
                        className="rounded"
                      />
                      <Label htmlFor="onlyView" className="text-[#848E9C]">
                        Only View
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* White Label Settings for Admin */}
            {formData.role === ADMIN && (
              <Card className="bg-[#252a30] border border-[#3a3f47]">
                <CardHeader>
                  <CardTitle className="text-[#fcd535]">
                    White Label Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="title" className="text-[#848E9C]">
                        Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        type="text"
                        value={formData.title}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="mainDomain" className="text-[#848E9C]">
                        Main Domain <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="mainDomain"
                        name="mainDomain"
                        type="text"
                        value={formData.mainDomain}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="domain" className="text-[#848E9C]">
                        Sub Domain <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="domain"
                        name="domain"
                        type="text"
                        value={formData.domain}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="supportEmail" className="text-[#848E9C]">
                        Support Email
                      </Label>
                      <Input
                        id="supportEmail"
                        name="supportEmail"
                        type="email"
                        value={formData.supportEmail}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="brandColor" className="text-[#848E9C]">
                        Brand Color
                      </Label>
                      <Input
                        id="brandColor"
                        name="brandColor"
                        type="color"
                        value={formData.brandColor}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] h-10"
                      />
                    </div>

                    <div>
                      <Label htmlFor="brandLogo" className="text-[#848E9C]">
                        Brand Logo (PNG/JPG/WebP, ≤ 2MB)
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="brandLogo"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleLogoChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        />
                        {logoPreview || formData.brandLogoBase64 ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={logoPreview || formData.brandLogoBase64}
                              alt="Logo preview"
                              className="h-10 w-10 rounded border"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={clearLogo}
                              className="bg-[#2a2f36] border-[#3a3f47] text-[#848E9C]"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-[#848E9C]">
                            If empty, UI can just show the Title.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-md border border-[#3a3f47]">
                      <Label className="text-[#848E9C]">
                        Allow updating Brokerage, Leverage & Carry Forward
                        Margin
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
                            className="bg-[#2a2f36] border-[#3a3f47]"
                          />
                          <Label
                            htmlFor="isAllowBrkLevUpdateYes"
                            className="text-[#848E9C]"
                          >
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="0"
                            id="isAllowBrkLevUpdateNo"
                            className="bg-[#2a2f36] border-[#3a3f47]"
                          />
                          <Label
                            htmlFor="isAllowBrkLevUpdateNo"
                            className="text-[#848E9C]"
                          >
                            No
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="p-3 rounded-md border border-[#3a3f47]">
                      <Label htmlFor="freshLimitSL" className="text-[#848E9C]">
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
                          className="bg-[#2a2f36] border-[#3a3f47]"
                        />
                        <Label
                          htmlFor="freshLimitSL"
                          className="text-[#848E9C]"
                        >
                          Enable Fresh Limit SL
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Master Settings */}
            {formData.role === MASTER && (
              <>
                <Card className="bg-[#252a30] border border-[#3a3f47]">
                  <CardHeader>
                    <CardTitle className="text-[#fcd535]">
                      Master Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="title" className="text-[#848E9C]">
                          Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          type="text"
                          value={formData.title}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="mainDomain" className="text-[#848E9C]">
                          Main Domain <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="mainDomain"
                          name="mainDomain"
                          type="text"
                          value={formData.mainDomain}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="domain" className="text-[#848E9C]">
                          Sub Domain <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="domain"
                          name="domain"
                          type="text"
                          value={formData.domain}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="autoSquareOffPercentage"
                          className="text-[#848E9C]"
                        >
                          Auto Square Off Percentage{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="autoSquareOffPercentage"
                          name="autoSquareOffPercentage"
                          type="number"
                          min="0"
                          value={formData.autoSquareOffPercentage}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="minimumDeposit"
                          className="text-[#848E9C]"
                        >
                          Minimum Deposit{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="minimumDeposit"
                          name="minimumDeposit"
                          type="number"
                          min="0"
                          value={formData.minimumDeposit}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="maximumDeposit"
                          className="text-[#848E9C]"
                        >
                          Maximum Deposit{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="maximumDeposit"
                          name="maximumDeposit"
                          type="number"
                          min="0"
                          value={formData.maximumDeposit}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="minimumWithdraw"
                          className="text-[#848E9C]"
                        >
                          Minimum Withdraw{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="minimumWithdraw"
                          name="minimumWithdraw"
                          type="number"
                          min="0"
                          value={formData.minimumWithdraw}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="maximumWithdraw"
                          className="text-[#848E9C]"
                        >
                          Maximum Withdraw{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="maximumWithdraw"
                          name="maximumWithdraw"
                          type="number"
                          min="0"
                          value={formData.maximumWithdraw}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="forwardBalance"
                          className="text-[#848E9C]"
                        >
                          Forward Balance
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="forwardBalance"
                          name="forwardBalance"
                          type="number"
                          min={-1}
                          value={formData.forwardBalance || ""}
                          onChange={(e) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              forwardBalance:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            }))
                          }
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="defaultLeverage"
                          className="text-[#848E9C]"
                        >
                          Default Leverage
                        </Label>
                        <Input
                          id="defaultLeverage"
                          name="defaultLeverage"
                          type="number"
                          min="0"
                          value={formData.defaultLeverage}
                          onChange={handleChange}
                          className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          id="isAllowBrkLevUpdate"
                          name="isAllowBrkLevUpdate"
                          type="checkbox"
                          checked={formData.isAllowBrkLevUpdate === 1}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isAllowBrkLevUpdate: e.target.checked ? 1 : 0,
                            })
                          }
                          className="rounded"
                        />
                        <Label
                          htmlFor="isAllowBrkLevUpdate"
                          className="text-[#848E9C]"
                        >
                          Allow To Update Brokerage, Leverage And Carry Forward
                          Margin
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          id="depositWithdrawAtsSystem"
                          name="depositWithdrawAtsSystem"
                          type="checkbox"
                          checked={formData.depositWithdrawAtsSystem === 1}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              depositWithdrawAtsSystem: e.target.checked
                                ? 1
                                : 0,
                            })
                          }
                          className="rounded"
                        />
                        <Label
                          htmlFor="depositWithdrawAtsSystem"
                          className="text-[#848E9C]"
                        >
                          ATS System
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          id="isB2B"
                          name="isB2B"
                          type="checkbox"
                          checked={formData.isB2B}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isB2B: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <Label htmlFor="isB2B" className="text-[#848E9C]">
                          Is B2B
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          id="freshLimitSL"
                          name="freshLimitSL"
                          type="checkbox"
                          checked={formData.freshLimitSL}
                          onChange={handleChangeFreshLimit}
                          className="rounded"
                        />
                        <Label
                          htmlFor="freshLimitSL"
                          className="text-[#848E9C]"
                        >
                          Fresh Limit SL
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#252a30] border border-[#3a3f47]">
                  <CardHeader>
                    <CardTitle className="text-[#fcd535]">
                      High Low Between Limit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      {exchangeGroupData.map((datae, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 p-2 rounded-md border border-[#3a3f47]"
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
                            className="bg-[#2a2f36] border-[#fcd535]"
                          />
                          <Label
                            htmlFor={`highLow-${index}`}
                            className="text-[#848E9C]"
                          >
                            {datae.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Client Settings */}
            {formData.role === CLIENT && (
              <Card className="bg-[#252a30] border border-[#3a3f47]">
                <CardHeader>
                  <CardTitle className="text-[#fcd535]">
                    Client Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="minimumDeposit"
                        className="text-[#848E9C]"
                      >
                        Minimum Deposit
                      </Label>
                      <Input
                        id="minimumDeposit"
                        name="minimumDeposit"
                        type="number"
                        min={0}
                        value={formData.minimumDeposit}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="maximumDeposit"
                        className="text-[#848E9C]"
                      >
                        Maximum Deposit
                      </Label>
                      <Input
                        id="maximumDeposit"
                        name="maximumDeposit"
                        type="number"
                        min={0}
                        value={formData.maximumDeposit}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="minimumWithdraw"
                        className="text-[#848E9C]"
                      >
                        Minimum Withdraw
                      </Label>
                      <Input
                        id="minimumWithdraw"
                        name="minimumWithdraw"
                        type="number"
                        min={0}
                        value={formData.minimumWithdraw}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="maximumWithdraw"
                        className="text-[#848E9C]"
                      >
                        Maximum Withdraw
                      </Label>
                      <Input
                        id="maximumWithdraw"
                        name="maximumWithdraw"
                        type="number"
                        min={0}
                        value={formData.maximumWithdraw}
                        onChange={handleChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-md border border-[#3a3f47]">
                      <Label htmlFor="freshLimitSL" className="text-[#848E9C]">
                        Fresh Limit SL <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id="freshLimitSL"
                          checked={formData.freshLimitSL}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              freshLimitSL: Boolean(checked),
                            }))
                          }
                          className="bg-[#2a2f36] border-[#3a3f47]"
                        />
                        <Label
                          htmlFor="freshLimitSL"
                          className="text-[#848E9C]"
                        >
                          Enable Fresh Limit SL
                        </Label>
                      </div>
                    </div>

                    <div className="p-3 rounded-md border border-[#3a3f47]">
                      <Label htmlFor="liquadation" className="text-[#848E9C]">
                        Liquadation <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id="liquadation"
                          checked={formData.liquadation}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              liquadation: Boolean(checked),
                            }))
                          }
                          className="bg-[#2a2f36] border-[#3a3f47]"
                        />
                        <Label htmlFor="liquadation" className="text-[#848E9C]">
                          Enable Liquadation
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Brokerage and P/L Sharing */}
            {[MASTER, BROKER, ADMIN, OFFICE].includes(formData.role) && (
              <Card className="bg-[#252a30] border border-[#3a3f47]">
                <CardHeader>
                  <CardTitle className="text-[#fcd535]">
                    Brokerage & Financial Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brkSharing" className="text-[#848E9C]">
                        Brokerage Sharing (%){" "}
                        <span className="text-red-500">*</span>
                        <p className="text-sm text-[#848E9C]">
                          Our: {formData.brkSharing} | Down Line:{" "}
                          {formData.brkSharingDownLine}
                        </p>
                      </Label>
                      <Input
                        id="brkSharing"
                        name="brkSharing"
                        type="number"
                        min={0}
                        value={formData.brkSharing}
                        onChange={handleBrkSharingChange}
                        className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                      />
                    </div>

                    <div>
                      <Label className="text-[#848E9C]">
                        P/L Sharing or SaaS Mode
                      </Label>
                      <div className="flex items-center gap-6 mt-2">
                        <label className="inline-flex items-center gap-2 text-[#848E9C]">
                          <input
                            type="radio"
                            name="mode"
                            value="plSharing"
                            checked={isPLSharing}
                            onChange={handleToggleChange}
                          />
                          <span>P/L Sharing</span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-[#848E9C]">
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
                        <div className="mt-3">
                          <Input
                            id="profitAndLossSharing"
                            name="profitAndLossSharing"
                            type="number"
                            min={0}
                            value={formData.profitAndLossSharing}
                            onChange={handleProfitAndLossChange}
                            className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          />
                        </div>
                      ) : (
                        <div className="mt-3">
                          <Input
                            id="saasModeValue"
                            name="saasModeValue"
                            type="number"
                            min={0}
                            value={formData.saasModeValue ?? ""}
                            onChange={(e) =>
                              setFormData((prev: any) => ({
                                ...prev,
                                saasModeValue: e.target.value,
                              }))
                            }
                            className="bg-[#181a20] border-[#3a3f47] text-[#fcd535]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exchange Configuration for ADMIN / MASTER / CLIENT */}
            {[ADMIN, MASTER, CLIENT].includes(formData.role) && (
              <Card className="bg-[#252a30] border border-[#3a3f47]">
                <CardHeader>
                  <ExchangeConfigBlock
                    title="Exchange Configuration"
                    compactForClient={formData.role === CLIENT}
                  />
                </CardHeader>
              </Card>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#3a3f47] text-[#848E9C]"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#fcd535] text-[#181a20]"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}