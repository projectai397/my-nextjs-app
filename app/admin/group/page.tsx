"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download, Plus, Search, Upload } from "lucide-react";
import apiClient from "@/lib/axiosInstance";
import { SUCCESS } from "@/constant/index";
import { decryptData, encryptData } from "@/hooks/crypto";
import { useSession } from "next-auth/react";
import Papa from "papaparse";

interface GroupDataAssociation {
  index: number;
  groupName: string;
  symbolName: string;
  lotSize: number;
  quantityMax: number;
  lotMax: number;
  breakQuantity: number;
  breakUpLot: number;
}

interface ExchangeData {
  exchangeId: string;
  name: string;
}

interface Group {
  groupId: string;
  name: string;
  exchangeId: string;
  exchangeName: string;
  groupDefault: string;
  groupDefaultName: string;
  remark: string;
  status: string;
  statusName: string;
  updatedAt: string;
}

type ViewType =
  | "groups-list"
  | "group-add"
  | "group-edit"
  | "group-associations"
  | "association-add";

export default function CreateGroup() {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<ViewType>("groups-list");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [groupDataAssociations, setGroupDataAssociations] = useState<
    GroupDataAssociation[]
  >([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeData[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    exchangeId: "",
    groupDefault: "",
    remark: "",
  });

  // Fetch exchanges
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const payload = encryptData({
          search: "",
          limit: 20,
          page: 1,
        });
        const { data } = await apiClient.post(
          "exchange/list",
          JSON.stringify({ data: payload })
        );
        if (data.statusCode === SUCCESS) {
          const rdata = decryptData(data.data);
          setExchanges(rdata);
        }
      } catch (err) {
        console.error("Failed to fetch exchanges:", err);
      }
    };
    fetchExchanges();
  }, []);
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const payload = encryptData({
        search: searchTerm,
        exchangeId: selectedExchange !== "all" ? selectedExchange : "",
      });
      const { data } = await apiClient.post(
        `group/list`,
        JSON.stringify({ data: payload })
      );
      if (data.statusCode === SUCCESS) {
        const rdata = decryptData(data.data);
        setGroups(rdata || []);
        setTotalRecords(rdata.total || 0);
      } else {
        setError("Failed to fetch groups");
      }
    } catch (err) {
      setError("Error fetching groups");
    } finally {
      setLoading(false);
    }
  };

  // Fetch groups with exchange filter
  useEffect(() => {
    fetchGroups();
  }, []);
  console.log("groups", groups);
  // Fetch group data associations for selected group
  useEffect(() => {
    if (selectedGroupId && currentView === "group-associations") {
      const fetchGroupDataAssociations = async () => {
        try {
          const { data } = await apiClient.post(
            "group/group-data-association-lists",
            {
              start: 0,
              length: 30,
              search: {
                value: "",
              },
              sortKey: "createdAt",
              groupId: selectedGroupId,
              sortBy: -1,
            }
          );
          if (data) {
            const rdata = data.data;
            setGroupDataAssociations(rdata);
          }
        } catch (err) {
          console.error("Failed to fetch group data associations:", err);
        }
      };
      fetchGroupDataAssociations();
    }
  }, [selectedGroupId, currentView]);

  const handleExportExcel = () => {
    if (!groupDataAssociations || groupDataAssociations.length === 0) return;

    // convert our array into a flat array of objects that looks nice in excel
    const rows = groupDataAssociations.map((item) => ({
      symbol: item.symbolName ?? "",
      quantityMax: item.quantityMax ?? "",
      lotMax: item.lotMax ?? "",
      breakQuantity: item.breakQuantity ?? "",
      breakUpLot: item.breakUpLot ?? "",
    }));

    // create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Associations");

    // generate and download as CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    saveAs(blob, "group-associations.csv");
  };

  // const handlePrint = () => {
  //   window.print();
  // };
  const handleImportData = async () => {
    if (!selectedGroupId) {
      setError("No group selected.");
      return;
    }
    if (!csvFile) {
      setError("Please upload CSV first.");
      return;
    }
    if (!csvRows.length) {
      setError("CSV is empty or invalid.");
      return;
    }

    const symbols: string | any[] | Blob = [];
    const quantityMax: string | any[] | Blob = [];
    const lotMax: string | any[] | Blob = [];
    const breakQuantity: string | any[] | Blob = [];
    const breakUpLot: string | any[] | Blob = [];

    csvRows.forEach((row) => {
      symbols.push((row.symbol || "").trim());
      quantityMax.push(row.quantityMax ?? "");
      lotMax.push(row.lotMax ?? "");
      breakQuantity.push(row.breakQuantity ?? "");
      breakUpLot.push(row.breakUpLot ?? "");
    });

    const formData = new FormData();
    formData.append("symbol", JSON.stringify(symbols));
    formData.append("quantityMax", JSON.stringify(quantityMax));
    formData.append("lotMax", JSON.stringify(lotMax));
    formData.append("breakQuantity", JSON.stringify(breakQuantity));
    formData.append("breakUpLot", JSON.stringify(breakUpLot));

    try {
      setUploading(true);

      const resp = await apiClient.post(
        `/group/${selectedGroupId}/csv/post`,
        formData
      );
      // your helper.success will come here
      setMessage("Uploaded successfully");
      setCurrentView("group-associations");
    } catch (err: any) {
      console.error(err);
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.exchangeId ||
      !formData.groupDefault ||
      !formData.remark
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await apiClient.post(
        "/group/create-edit",
        JSON.stringify(formData)
      );

      if (data.statusCode === SUCCESS) {
        setMessage("Group created successfully!");
        setFormData({ name: "", exchangeId: "", groupDefault: "", remark: "" });
        setTimeout(() => {
          setCurrentView("groups-list");
          setMessage("");
        }, 1000);
      }
    } catch (err) {
      setError("Error creating group");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize);
  // Groups List View
  if (currentView === "groups-list") {
    return (
      <div
        className="min-h-screen overflow-y-scroll"
        style={{ backgroundColor: "#181a20" }}
      >
        <div className="p-4 space-y-6">
          {/* Header */}
          {/* Alerts */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10 text-red-500">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-green-500 bg-green-500/10 text-green-500">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Groups Section */}
          <Card
            className="border-gray-700 gap-0"
            style={{ backgroundColor: "#1e2329" }}
          >
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848E9C]" />
                    <Input
                      placeholder="Search by name"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-[#252a30] border-[#3a3f47] text-[#fcd535]"
                    />
                  </div>
                  <div className="">
                    <Select
                      value={selectedExchange}
                      onValueChange={setSelectedExchange}
                    >
                      <SelectTrigger className="border-gray-600 bg-gray-800 text-gray-200">
                        <SelectValue placeholder="Select Exchange" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-600 bg-gray-800 text-gray-200">
                        <SelectItem value="all">All Exchanges</SelectItem>
                        {exchanges.map((exchange) => (
                          <SelectItem
                            key={exchange.exchangeId}
                            value={exchange.exchangeId}
                          >
                            {exchange.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={fetchGroups}>Search</Button>
                </div>
                <Button
                  onClick={() => setCurrentView("group-add")}
                  className="bg-yellow-500 text-black hover:bg-yellow-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Groups
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 border-0">
              <div className="rounded-md border border-gray-700 border-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Index</TableHead>
                      <TableHead className="text-gray-400">Exchange</TableHead>
                      <TableHead className="text-gray-400">Group</TableHead>
                      <TableHead className="text-gray-400">Default?</TableHead>
                      <TableHead className="text-gray-400">Remark</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">
                        Last Updated
                      </TableHead>
                      <TableHead className="text-gray-400">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-400"
                        >
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : groups.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-400"
                        >
                          No groups found
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups.map((group, index) => (
                        <TableRow
                          key={group.groupId}
                          className="border-gray-700"
                        >
                          <TableCell className="text-gray-200">
                            {(currentPage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {group.exchangeName}
                          </TableCell>
                          <TableCell className="font-medium text-gray-200">
                            {group.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                group.groupDefault === "1"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                group.groupDefault === "1"
                                  ? "bg-yellow-500 text-black"
                                  : "bg-gray-600 text-gray-200"
                              }
                            >
                              {group.groupDefault === "1" ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {group.remark}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                group.status === "1" ? "default" : "destructive"
                              }
                              className={
                                group.status === "1"
                                  ? "bg-green-600 text-white"
                                  : "bg-red-600 text-white"
                              }
                            >
                              {group.status === "1" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {new Date(group.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-200 bg-gray-800"
                                onClick={() => {
                                  setSelectedGroupId(group.groupId);
                                  setFormData({
                                    name: group.name,
                                    exchangeId: group.exchangeId,
                                    groupDefault: group.groupDefault,
                                    remark: group.remark,
                                  });
                                  setCurrentView("group-edit");
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-200 bg-gray-800"
                                onClick={() => {
                                  setSelectedGroupId(group.groupId);
                                  setCurrentView("group-associations");
                                }}
                              >
                                View Data
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      Showing {(currentPage - 1) * pageSize + 1} to{" "}
                      {Math.min(currentPage * pageSize, totalRecords)} of{" "}
                      {totalRecords} entries
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="border-gray-600 text-gray-200 bg-gray-800"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="border-gray-600 text-gray-200 bg-gray-800"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Add Group View
  if (currentView === "group-add") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#181a20" }}>
        <div className="p-4 space-y-6">
          {/* Alerts */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10 text-red-500">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-green-500 bg-green-500/10 text-green-500">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Add Group Form */}
          <Card
            className="border-gray-700 p-0"
            style={{ backgroundColor: "#1e2329" }}
          >
            <CardContent className="p-6">
              <h2
                className="text-xl font-semibold flex gap-2 mb-2 flex-row-reverse justify-between"
                style={{ color: "#fcd535" }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-200 bg-gray-800"
                  onClick={() => setCurrentView("groups-list")}
                >
                  ← Back
                </Button>
                Group Information
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Group Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Enter group name"
                      required
                      className="border-gray-600 bg-gray-800 text-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Exchange *
                    </label>
                    <Select
                      value={formData.exchangeId}
                      onValueChange={(value) =>
                        handleInputChange("exchangeId", value)
                      }
                    >
                      <SelectTrigger className="border-gray-600 bg-gray-800 text-gray-200">
                        <SelectValue placeholder="Select Exchange" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-600 bg-gray-800 text-gray-200">
                        {exchanges.map((exchange) => (
                          <SelectItem
                            key={exchange.exchangeId}
                            value={exchange.exchangeId}
                          >
                            {exchange.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Default? *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 text-gray-200">
                        <input
                          type="radio"
                          name="groupDefault"
                          value="1"
                          checked={formData.groupDefault === "1"}
                          onChange={(e) =>
                            handleInputChange("groupDefault", e.target.value)
                          }
                          className="text-yellow-500"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center space-x-2 text-gray-200">
                        <input
                          type="radio"
                          name="groupDefault"
                          value="0"
                          checked={formData.groupDefault === "0"}
                          onChange={(e) =>
                            handleInputChange("groupDefault", e.target.value)
                          }
                          className="text-yellow-500"
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">
                    Remark *
                  </label>
                  <textarea
                    value={formData.remark}
                    onChange={(e) =>
                      handleInputChange("remark", e.target.value)
                    }
                    placeholder="Enter remark"
                    rows={4}
                    required
                    className="w-full border border-gray-600 bg-gray-800 text-gray-200 rounded-md p-3"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-yellow-500 text-black hover:bg-yellow-600"
                  >
                    {loading ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Edit Group View
  if (currentView === "group-edit") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#181a20" }}>
        <div className="p-4 space-y-6">
          {/* Alerts */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10 text-red-500">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-green-500 bg-green-500/10 text-green-500">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Edit Group Form */}
          <Card
            className="border-gray-700"
            style={{ backgroundColor: "#1e2329" }}
          >
            <CardHeader className="border-b border-gray-700 flex justify-between items-center">
              <h2
                className="text-xl font-semibold"
                style={{ color: "#fcd535" }}
              >
                Group Information
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-200 bg-gray-800"
                onClick={() => setCurrentView("groups-list")}
              >
                ← Back
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Group Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Enter group name"
                      required
                      className="border-gray-600 bg-gray-800 text-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Exchange *
                    </label>
                    <Select
                      value={formData.exchangeId}
                      onValueChange={(value) =>
                        handleInputChange("exchangeId", value)
                      }
                    >
                      <SelectTrigger className="border-gray-600 bg-gray-800 text-gray-200">
                        <SelectValue placeholder="Select Exchange" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-600 bg-gray-800 text-gray-200">
                        {exchanges.map((exchange) => (
                          <SelectItem
                            key={exchange.exchangeId}
                            value={exchange.exchangeId}
                          >
                            {exchange.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">
                    Default? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 text-gray-200">
                      <input
                        type="radio"
                        name="groupDefault"
                        value="1"
                        checked={formData.groupDefault === "1"}
                        onChange={(e) =>
                          handleInputChange("groupDefault", e.target.value)
                        }
                        className="text-yellow-500"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center space-x-2 text-gray-200">
                      <input
                        type="radio"
                        name="groupDefault"
                        value="0"
                        checked={formData.groupDefault === "0"}
                        onChange={(e) =>
                          handleInputChange("groupDefault", e.target.value)
                        }
                        className="text-yellow-500"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">
                    Remark *
                  </label>
                  <textarea
                    value={formData.remark}
                    onChange={(e) =>
                      handleInputChange("remark", e.target.value)
                    }
                    placeholder="Enter remark"
                    rows={4}
                    required
                    className="w-full border border-gray-600 bg-gray-800 text-gray-200 rounded-md p-3"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-yellow-500 text-black hover:bg-yellow-600"
                  >
                    {loading ? "Updating..." : "Update Group"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Group Data Associations View
  if (currentView === "group-associations") {
    const selectedGroup = groups.find((g) => g.groupId === selectedGroupId);
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#181a20" }}>
        <div className="p-4 space-y-6">
          {/* Alerts */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10 text-red-500">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-green-500 bg-green-500/10 text-green-500">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Associations Table */}
          <Card
            className="border-gray-700"
            style={{ backgroundColor: "#1e2329" }}
          >
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-200 bg-gray-800"
                  onClick={() => setCurrentView("groups-list")}
                >
                  ← Back to Groups
                </Button>
                <p className="text-xl font-bold text-[#fcd535]">
                  Group: {selectedGroup?.name}
                </p>
                <Button
                  onClick={() => setCurrentView("association-add")}
                  className="bg-yellow-500 text-black hover:bg-yellow-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Index</TableHead>
                      <TableHead className="text-gray-400">Group</TableHead>
                      <TableHead className="text-gray-400">Symbol</TableHead>
                      <TableHead className="text-gray-400">Lot Size</TableHead>
                      <TableHead className="text-gray-400">
                        Quantity Max
                      </TableHead>
                      <TableHead className="text-gray-400">Lot Max</TableHead>
                      <TableHead className="text-gray-400">
                        Break Quantity
                      </TableHead>
                      <TableHead className="text-gray-400">
                        BreakUp Lot
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupDataAssociations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-400"
                        >
                          No data associations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupDataAssociations.map((association, index) => (
                        <TableRow key={index} className="border-gray-700">
                          <TableCell className="text-gray-200">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium text-gray-200">
                            {association.groupName}
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {association.symbolName}
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {association.lotSize}
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {association.quantityMax}
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {association.lotMax}
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {association.breakQuantity}
                          </TableCell>
                          <TableCell className="text-gray-200">
                            {association.breakUpLot}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2 p-4">
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  className="border-gray-600 text-gray-200 bg-gray-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                {/* <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="border-gray-600 text-gray-200 bg-gray-800"
                >
                  Print
                </Button> */}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Association Add View (CSV Upload)
  if (currentView === "association-add") {
    const selectedGroup = groups.find((g) => g.groupId === selectedGroupId);
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#181a20" }}>
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          {/* Alerts */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10 text-red-500">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="border-green-500 bg-green-500/10 text-green-500">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Card
            className="border-gray-700 p-0"
            style={{ backgroundColor: "#1e2329" }}
          >
            <CardContent className="p-4 space-y-2">
              <h2 className="text-xl font-semibold text-red-500 flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-200 bg-gray-800"
                  onClick={() => setCurrentView("group-associations")}
                >
                  ← Back
                </Button>
                <span>
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: "#fcd535" }}
                  >
                    Upload CSV File Instructions
                  </h2>
                </span>
              </h2>
              <p className="font-medium text-gray-200">
                Please ensure required fields are provided before creating
                group:
              </p>
              <p className="text-gray-300">
                1. MCX, CE/PE:{" "}
                <span className="text-red-500 font-bold">
                  Lot Max, BreakUp Lot
                </span>
              </p>
              <p className="text-gray-300">
                2. NSE, GIFT, OTHERS, CDS, COMEX, USSTOCK, CRYPTO, FOREX:{" "}
                <span className="text-red-500 font-bold">
                  Quantity Max, Breakup Quantity
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Upload Form */}
          <Card
            className="border-gray-700"
            style={{ backgroundColor: "#1e2329" }}
          >
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                      Upload Group Association CSV *
                    </label>
                    <Input
                      type="file"
                      accept=".csv"
                      className="border-gray-600 bg-gray-800 text-gray-200"
                      // when file changes
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setCsvFile(file);

                        Papa.parse(file, {
                          header: true,
                          skipEmptyLines: true,
                          complete: (results) => {
                            // keep only proper rows that have a symbol
                            const cleaned = (results.data as any[]).filter(
                              (row) =>
                                row &&
                                typeof row === "object" &&
                                typeof row.symbol === "string" &&
                                row.symbol.trim() !== ""
                            );
                            setCsvRows(cleaned);
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-600 text-gray-200 bg-gray-800"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = "/group_sample.csv"; // points to /public/group_sample.csv
                        link.download = "group_sample.csv";
                        link.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Sample
                    </Button>
                  </div>
                </div>
                {csvRows.length > 0 && (
                  <div className="mt-6 border border-gray-700 rounded-md overflow-y-scroll max-h-[40vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-400">
                            Symbol
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Quantity Max
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Lot Max
                          </TableHead>
                          <TableHead className="text-gray-400">
                            Break Quantity
                          </TableHead>
                          <TableHead className="text-gray-400">
                            BreakUp Lot
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvRows.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-gray-200">
                              {row.symbol}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {row.quantityMax}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {row.lotMax}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {row.breakQuantity}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {row.breakUpLot}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleImportData}
                    disabled={uploading}
                    className="bg-yellow-500 text-black hover:bg-yellow-600"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Importing..." : "Import Data"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
