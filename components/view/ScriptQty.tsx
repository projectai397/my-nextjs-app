"use client";

import apiClient from "@/lib/axiosInstance";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { Container } from "reactstrap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ADMIN_API_ENDPOINT,
  EXCHANGE_LIST,
  SUCCESS,
  USER_WISE_SYMBOL_LIST,
  USER_WISE_SYMBOL_LIST_WITHCOUNT,
} from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { toast } from "sonner";
const ScriptQuantity = () => {
  const { data: session } = useSession();

  const jwt_token = (session as any)?.accessToken as string | undefined;
  const deviceType =
    ((session?.user as any)?.deviceType as string | undefined) ?? "web";
  const authenticatedUserId = (session?.user as any)?.userId as
    | string
    | undefined;

  const [tableData, setTableData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 1000;
  const [exchangeData, setExchangeData] = useState<any[]>([]);
  const [isSymbolWise, setIsSymbolWise] = useState(false);
  const [formData, setFormData] = useState({
    exchange: [],
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "ascending" | "descending";
  }>({ key: null, direction: "ascending" });

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    let sortableItems = [...tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue;
        let bValue;

        if (sortConfig.key === "script") {
          const getDisplayName = (item: any) => {
            if (item.exchangeName.toLowerCase() === "usstock")
              return item.symbolName;
            if (item.exchangeName.toLowerCase() === "ce/pe")
              return item.symbolTitle;
            return item.masterName;
          };
          aValue = getDisplayName(a);
          bValue = getDisplayName(b);
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string") {
          return sortConfig.direction === "ascending"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          if (aValue < bValue) {
            return sortConfig.direction === "ascending" ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === "ascending" ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [tableData, sortConfig]);

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return "fa-solid fa-sort";
    }
    if (sortConfig.direction === "ascending") {
      return "fa-solid fa-sort-up";
    }
    return "fa-solid fa-sort-down";
  };

  const handleReset = async () => {
    setFormData({ ...formData, exchange: [] });
    fetchDataFromAPI(1);
  };

  const handleFilter = async () => {
    fetchDataFromAPI(0);
    setCurrentPage(1);
  };

  const fetchDataFromAPI = async (reset: number) => {
    try {
      let data = encryptData({
        search: "",
        userId: authenticatedUserId,
        exchangeId: formData?.exchange?.values ? formData.exchange.values : "",
        status: "",
        page: currentPage,
        limit: itemsPerPage,
      });
      data = JSON.stringify({ data });
      apiClient
        .post(ADMIN_API_ENDPOINT + USER_WISE_SYMBOL_LIST_WITHCOUNT, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode === SUCCESS) {
            const rdata = decryptData(response.data.data);
            setTableData(rdata);
            setTotalPages(response.data.meta.totalPage);
            setTotalCount(response.data.meta.totalCount);
            let isSymbolWise = false;
            for (let i = 0; i < rdata.length; i++) {
              isSymbolWise = rdata[i].isSymbolWise;
              break;
            }
            console.log("API Response With count:", rdata);
            setIsSymbolWise(isSymbolWise);
          } else {
            toast.error(response.data.message);
          }
        })

        .catch((error) => {
          toast.error(error.response.data.message);
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handlePageChange = async (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleGetExchange = async () => {
    let data = encryptData({
      page: 1,
      limit: 10,
      search: "",
      sortKey: "createdAt",
      sortBy: -1,
    });
    data = JSON.stringify({ data });
    apiClient
      .post(ADMIN_API_ENDPOINT + EXCHANGE_LIST, data, {
        headers: {
          "Content-Type": "application/json",
          deviceType,
          Authorization: jwt_token,
        },
      })
      .then((response) => {
        if (response.data.statusCode === SUCCESS) {
          const rdata = decryptData(response.data.data);
          let rRes = rdata.map((item: any) => ({
            label: item.name,
            value: item.exchangeId,
          }));
          setExchangeData(rRes);
          console.log("API Response exchange:", rdata);
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  };

  const handleChangeValueOption = (selectedOptions: any, name: string) => {
    setFormData({
      ...formData,
      [name]: selectedOptions,
    });
  };

  useEffect(() => {
    handleGetExchange();
    document.title = "Admin Panel | Script Quantity";
    return () => {
      document.title = "Admin Panel";
    };
  }, [currentPage]);

  return (
    <div className="card bdr-card p-0 bg-[#1e2329] h-full">
      <div className="card-header text-[#fcd535] p-4">
        <div className="flex justify-end items-center flex-wrap mb-3">
          <div className="total-count-pill text-[#848e9c]">
            Records - {totalCount}
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 ">
            <label className="col-form-label text-sm font-medium text-[#848e9c] mb-2 block">
              Exchange
            </label>
            <Select
              value={
                formData.exchange.length ? formData.exchange[0] : undefined
              }
              onValueChange={(value) =>
                handleChangeValueOption({ value }, "exchange")
              }
            >
              <SelectTrigger className="bg-[#2d3338] border-[#3d4449] text-white w-full">
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent className="bg-[#2d3338] border-[#3d4449]">
                {exchangeData.map((exchange: any) => (
                  <SelectItem
                    key={exchange.value}
                    value={exchange.value}
                    className="text-white hover:bg-[#3d4449]"
                  >
                    {exchange.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              className="btn btn_my_2 d-flex align-items-center me-2 bg-[#fcd535] text-[#1e2329] hover:bg-[#fcd535]/90"
              onClick={() => handleFilter()}
            >
              View
            </Button>
            <Button
              className="btn btn-danger d-flex align-items-center bg-red-600 text-white hover:bg-red-700"
              onClick={handleReset}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="card-block p-4 h-full">
        {/* Sort Controls */}

        {/* Cards Grid - Replacing the table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTableData.map((item: any, index: number) => (
            <Card
              key={index}
              className="bg-[#2d3338] border-[#3d4449] hover:border-[#fcd535]/50 transition-colors"
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Symbol */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#848e9c]">Symbol</span>
                    <Badge
                      variant="secondary"
                      className="bg-[#fcd535]/20 text-[#fcd535] border-[#fcd535]/30"
                    >
                      {item.symbolTitle}
                    </Badge>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#3d4449]"></div>

                  {/* Values */}
                  {isSymbolWise ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#848e9c]">Lot Max</span>
                        <span className="text-white font-medium">
                          {item.lotMax}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#848e9c]">
                          BreakUp Lot
                        </span>
                        <span className="text-white font-medium">
                          {item.breakUpLot}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#848e9c]">
                          Quantity Max
                        </span>
                        <span className="text-white font-medium">
                          {item.quantityMax}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#848e9c]">
                          BreakUp Quantity
                        </span>
                        <span className="text-white font-medium">
                          {item.breakUpQuantity}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Show empty state if no data */}
        {sortedTableData.length === 0 && (
          <div className="text-center py-8 text-[#848e9c]">
            No data available. Please adjust your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="row p-4">
        <div className="col-md-12">
          <div className="pagination-block p-2 flex justify-end">
            <nav aria-label="Page navigation example">
              <ul className="pagination pagination-primary flex gap-1">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link text-white bg-[#2d3338] border-[#3d4449] px-3 py-2 rounded hover:bg-[#3d4449] disabled:opacity-50"
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages).keys()].map((pageNumber) => (
                  <li
                    key={pageNumber}
                    className={`page-item ${
                      currentPage === pageNumber + 1 ? "active" : ""
                    }`}
                  >
                    <button
                      className={`page-link px-3 py-2 rounded ${
                        currentPage === pageNumber + 1
                          ? "bg-[#fcd535] text-[#1e2329]"
                          : "text-white bg-[#2d3338] border-[#3d4449] hover:bg-[#3d4449]"
                      }`}
                      onClick={() => handlePageChange(pageNumber + 1)}
                    >
                      {pageNumber + 1}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link text-white bg-[#2d3338] border-[#3d4449] px-3 py-2 rounded hover:bg-[#3d4449] disabled:opacity-50"
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptQuantity;
