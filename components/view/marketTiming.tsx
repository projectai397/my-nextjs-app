"use client";
import React, { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { Container } from "reactstrap";
import apiClient from "@/lib/axiosInstance";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  ADMIN_API_ENDPOINT,
  SUCCESS,
  EXCHANGE_LIST,
  EXCHANGE_TIME_SCHEDULE_LIST,
  HOLIDAY_LIST,
} from "@/constant/index";
import { encryptData, decryptData } from "@/hooks/crypto";
import { toast } from "sonner";
const MarketTiming = () => {
  const [tableData, setTableData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1000;
  const [exchangeData, setExchangeData] = useState<
    { label: string; value: string }[]
  >([]);
  const [formData, setFormData] = useState<{ exchange: any }>({ exchange: [] });

  const BINANCE_BG = "#181a20";
  const BINANCE_CARD = "#1e2329";
  const BINANCE_TITLE = "#fcd535";
  const BINANCE_SUB = "#848E9C";

  const handleReset = async () => {
    setFormData({ ...formData, exchange: [] });
    fetchDataFromAPI(1);
  };

  const handleFilter = async (a: any) => {
    fetchDataFromAPI(0);
    setCurrentPage(1);
  };
  const authenticated = JSON.parse(
    localStorage.getItem("authenticated") || "{}"
  );

  const fetchDataFromAPI = async (_reset: number) => {
    try {
      let payload = encryptData({
        search: "",
        userId: authenticated.userId,
        exchangeId: formData?.exchange?.value ? formData.exchange.value : "",
        status: "",
        page: currentPage,
        limit: itemsPerPage,
      });
      const data = JSON.stringify({ data: payload });

      const exchangeSchedulePromise = apiClient.post(
        EXCHANGE_TIME_SCHEDULE_LIST,
        data
      );
      const holidayListPromise = apiClient.post(HOLIDAY_LIST, data);

      const [exchangeRes, holidayRes] = await Promise.all([
        exchangeSchedulePromise,
        holidayListPromise,
      ]);

      const entriesToLoad: any[] = [];

      if (exchangeRes.data.statusCode === SUCCESS) {
        const rdata = decryptData(exchangeRes.data.data) || [];
        for (let i in rdata) {
          const days = Array.isArray(rdata[i].weekOff) ? rdata[i].weekOff : [];
          entriesToLoad.push({
            id: `schedule-${i}`,
            title: `${rdata[i].startTime} - ${rdata[i].endTime}`,
            daysOfWeek: days,
            startTime: rdata[i].startTime,
            endTime: rdata[i].endTime,
          });
        }
      } else {
        toast.error(exchangeRes.data.message);
      }

      if (holidayRes.data.statusCode === SUCCESS) {
        const holidays = decryptData(holidayRes.data.data) || [];
        holidays.forEach((holiday: any, index: number) => {
          entriesToLoad.push({
            id: `holiday-${index}`,
            title: holiday.text || "Holiday",
            start: holiday.startDate,
            allDay: true,
          });
        });
      } else {
        toast.error(holidayRes.data.message);
      }

      setTableData(entriesToLoad);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleGetExchange = async () => {
    let payload = encryptData({
      page: 1,
      limit: 10,
      search: "",
      sortKey: "createdAt",
      sortBy: -1,
    });
    const data = JSON.stringify({ data: payload });
    apiClient
      .post(EXCHANGE_LIST, data)
      .then((response) => {
        if (response.data.statusCode === SUCCESS) {
          const rdata = decryptData(response.data.data) || [];
          const rRes = rdata.map((item: any) => ({
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
    <div
      className="h-full overflow-y-auto "
      style={{ backgroundColor: BINANCE_BG, color: BINANCE_SUB }}
    >
      <div className="px-3 md:px-6 pb-10">
        <div
          className="rounded-xl border border-white/5 shadow-lg overflow-visible "
          style={{ backgroundColor: BINANCE_CARD }}
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-12 items-end gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm mb-1" htmlFor="exchange">
                  Exchange
                </label>

                {/* raise stacking context above calendar */}
                <div className="relative z-50">
                  <Select
                    inputId="exchange"
                    className="react-select-binance"
                    classNamePrefix="rs"
                    value={formData.exchange}
                    onChange={(opt) => handleChangeValueOption(opt, "exchange")}
                    options={exchangeData}
                    isLoading={!exchangeData.length}
                    menuPortalTarget={
                      typeof document !== "undefined"
                        ? document.body
                        : undefined
                    }
                    menuPosition="fixed"
                    menuShouldBlockScroll={true}
                    classNames={{
                      control: ({ isFocused }) =>
                        [
                          "min-h-[42px] rounded-md border",
                          "bg-[#22272f] text-[#848E9C]",
                          isFocused ? "border-white/20" : "border-white/10",
                          "shadow-none",
                        ].join(" "),
                      valueContainer: () => "text-[#848E9C]",
                      singleValue: () => "text-[#848E9C]",
                      input: () => "text-[#848E9C]",
                      menu: () =>
                        [
                          "mt-1 rounded-md border border-white/10",
                          "bg-[#22272f] text-[#848E9C]",
                          "overflow-hidden",
                          // ensure high z-index on portal menu too
                          "z-[9999]",
                        ].join(" "),
                      option: ({ isFocused, isSelected }) =>
                        [
                          "cursor-pointer px-3 py-2",
                          isFocused || isSelected
                            ? "bg-[#2a2f36] text-[#fcd535]"
                            : "bg-transparent text-[#848E9C]",
                        ].join(" "),
                      placeholder: () => "text-[#6e7684]",
                      indicatorsContainer: () => "text-[#848E9C]",
                      dropdownIndicator: () => "text-[#848E9C]",
                      clearIndicator: () => "text-[#848E9C]",
                    }}
                  />
                </div>
              </div>

              <div className="md:col-span-2 md:ml-auto">
                <label className="block text-sm mb-1 invisible md:visible">
                  &nbsp;
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFilter(1)}
                    className="h-10 px-4 rounded-md font-medium"
                    style={{ backgroundColor: BINANCE_TITLE, color: "#111111" }}
                  >
                    View
                  </button>
                  <button
                    onClick={handleReset}
                    className="h-10 px-4 rounded-md border border-white/10 font-medium text-[#fcd535] bg-[#2a2f36]"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className=" ">
            {/* keep calendar at base stacking level */}
            <div
              className="relative z-0 rounded-lg border border-white/5 "
              style={{ backgroundColor: BINANCE_CARD }}
            >
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={tableData}
                height="90vh"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                buttonText={{
                  today: "Today",
                  month: "Month",
                  week: "Week",
                  day: "Day",
                }}
                dayCellClassNames={() =>
                  ["border", "border-white/10", "bg-[#1e2329]"].join(" ")
                }
                slotLaneClassNames={() =>
                  ["border", "border-white/10", "bg-[#1e2329]"].join(" ")
                }
                slotLabelClassNames={() => ["text-[#848E9C]"].join(" ")}
                eventClassNames={() =>
                  [
                    "rounded-md",
                    "px-2",
                    "py-0.5",
                    "text-white",
                    "font-medium",
                    "border-0",
                    "bg-transperent",
                    "height-500px",
                  ].join(" ")
                }
                titleFormat={{ year: "numeric", month: "long" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketTiming;
