export type TradeItem = {
  // shape your top_10 arrays if you need them later
  [k: string]: any;
};

export type AnalysisDoc = {
  _id: string;
  superadmin_id: string;
  users?: string[];
  total_trades: number;
  win_trades: number;
  win_percent: number;
  total_volume: number;
  avg_risk_score: number;
  avg_risk_status: "Low Risk" | "Medium Risk" | "High Risk" | string;
  analysis?: {
    top_10_profitable_trades?: TradeItem[];
    top_10_loser_trades?: TradeItem[];
    top_10_biggest_trades_with_leverage?: TradeItem[];
    top_10_biggest_trades_without_leverage?: TradeItem[];
    top_10_highest_leverage_trades?: TradeItem[];
    top_10_most_traded_scripts?: TradeItem[];
    top_10_least_traded_scripts?: TradeItem[];
  };

  
  generated_at: string;
  window?: { start: string; end: string; tz: string };
};


export interface User {
  status: number;
  userId: string;
  name: string;
  userName: string;
  phone: string;
  domain: string;
  mainDomain: string;
  title: string;
  credit: number;
  initialCredit: number;
  balance: number;
  tradeMarginBalance: number;
  marginBalance: number;
  remark: string;
  ourProfitAndLossSharing: number;
  ourBrkSharing: number;
  profitAndLossSharing: number;
  profitAndLossSharingDownLine: number;
  brkSharing: number;
  brkSharingDownLine: number;
  exchangeAllow: string[];
  userWiseExchangeData: Array<{
    exchangeName: string;
    leverage: number;
    isSellEnable: number;
    status: number;
  }>;
  highLowBetweenTradeLimit: string[];
  firstLogin: boolean;
  changePasswordOnFirstLogin: boolean;
  depositWithdrawAtsSystem: boolean;
  role: string;
  roleName: string;
  parentId: string;
  parentUser: string;
  bet: boolean;
  fifteenDays: boolean;
  closeOnly: boolean;
  marginSquareOff: boolean;
  freshStopLoss: boolean;
  cmpOrder: number;
  freshLimitSL: boolean;
  cmpOrderValue: string;
  manualOrder: number;
  manualOrderValue: string;
  marketOrder: number;
  marketOrderValue: string;
  addMaster: number;
  addMasterValue: string;
  modifyOrder: number;
  modifyOrderValue: string;
  executePendingOrder: number;
  executePendingOrderValue: string;
  deleteTrade: number;
  deleteTradeValue: string;
  cancelTrade: number;
  cancelTradeValue: string;
  autoSquareOff: number;
  autoSquareOffValue: string;
  highLowSLLimitPercentage: boolean;
  highLowSLLimitPercentageValue: string;
  noOfLogin: number;
  lastLoginTime: string;
  lastLogoutTime: string;
  leverage: string;
  cutOff: number;
  allowedDevices: number;
  viewOnly: boolean;
  onlyView: number;
  intraday: number;
  intradayValue: string;
  createdAt: string;
  ipAddress: string;
  deviceToken: string;
  deviceId: string;
  deviceType: string;
  profitLoss: number;
  brokerageTotal: number;
  allowChatWithSuperAdmin: boolean;
  isRent: boolean;
  maximumAllowedMasters: number | null;
  maximumAllowedClients: number | null;
  autoSquareOffPercentage: number;
  isAllowBrkLevUpdate: number;
  minimumDeposit: number;
  maximumDeposit: number;
  minimumWithdraw: number;
  maximumWithdraw: number;
  totalDeposit: number;
  totalWithdraw: number;
}