"use client";

import React, { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // ✅ use NextAuth session

import { encryptData, decryptData } from "@/hooks/crypto";
import {
  ADMIN_API_ENDPOINT,
  SUCCESS,
  USER_WISE_EXCHANGE_LIST,
} from "@/constant/index";
import { formatDate } from "@/hooks/dateUtils";

/* ===== Lucide Icons ===== */
import {
  Banknote,
  Server,
  User,
  TrendingUp,
  LineChart,
  Gem,
} from "lucide-react";

/* Optional – if you still use these */

import { Container } from "reactstrap";

type AuthenticatedUser = {
  userId: string;
  balance: number;
  parentUser?: string;
  createdAt?: string;
};

type ExchangeItem = {
  exchangeName: string;
  isTurnoverWise: boolean;
  brokerageTurnoverwise?: number;
  brokerageSymbolwiseAmount?: number;
  leverage?: number;
  carryForwardMarginAmount?: number;
};

const Profile: React.FC = () => {
  const { data: session } = useSession(); // ✅ Get user session
  const router = useRouter();

  const [exchangeData, setExchangeData] = useState<ExchangeItem[]>([]);
  const [authenticated, setAuthenticated] = useState<AuthenticatedUser | null>(
    null
  );

  const deviceType =
    typeof window !== "undefined" ? localStorage.getItem("deviceType") : null;
  const jwt_token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authenticatedUserId = (session?.user as any)?.userId as
    | string
    | undefined;

  /** ===== Fetch UserWise Exchange List ===== */
  const handleGetGroupList = async (userId: string) => {
    let data = encryptData({
      page: 1,
      limit: 100,
      search: "",
      sortKey: "createdAt",
      sortBy: -1,
      groupId: "",
      userId: userId,
    });
    data = JSON.stringify({ data });

    try {
      const response = await axios.post(
        ADMIN_API_ENDPOINT + USER_WISE_EXCHANGE_LIST,
        data,
        {
          headers: {
            Authorization: jwt_token ,
            "Content-Type": "application/json",
            deviceType: deviceType ,
          },
        }
      );
      if (response.data.statusCode === SUCCESS) {
        const resData = decryptData(response.data.data) as ExchangeItem[];
        setExchangeData(resData);
      }
    } catch {
      // silent error per original logic
    }
  };

  /** ===== On Mount ===== */
  useEffect(() => {
    const authStr =
      typeof window !== "undefined" ? localStorage.getItem("authenticated") : null;
    if (authStr) {
      const parsed = JSON.parse(authStr) as AuthenticatedUser;
      setAuthenticated(parsed);
    }

    if (authenticatedUserId && jwt_token) {
      handleGetGroupList(authenticatedUserId);
    }

    if (typeof document !== "undefined") {
      document.title = "Admin Panel | Profile";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.title = "Admin Panel";
      }
    };
  }, [authenticatedUserId, jwt_token]);

  /** ===== Loading ===== */
  if (!authenticated)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#181a20",
          color: "#fcd535",
          padding: "2rem",
        }}
      >
        Loading...
      </div>
    );

  return (
    <Fragment>
      <div
        className="profile_tl"
        style={{
          background: "#181a20",
          padding: "1rem 1.5rem 0 1.5rem",
        }}
      >
  
      </div>

      <Container
        fluid={true}
        style={{
          background: "#181a20",
          minHeight: "100vh",
          paddingBottom: "2rem",
        }}
      >
        <div className="account-page pt-2 pb-4">
          <div
            className="acc-dtl-list"
            style={{
              background: "#1e2329",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "480px",
              marginTop: "1rem",
            }}
          >
            {/* Summary */}
            <SectionTitle title="Summary" />

            <DetailRow
              icon={<Banknote size={20} color="#fcd535" />}
              label="BALANCE"
              value={authenticated.balance.toFixed(2)}
            />

            <DetailRow
              icon={<Server size={20} color="#fcd535" />}
              label="SERVER"
              value={authenticated.parentUser ?? "-"}
            />

            {/* Account Details */}
            <SectionTitle title="Account Details" />
            <DetailRow
              icon={<User size={20} color="#fcd535" />}
              label="A/C DATE"
              value={
                authenticated.createdAt
                  ? formatDate(authenticated.createdAt)
                  : "-"
              }
            />

            {/* Brokerage Details */}
            <SectionTitle title="Brokerage Details" />
            {exchangeData.map((item, i) => (
              <DetailRow
                key={`brk-${i}`}
                icon={
                  i % 3 === 0 ? (
                    <TrendingUp size={20} color="#fcd535" />
                  ) : i % 2 === 0 ? (
                    <Gem size={20} color="#fcd535" />
                  ) : (
                    <LineChart size={20} color="#fcd535" />
                  )
                }
                label={item.exchangeName}
                value={
                  item.isTurnoverWise
                    ? `${item.brokerageTurnoverwise}/CR`
                    : `${item.brokerageSymbolwiseAmount}/LOT`
                }
              />
            ))}

            {/* Leverage Details */}
            <SectionTitle title="Leverage Details" />
            {exchangeData.map((item, i) => (
              <DetailRow
                key={`lev-${i}`}
                icon={
                  i % 3 === 0 ? (
                    <TrendingUp size={20} color="#fcd535" />
                  ) : i % 2 === 0 ? (
                    <Gem size={20} color="#fcd535" />
                  ) : (
                    <LineChart size={20} color="#fcd535" />
                  )
                }
                label={item.exchangeName}
                value={`X${item.leverage}`}
              />
            ))}

            {/* Carry Forward Margin */}
            <SectionTitle title="Carry Forward Margin" />
            {exchangeData.map((item, i) => (
              <DetailRow
                key={`cfm-${i}`}
                icon={
                  i % 3 === 0 ? (
                    <TrendingUp size={20} color="#fcd535" />
                  ) : i % 2 === 0 ? (
                    <Gem size={20} color="#fcd535" />
                  ) : (
                    <LineChart size={20} color="#fcd535" />
                  )
                }
                label={item.exchangeName}
                value={`X${item.carryForwardMarginAmount}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </Fragment>
  );
};

/* --- Helper Components --- */

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <p
    style={{
      color: "#fcd535",
      marginTop: "1.5rem",
      marginBottom: "0.75rem",
      fontWeight: 600,
    }}
  >
    {title}
  </p>
);

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: any }> = ({
  icon,
  label,
  value,
}) => (
  <div
    className="detail-sub-list d-flex v-center"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.6rem 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "8px",
          background: "#181a20",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <strong style={{ color: "#848E9C", fontWeight: 500 }}>{label}</strong>
    </div>
    <p style={{ margin: 0, color: "#ffffff", fontWeight: 600 }}>{value}</p>
  </div>
);

export default Profile;
