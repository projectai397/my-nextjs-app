"use client";

import React, {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
} from "react";
import Select from "react-select";
import apiClient from "@/lib/axiosInstance";
import { useDispatch, useSelector } from "react-redux";

import {
  ADMIN_API_ENDPOINT,
  USER_WISE_PROFIT_LOSS_LIST,
  SUCCESS,
  CLIENT,
  USER_SEARCH_LIST,
} from "@/constant/index";
import { encryptData, decryptData } from "@/hooks/crypto";
import { getCurrentWeekRange } from "@/hooks/dateUtils";
import { toastError } from "@/hooks/toastMsg";
import { addItem } from "@/hooks/arraySlice";
import { useWebSocket } from "@/components/socket/WebSocketProvider";
import webSocketManager from "@/components/socket/WebSocketManager";

type RootState = { array: string[] };

type TickData = { data?: { symbol: string; bid: number; ask: number } };

type SelectOption = { label: string; value: string };

type ChildPosition = {
  symbolName: string;
  tradeType: string;
  totalQuantity: number;
  price: number;
  m2m?: number;
};

type SymbolQuote = { name: string; bid: number; ask: number };

type RowItem = {
  userId: string;
  role: number | string;
  userName: string;
  name?: string;

  totalDeposit: number;
  totalWithdraw: number;
  profitLoss?: number;
  childUserProfitLossTotal?: number;
  brokerageTotal?: number;
  childUserBrokerageTotal?: number;
  parentBrokerageTotal?: number;
  profitAndLossSharing?: number;
  profitAndLossSharingDownLine?: number;

  childUserDataPosition: ChildPosition[];
  symbolData: SymbolQuote[];

  // computed
  dwBalance?: number;
  netPLBalance?: number;
  m2mTotal?: number;
  rpl?: number;
  netpl?: number;
  our?: number;
};

type SortConfig = {
  key: keyof Partial<RowItem> | null;
  direction: "ascending" | "descending";
};

type Props = {
  userId: string; // parent passes clicked userId
};

const ChildList: React.FC<Props> = ({ userId }) => {
  const { tickData } = useWebSocket() as { tickData?: TickData };
  const dispatch = useDispatch();

  const deviceType =
    typeof window !== "undefined"
      ? localStorage.getItem("deviceType") || ""
      : "";
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const array = useSelector((state: RootState) => state.array);
  const localArrayRef = useRef<string[]>([...array]);

  const [plData, setPLData] = useState<RowItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 1000;

  const { startDate, endDate } = getCurrentWeekRange();
  const [totalCount, setTotalCount] = useState<number>(0);
  const [userData, setUserData] = useState<SelectOption[]>([]);
  const [formFilterData, setFormFilterData] = useState<{
    startDate: string;
    endDate: string;
    user: SelectOption[];
  }>({
    startDate,
    endDate,
    user: [],
  });

  const [searchInputValue, setSearchInputValue] = useState<string>("");

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const tableRef = useRef<HTMLTableElement | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    userName: 180,
    deposit: 150,
    withdrawal: 150,
    balance: 150,
    mtm: 150,
    rpl: 150,
    netBal: 150,
  });

  const handleMouseDown = (
    e: ReactMouseEvent<HTMLDivElement>,
    colKey: string
  ) => {
    const th = (e.target as HTMLDivElement)
      .parentElement as HTMLTableCellElement;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const newWidth = startWidth + (ev.clientX - startX);
      if (newWidth > 50)
        setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // search + sort
  const sortedPlData = useMemo(() => {
    let sortableItems = [...plData];

    if (searchInputValue.trim() !== "") {
      const q = searchInputValue.toLowerCase();
      sortableItems = sortableItems.filter((item) =>
        Object.values(item).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (sortConfig.key !== null) {
      sortableItems.sort((a: any, b: any) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [plData, sortConfig, searchInputValue]);

  const requestSort = (key: keyof RowItem) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const getSortIcon = (key: keyof RowItem) => {
    if (sortConfig.key !== key) return "fa fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa fa-sort-up"
      : "fa fa-sort-down";
  };

  const [totalDepositTotal, setTotalDepositTotal] = useState<string>("0.00");
  const [totalWithdrawTotal, setTotalWithdrawTotal] = useState<string>("0.00");
  const [dwBalanceTotal, setDwBalanceTotal] = useState<string>("0.00");
  const [m2mTotalTotal, setM2mTotalTotal] = useState<string>("0.00");
  const [rpTotal, setRpTotal] = useState<string>("0.00");
  const [netPLBalanceTotal, setNetPLBalanceTotal] = useState<string>("0.00");

  const handleReset = async () => {
    setFormFilterData((prev) => ({
      ...prev,
      user: [],
      startDate: "",
      endDate: "",
    }));
    setUserData([]);
    fetchDataFromAPI();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key?: string
  ) => {
    const { name, value } = e.target;
    setFormFilterData((prev) => ({ ...prev, [key || name]: value }));
  };

  const fetchOptions = async (inputValue: string) => {
    if (inputValue && 2 < inputValue.length) {
      try {
        const data = encryptData({
          filterType: 0,
          roleId: "",
          userId: "",
          status: 0,
          search: inputValue,
          page: 1,
          limit: 50,
        });
        const payload = JSON.stringify({ data });
        const response = await apiClient.post(
          ADMIN_API_ENDPOINT + USER_SEARCH_LIST,
          payload
        );
        if (response.data.statusCode === SUCCESS) {
          const rdata: Array<{ userName: string; userId: string }> =
            decryptData(response.data.data);
          const rRes: SelectOption[] = rdata.map((item) => ({
            label: item.userName,
            value: item.userId,
          }));
          setUserData(rRes);
        } else {
          toastError(response.data.message);
        }
      } catch (error: any) {
        toastError(error?.response?.data?.message || "Error");
        console.error("Search error:", error);
      }
    } else {
      setUserData([]);
    }
  };

  const handleInputChange = (inputValue: string) =>
    setSearchInputValue(inputValue);

  const handleChangeValueOption = (
    selectedOptions: readonly SelectOption[] | null,
    name: "user"
  ) => {
    setFormFilterData((prev) => ({
      ...prev,
      [name]: (selectedOptions ?? []) as SelectOption[],
    }));
  };

  const addSymbolNameInArray = async (symbolName: string) => {
    if (!localArrayRef.current.includes(symbolName)) {
      dispatch(addItem(symbolName));
      localArrayRef.current = [...localArrayRef.current, symbolName];
    }
  };

  const socketData = async (userPLDataN: RowItem[]) => {
    const newData = userPLDataN.map((userItem) => {
      const symbolData = userItem.symbolData || [];

      // compute M2M per position
      for (let i = 0; i < userItem.childUserDataPosition.length; i++) {
        const pos = userItem.childUserDataPosition[i];
        addSymbolNameInArray(pos.symbolName);
        const matchSymbol = symbolData.find((s) => s.name === pos.symbolName);
        if (!matchSymbol) {
          pos.m2m = 0;
          continue;
        }
        const px = Number(pos.price.toFixed(2));
        if (pos.tradeType === "SELL" && pos.totalQuantity > 0) {
          pos.m2m = (px - matchSymbol.ask) * pos.totalQuantity;
        } else if (pos.totalQuantity < 0) {
          pos.m2m = (matchSymbol.ask - px) * pos.totalQuantity;
        } else {
          pos.m2m = (matchSymbol.bid - px) * pos.totalQuantity;
        }
      }

      let m2mPln = 0;
      for (const p of userItem.childUserDataPosition)
        m2mPln += Number(p.m2m || 0);

      const ourP =
        userItem.role === CLIENT
          ? Number(userItem.profitAndLossSharingDownLine || 0)
          : Number(userItem.profitAndLossSharing || 0);

      const profitLoss =
        userItem.role === CLIENT
          ? Number(userItem.profitLoss || 0)
          : Number(userItem.childUserProfitLossTotal || 0);

      const brokerageTotal =
        userItem.role === CLIENT
          ? Number(userItem.brokerageTotal || 0)
          : Number(userItem.childUserBrokerageTotal || 0);

      const rTo = profitLoss - brokerageTotal;
      const netpl = m2mPln + rTo;

      let our = ((m2mPln + profitLoss) * ourP) / 100;
      our = our * -1 + Number(userItem.parentBrokerageTotal || 0);

      const dwBalanceNum =
        Number(userItem.totalDeposit) - Number(userItem.totalWithdraw);
      const netPLBalanceNum = dwBalanceNum + m2mPln + profitLoss;

      return {
        ...userItem,
        netpl,
        m2mTotal: m2mPln,
        our,
        rpl: profitLoss,
        dwBalance: dwBalanceNum,
        netPLBalance: netPLBalanceNum,
      };
    });

    setPLData(newData);
    // subscribe to all symbols we’ve queued
    webSocketManager.sendSymbols([...new Set(localArrayRef.current)]);
  };

  const fetchDataFromAPI = async () => {
    // local search only
    if (searchInputValue.trim() !== "") {
      const q = searchInputValue.toLowerCase();
      const filtered = plData.filter((item) =>
        Object.values(item).some((v) => String(v).toLowerCase().includes(q))
      );
      setPLData(filtered);
      setTotalCount(filtered.length);
      return;
    }

    setPLData([]); // when making API call

    try {
      const payload = encryptData({
        userId: formFilterData?.user?.[0]?.value
          ? formFilterData.user[0].value
          : userId,
        page: currentPage,
        limit: itemsPerPage,
        startDate: formFilterData.startDate,
        endDate: formFilterData.endDate,
        dwrStatus: 1,
      });

      const response = await apiClient.post(
        USER_WISE_PROFIT_LOSS_LIST,
        JSON.stringify({ data: payload })
      );

      if (response.data.statusCode === SUCCESS) {
        const userPLDataN: RowItem[] = decryptData(response.data.data);
        await socketData(userPLDataN);
        setTotalCount(response.data.meta.totalCount);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Error");
      console.error("Fetch error:", error);
    }
  };

  // live ticks
  useEffect(() => {
    const t = tickData?.data;
    if (!t) return;

    setPLData((prev) =>
      prev.map((userItem) => {
        let m2mPln = 0;
        const nextPositions = userItem.childUserDataPosition.map((pos) => {
          let nextM2M = pos.m2m ?? 0;
          if (pos.symbolName === t.symbol) {
            const px = Number(pos.price.toFixed(2));
            if (pos.tradeType === "SELL" && pos.totalQuantity > 0) {
              nextM2M = (px - Number(t.ask)) * pos.totalQuantity;
            } else if (pos.totalQuantity < 0) {
              nextM2M = (Number(t.ask) - px) * pos.totalQuantity;
            } else {
              nextM2M = (Number(t.bid) - px) * pos.totalQuantity;
            }
          }
          m2mPln += Number(nextM2M || 0);
          return { ...pos, m2m: nextM2M };
        });

        const ourP =
          userItem.role === CLIENT
            ? Number(userItem.profitAndLossSharingDownLine || 0)
            : Number(userItem.profitAndLossSharing || 0);

        const profitLoss =
          userItem.role === CLIENT
            ? Number(userItem.profitLoss || 0)
            : Number(userItem.childUserProfitLossTotal || 0);

        const brokerageTotal =
          userItem.role === CLIENT
            ? Number(userItem.brokerageTotal || 0)
            : Number(userItem.childUserBrokerageTotal || 0);

        const rTo = profitLoss - brokerageTotal;
        const netpl = m2mPln + rTo;

        let our = ((m2mPln + profitLoss) * ourP) / 100;
        our = our * -1 + Number(userItem.parentBrokerageTotal || 0);

        const dwBalanceNum =
          Number(userItem.totalDeposit) - Number(userItem.totalWithdraw);
        const netPLBalanceNum = dwBalanceNum + m2mPln + profitLoss;

        return {
          ...userItem,
          childUserDataPosition: nextPositions,
          netpl,
          m2mTotal: m2mPln,
          our,
          rpl: profitLoss,
          dwBalance: dwBalanceNum,
          netPLBalance: netPLBalanceNum,
        };
      })
    );
  }, [tickData]);

  // initial & paged fetch
  useEffect(() => {
    fetchDataFromAPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentPage]);

  // footer totals
  useEffect(() => {
    let depositTotal = 0;
    let withdrawTotal = 0;
    let dwBalanceTotalNum = 0;
    let m2mTotalNum = 0;
    let rpTotalNum = 0;
    let netPLBalanceTotalNum = 0;

    const items = sortedPlData.length ? sortedPlData : plData;

    items.forEach((item) => {
      depositTotal += Number(item.totalDeposit || 0);
      withdrawTotal += Number(item.totalWithdraw || 0);
      dwBalanceTotalNum += Number(item.dwBalance || 0);
      m2mTotalNum += Number(item.m2mTotal || 0);
      rpTotalNum +=
        item.role === CLIENT
          ? Number(item.profitLoss || 0)
          : Number(item.childUserProfitLossTotal || 0);
      netPLBalanceTotalNum += Number(item.netPLBalance || 0);
    });

    setTotalDepositTotal(depositTotal.toFixed(2));
    setTotalWithdrawTotal(withdrawTotal.toFixed(2));
    setDwBalanceTotal(dwBalanceTotalNum.toFixed(2));
    setM2mTotalTotal(m2mTotalNum.toFixed(2));
    setRpTotal(rpTotalNum.toFixed(2));
    setNetPLBalanceTotal(netPLBalanceTotalNum.toFixed(2));
  }, [sortedPlData, plData]);

  return (
    <Fragment>
      <style>{`
        .resizer { position: absolute; top: 0; right: 0; width: 5px; cursor: col-resize; user-select: none; height: 100%; }
        th { position: relative; }
      `}</style>

      {/* Filters (compact for bottom sheet) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-yellow-400">
            From Date
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="startDate"
            name="startDate"
            type="date"
            value={formFilterData.startDate}
            onChange={(e) => handleChange(e, "startDate")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-yellow-400">To Date</label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="endDate"
            name="endDate"
            type="date"
            value={formFilterData.endDate}
            onChange={(e) => handleChange(e, "endDate")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-yellow-400 ">
            User Name
          </label>
          <Select
            value={formFilterData.user}
            onChange={(opts) =>
              handleChangeValueOption(opts as SelectOption[] | null, "user")
            }
            options={userData}
            onInputChange={(value, meta) => {
              if (meta.action === "input-change") {
                setSearchInputValue(value);
                fetchOptions(value);
              }
            }}
            isSearchable
            isMulti={false}
            placeholder="Type to search..."
            noOptionsMessage={() => null}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            className="btn btn_my_2 w-full md:w-auto px-3 py-2 bg-yellow-400 rounded-md"
            onClick={fetchDataFromAPI}
          >
            View
          </button>
          <button
            className="btn btn-danger w-full md:w-auto px-3 py-2 bg-yellow-400 rounded-md"
            onClick={handleReset}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border-t">
        <table ref={tableRef} className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th
                style={{ width: colWidths.userName }}
                className="px-3 py-2 text-left font-medium cursor-pointer"
                onClick={() => requestSort("userName" as keyof RowItem)}
              >
                USER NAME{" "}
                <i className={getSortIcon("userName" as keyof RowItem)} />
                <div
                  className="resizer"
                  onMouseDown={(e) => handleMouseDown(e, "userName")}
                />
              </th>
              <th
                style={{ width: colWidths.deposit }}
                className="px-3 py-2 text-right font-medium cursor-pointer"
                onClick={() => requestSort("totalDeposit")}
              >
                DEPOSIT <i className={getSortIcon("totalDeposit")} />
                <div
                  className="resizer"
                  onMouseDown={(e) => handleMouseDown(e, "deposit")}
                />
              </th>
              <th
                style={{ width: colWidths.withdrawal }}
                className="px-3 py-2 text-right font-medium cursor-pointer"
                onClick={() => requestSort("totalWithdraw")}
              >
                WITHDRWAL <i className={getSortIcon("totalWithdraw")} />
                <div
                  className="resizer"
                  onMouseDown={(e) => handleMouseDown(e, "withdrawal")}
                />
              </th>
              <th
                style={{ width: colWidths.balance }}
                className="px-3 py-2 text-right font-medium cursor-pointer"
                onClick={() => requestSort("dwBalance")}
              >
                BALANCE <i className={getSortIcon("dwBalance")} />
                <div
                  className="resizer"
                  onMouseDown={(e) => handleMouseDown(e, "balance")}
                />
              </th>
              <th
                style={{ width: colWidths.mtm }}
                className="px-3 py-2 text-right font-medium cursor-pointer"
                onClick={() => requestSort("m2mTotal")}
              >
                MTM <i className={getSortIcon("m2mTotal")} />
                <div
                  className="resizer"
                  onMouseDown={(e) => handleMouseDown(e, "mtm")}
                />
              </th>
              <th
                style={{ width: colWidths.rpl }}
                className="px-3 py-2 text-right font-medium cursor-pointer"
                onClick={() => requestSort("rpl")}
              >
                R.P/L <i className={getSortIcon("rpl")} />
                <div
                  className="resizer"
                  onMouseDown={(e) => handleMouseDown(e, "rpl")}
                />
              </th>
              <th
                style={{ width: colWidths.netBal }}
                className="px-3 py-2 text-right font-medium cursor-pointer"
                onClick={() => requestSort("netPLBalance")}
              >
                NET BAL <i className={getSortIcon("netPLBalance")} />
                <div
                  className="resizer"
                  onMouseDown={(e) => handleMouseDown(e, "netBal")}
                />
              </th>
            </tr>
          </thead>

          <tbody className="text-white">
            {sortedPlData.map((item, index) => (
              <tr key={index} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-left ">
                  {item.userName ?? item.name}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(item.totalDeposit).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(item.totalWithdraw).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(item.dwBalance || 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(item.m2mTotal || 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(item.rpl || 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={
                      "font-medium " +
                      ((item.netPLBalance || 0) > 0
                        ? "text-blue-600"
                        : "text-red-600")
                    }
                  >
                    {Number(item.netPLBalance || 0).toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-blue-50 font-semibold">
              <th className="px-3 py-2 text-center">Total</th>
              <th className="px-3 py-2 text-right">{totalDepositTotal}</th>
              <th className="px-3 py-2 text-right">{totalWithdrawTotal}</th>
              <th className="px-3 py-2 text-right">{dwBalanceTotal}</th>
              <th className="px-3 py-2 text-right">{m2mTotalTotal}</th>
              <th className="px-3 py-2 text-right">{rpTotal}</th>
              <th className="px-3 py-2 text-right">{netPLBalanceTotal}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </Fragment>
  );
};

export default ChildList;
