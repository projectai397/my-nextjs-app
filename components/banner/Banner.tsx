
"use client";

import apiClient from "@/lib/axiosInstance";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { ADMIN_API_ENDPOINT, BANNER_LIST, SUCCESS } from "@/constant/index";
import { toastError } from "@/hooks/toastMsg";
import { decryptData, encryptData } from "@/hooks/crypto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CreateBannerDialog } from "./CreateBannerDialog";

// ---------- Types ----------
type Nullable<T> = T | null;

type Authenticated = {
  userId: string;
  role: number | string;
};

export type BannerItem = {
  bannerId: string;
  userId: string;
  title: string;
  shortDescription: string;
  status: 1 | 2;
  bannerImageDataUrl?: string;
};

type SortKey = keyof Pick<BannerItem, "title" | "shortDescription">;
type SortDirection = "ascending" | "descending";

type SortConfig =
  | {
      key: SortKey;
      direction: SortDirection;
    }
  | { key: null; direction: SortDirection };

const BannerPage: React.FC = () => {
  const deviceType =
    (typeof window !== "undefined" && localStorage.getItem("deviceType")) || "";
  const jwt_token =
    (typeof window !== "undefined" && localStorage.getItem("token")) || "";
  const authenticated: Authenticated =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("authenticated") || "{}")) ||
    {};

  const [tableData, setTableData] = useState<BannerItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage = 10;
  const [previewImage, setPreviewImage] = useState<Nullable<string>>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingBannerId, setEditingBannerId] = useState<Nullable<string>>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "ascending",
  });

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedTableData = useMemo(() => {
    const sortable = [...tableData];
    if (!sortConfig.key) return sortable;

    const { key, direction } = sortConfig;
    sortable.sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "ascending"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (aValue < (bValue as any)) return direction === "ascending" ? -1 : 1;
      if (aValue > (bValue as any)) return direction === "ascending" ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [tableData, sortConfig]);

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return "fa-solid fa-sort";
    return sortConfig.direction === "ascending"
      ? "fa-solid fa-sort-up"
      : "fa-solid fa-sort-down";
  };

  useEffect(() => {
    document.title = "Admin Panel | Banner";
    return () => {
      document.title = "Admin Panel";
    };
  }, []);

  const fetchDataFromAPI = async () => {
    try {
      const payload = encryptData({
        userId: authenticated?.userId,
        role: authenticated?.role,
        page: currentPage,
        limit: itemsPerPage,
      });
      const body = JSON.stringify({ data: payload });

      const response = await apiClient.post(
        BANNER_LIST,
        body,
      );

      if (response.data.statusCode === SUCCESS) {
        const rdata: BannerItem[] = decryptData(response.data.data);
        setTableData(rdata);
        setTotalPages(response.data.meta.totalPage);
        setTotalCount(response.data.meta.totalCount);
      } else {
        toastError(response.data.message);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Failed to load banners");
      console.error("Banner list error:", error);
    }
  };

  useEffect(() => {
    fetchDataFromAPI();
  }, [currentPage]);

  const openCreate = () => {
    setEditingBannerId(null);
    setDialogOpen(true);
  };
  const openEdit = (bannerId: string) => {
    setEditingBannerId(bannerId);
    setDialogOpen(true);
  };
  const handleSuccess = () => {
    fetchDataFromAPI();
    setDialogOpen(false);
  };

  return (
    <Fragment>
      <div
        className="min-h-screen px-4 sm:px-6 py-6"
        style={{ backgroundColor: "#181a20" }}
      >
        <Card className="mt-4 border-0" style={{ backgroundColor: "#1e2329" }}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold" style={{ color: "#fcd535" }}>
                Banners
              </CardTitle>
              <p className="text-sm" style={{ color: "#848E9C" }}>
                Records — {totalCount}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-transparent border border-[#848E9C] text-[#fcd535] hover:bg-transparent"
              >
                Back
              </Button>
              <Button
                onClick={openCreate}
                className="bg-[#fcd535] text-[#181a20] hover:bg-[#fcd535]"
              >
                Create New
              </Button>
            </div>
          </CardHeader>
          <Separator className="bg-[#2a2f35]" />
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead
                      className="cursor-pointer min-w-[200px] text-[#fcd535]"
                      onClick={() => requestSort("title")}
                    >
                      <div className="flex items-center gap-2">
                        Title <i className={getSortIcon("title")} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-[#fcd535]"
                      onClick={() => requestSort("shortDescription")}
                    >
                      <div className="flex items-center gap-2">
                        Short Description{" "}
                        <i className={getSortIcon("shortDescription")} />
                      </div>
                    </TableHead>
                    <TableHead className="text-[#fcd535]">Banner Image</TableHead>
                    <TableHead className="text-[#fcd535]">Status</TableHead>
                    <TableHead className="text-[#fcd535]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTableData.map((item) => (
                    <TableRow
                      key={item.bannerId}
                      className="hover:bg-transparent text-[#fff]"
                    >
                      <TableCell>{item.title}</TableCell>
                      <TableCell className="max-w-[520px] text-[#848E9C]">
                        <span className="line-clamp-2">
                          {item.shortDescription}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.bannerImageDataUrl ? (
                          <img
                            src={item.bannerImageDataUrl}
                            alt="banner"
                            className="h-14 w-auto rounded border border-[#2a2f35] cursor-pointer"
                            onClick={() =>
                              setPreviewImage(item.bannerImageDataUrl!)
                            }
                          />
                        ) : (
                          <span className="text-[#848E9C]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === 1 ? (
                          <Badge className="bg-[#fcd535] text-[#181a20] hover:bg-[#fcd535]">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-[#848E9C] text-white hover:bg-[#848E9C]">
                            In-Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="px-0 text-[#fcd535] hover:text-[#fcd535]"
                          onClick={() => openEdit(item.bannerId)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedTableData.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="text-center text-[#848E9C]"
                      >
                        No banners found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                className="bg-transparent border border-[#848E9C] text-[#fcd535] hover:bg-transparent"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="text-sm text-[#848E9C] tabular-nums">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                className="bg-transparent border border-[#848E9C] text-[#fcd535] hover:bg-transparent"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Preview */}
      <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl bg-[#1e2329] border-0">
          <DialogHeader>
            <DialogTitle className="text-[#fcd535]">Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt="preview"
                className="max-h-[70vh] w-auto rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <CreateBannerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bannerId={editingBannerId}
        onSuccess={handleSuccess}
      />
    </Fragment>
  );
};

export default BannerPage;
