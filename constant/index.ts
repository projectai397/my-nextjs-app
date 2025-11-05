//const { REACT_APP_MY_ENV } = process.env;

//export const ADMIN_API_ENDPOINT = 'http://localhost:4000/api/v1/';
export const ADMIN_API_ENDPOINT = process.env.NEXT_PUBLIC_ADMIN_API_ENDPOINT;
export const APP_FRONT_URL = process.env.REACT_APP_FRONT_URL;
export const IS_BROKER_LOGIN = process.env.REACT_APP_IS_BROKER_LOGIN;
//'https://a.domain.com:4001/api/v1/';


export const SUCCESS = 200;
export const SERVERERROR = 500;
export const FAILURE = 400;
export const UNAUTHORISED = 401;
export const DELETED = 3;
export const ACTIVE = 1;
export const INACTIVE = 2;
export const CREDIT = "credit";
export const DEBIT = "debit";
export const SUPER_ADMIN = '64b63755c71461c502ea4713';
export const ADMIN = '64b63755c71461c502ea4714';
export const MASTER = '64b63755c71461c502ea4715';
export const BROKER = '690461be85e7e3ace4db139b';
export const CLIENT = '64b63755c71461c502ea4717';
export const OFFICE = '690461c785e7e3ace4db139c';

export const MANUALLY_TRADE_ADDED_FOR = [{ label: "superAdmin", value: "superAdmin" }, {
    label: "Client",
    value: "Client"
}, { label: "market", value: "market" }];
export const TRANSACTION_TYPE = [{ label: "All", value: "" }, { label: "Credit", value: "credit" }, {
    label: "Debit",
    value: "debit"
}];
export const MCX = 'MCX';
export const CE_PE = 'CE/PE';
export const BUY = 'buy';
export const SELL = 'sell';
export const MARKET = 'market';
export const LIMIT = 'limit';
export const STOPLOSS = 'stopLoss';
export const INTRADAY = 'intraday';
export const LONGTERM = 'longTerm';
export const EXECUTED = 'executed';
export const PENDING = 'pending';
export const AUTH_LOGIN = 'user/login';
export const AUTH_USER = 'user/view-profile';
export const CHANGE_PASSWORD = 'user/change-password';
export const APPROVED_TRANSACTION = 1;
export const PENDING_TRANSACTION = 2;
export const DISAPPROVED_TRANSACTION = 1;

export const ROLE_LIST = 'role/list';
export const GET_USERS = 'users';
export const USER_LIST = 'user/list';
export const NEGATIVE_USER_LIST = 'user/negative-list';
export const UPDATE_NEGATIVE_USER_LIST = 'user/update-negative-list';
export const USER_LIST_EXPORT = 'user/list/export';
export const USER_CHILD_LIST = 'user/child-list';
export const NEGATIVE_USER_CHILD_LIST = 'user/negative-child-list';
export const UPDATE_NEGATIVE_USER_CHILD_LIST = 'user/update-negative-child-list';
export const USER_PHONE_INQUIRY_LIST = 'user/list-phone-inquiry';
export const USER_PHONE_INQUIRY_LIST_EXPORT = 'user/list-phone-inquiry/export';
export const USER_ALL_CHILD_LIST = 'user/all-users-child-list';
export const ALL_USER_LIST = 'user/all-users'
export const ALL_USER_BALANCE = 'user/all-user-balance'
export const BANNER_VIEW_FOR_USER_IN = 'banner/view-for-user-in';
export const DEPOSIT_PROFIT_LOSS = 'transactions/deposit-profit-loss';
export const WITHDRAW_PROFIT_LOSS = 'transactions/withdraw-profit-loss';
export const CREDIT_DEPOSIT = 'transactions/credit-deposit';
export const USER_CHANGE_INFO = 'users/change-info';
export const USER_CHANGE_PASSWORD = 'users/change-password';
export const ADMIN_CHANGE_PASSWORD = 'user/change-password-to-admin';
export const ADMIN_CHANGE_STATUS = 'user/change-status';
export const DELETE_DEMO_USER = 'user/delete-demo-user';
export const CREATE_USER = 'user/create';
export const EDIT_USER = 'user/edit';
export const USER_UPDATE_BROKERAGE_LEVERAGE = 'user/update-brokerage-leverage';
export const USER_UPDATE_BROKERAGE_LEVERAGE_FOR_MASTER = 'user/update-brokerage-leverage-for-master';
export const UPDATE_USER = 'users';
export const USER_LOGO_EDIT = 'user/logo-edit';
export const USER_CHECK_U_DATA = 'user/check-u-data';
export const USER_RULES_REGULATION_VIEW = 'user-rules-and-regulation/view';
export const USER_RULES_REGULATION_CREATE_EDIT = 'user-rules-and-regulation/create-edit';
export const USER_SOCIAL_URL_UPDATE = 'user/social-url-update';
export const USER_SEARCH_LIST = 'user/search-list';
export const USER_BROKER_LIST = 'user/list-broker';
export const MANUALLY_TRADE_SUPER_ADMIN = 'manually-trade-super-admin/create';
export const SHIFT_USER = 'user/shift';

export const EXCHANGE_LIST_WITH_GROUP = 'exchange/list-with-group';
export const EXCHANGE_LIST = 'exchange/list';
export const SYMBOL_LIST = 'symbol/list';
export const GROUP_LIST = 'group/list';
export const BANK_DETAILS_LIST = 'bank-details/list';
export const BANK_DETAILS_CREATE_EDIT = 'bank-details/create-edit';
export const BANK_DETAILS_VIEW = 'bank-details/view';
export const BANK_DETAILS_GET_BANK_FOR_ATS = 'bank-details/get-bank-for-ats';
export const BANK_DETAILS_VIEW_FOR_USER = 'bank-details/view-for-user';
export const BANNER_LIST = 'banner/list';
export const BANNER_CREATE_EDIT = 'banner/create-edit';
export const BANNER_VIEW = 'banner/view';
export const ANNOUNCEMENT_LIST_LIST = 'announcement-list/list';
export const ANNOUNCEMENT_CREATE_EDIT = 'announcement/create-edit';
export const ANNOUNCEMENT_VIEW = 'announcement/view';
export const ADD_DEPOSIT = 'admin-add-deposit';
export const ADD_WITHDRAWAL = 'admin-add-withdrawal';
export const LIST_PAYMENT_REQUEST = 'list-payment-request';
export const PAYMENT_REQUEST_CHANGE_STATUS = 'payment-request-change-status';
export const PAYMENT_REQUEST_MK = 'payment-request-mk';
export const SEND_TO_ATS = 'send-to-ats';
export const SEND_TO_WITHDRAWAL = 'send-to-withdrawal';
export const ATS_TRANSACTION_STATUS_CHECK = 'ats-transaction-status-check';
export const ATS_METHOD_LIST = 'ats-method/list';
export const LEDGER_ACCOUNT_REPORT = 'ledger-account-report';
export const LEDGER_ACCOUNT_REPORT_EXPORT = 'ledger-account-report/export';
export const BILL_GENERATE = 'bill-generate';

export const TRADE_LIST = 'trade/list';
export const TRADE_LIST_EXPORT = 'trade/list/export';
export const MANUALLY_TRADE_LIST = 'manually-trade/list';
export const REJECT_TRADE_LIST = 'reject-trade/list';
export const TRADE_LOG_LIST = 'trade/log-list';
export const POSITION_LOG_LIST = 'position/log-list';
export const POSITION_LIST = 'position/list';
export const SYMBOL_POSITION_LIST = 'symbol-position/list';
export const ANNOUNCEMENT_LIST = 'announcement/list';
export const USER_WISE_PROFIT_LOSS_LIST = 'user-wise-profit-loss/list';
export const GENERATE_POINTS = 'transactions/generate-points';
export const GET_TRANSACTIONS = 'transactions';
export const SETTLEMENT_LIST = 'settlement/list';
export const ASSIGN_GROUP_LIST = 'assign-group/list';
export const USER_WISE_EXCHANGE_LIST = 'user-wise-exchange/list';
export const USER_WISE_SYMBOL_LIST = 'user-wise-symbol/list';
export const USER_WISE_SYMBOL_LIST_WITHCOUNT = 'user-wise-symbol/list-withcount';
export const USER_WISE_SYMBOL_EDIT = 'user-wise-symbol/create-edit';
export const DELETE_TRADE = 'trade/delete';
export const EXCHANGE_TIME_SCHEDULE_LIST = 'exchange-time-schedule/list';
export const HOLIDAY_LIST = 'holiday/list';
export const GET_USER_TAB_LIST_WITH_SYMBOL = 'user/get-user-tab-list-with-symbol';
export const GET_USER_TAB_WISE_SYMBOLS_LIST = 'user/get-user-tab-wise-symbols-list';
export const SYMBOL_SEARCH_LIST = 'symbol/search-list';
export const DELETE_USER_TAB_SYMBOL = 'user/delete-user-tab-symbol';
export const POST_USER_TAB_WISE_SYMBOL = 'user/post-user-tab-wise-symbols';
export const POST_USER_TAB_SYMBOL_CHANGE_SEQUENCE = 'user/post-tab-symbol-change-sequence';
export const Dashboard = 'Dashboard';
export const Widgets = 'Widgets';
export const Notification = 'Notification';
export const Chat = 'Chat';

export const Earnings = 'Earnings';
export const Products = 'Products';
export const Messages = 'Messages';
export const NewUser = 'New User';

export const New = 'New';
export const Pending = 'Pending';
export const Done = 'Done';
export const Smooth = 'Smooth';
export const Running = 'Running';
export const Cancel = 'Cancel';

export const Profit = 'Profit';
export const Manager = 'Manager';
export const Follower = 'Follower';
export const Following = 'Following';
export const GooglePlus = 'Google +';
export const Github = 'Github';

export const Daily = 'Daily';
export const Weekly = 'Weekly';
export const Yearly = 'Yearly';
export const Monthly = 'Monthly';
export const Hot = 'Hot';
export const Date = 'Date';
export const Month = 'Month';
export const Week = 'Week';
export const Sale = 'Sale';
export const Year = 'Year';
export const Today = 'Today';
export const HikeShoes = 'Hike Shoes';
export const CouponCode = 'coupon code';
export const TreePot = 'Tree Pot';
export const Bag = 'Bag';
export const Watch = 'Watch';
export const TShirt = 'T-shirt';

export const Johnketer = 'John keter';
export const HerryVenter = 'Herry Venter';
export const LoainDeo = 'loain deo';
export const HorenHors = 'Horen Hors';
export const InProcess = 'In process';
export const FenterJessy = 'fenter Jessy';

export const Sales = 'Sales';
export const Online = 'Online';


export const Details = 'Details';
export const Quantity = 'Quantity';
export const Status = 'Status';
export const Price = 'Price';

export const Name = 'Name';
export const ContactUs = 'Contact Us';
export const Contact = 'Contact';
export const Email = 'Email';

// dashboard charts

export const Earning = 'Earning';
export const Expense = 'Expense';
export const Cancelled = 'Cancelled';
export const profit = 2_302;
export const Activity = 'Activity';
export const Refunds = 'Refunds';
export const Create = 'Create';
export const Trade = 'Trade';

export const USD = 'USD';
export const BTC = 'BTC';
export const LTC = 'LTC';
export const ETH = 'ETH';
export const Medium = 'Medium';
export const LowestPrices = 'Lowest Prices';
export const HighestPrices = 'Highest Prices';
export const BuyNow = 'Buy Now';
export const Availability = 'Availability';
export const Pricing = 'Pricing';
export const Purchase = 'Purchase';
export const CheckOut = 'check out';
export const EmailAddress = 'Email Address';

export const Product = 'Product';
export const Total = 'Total';
// invoice
export const Cuba = 'Cuba';
export const Sub_total = 'Sub-total';
export const Print = 'Print';
export const BOD = 'BOD';
export const Designer = 'designer';
export const Like = 'Like';
export const Password = 'Password';
export const Delete = 'Delete';
export const Active = 'Active';
export const Inbox = 'Inbox';
export const To = 'To';
export const API = 'API';
export const All = 'All';
export const Description = 'Description';
export const General = 'General';
export const Views = 'Views';
export const JasonBorne = 'Jason Borne';
export const BuckyBarnes = 'Bucky Barnes';
export const SarahLoren = 'Sarah Loren';
export const ComerenDiaz = 'Comeren Diaz';
export const AndewJon = 'Andew Jon';
export const JohnyWaston = 'Johny Waston';
export const JohnyWilliam = 'Johny William';
export const AddFriend = 'Add Friend';
export const Age = 'Age';
export const History = 'History';
export const Male = 'Male';
export const Female = 'Female';

export const Color = 'Color';
export const secondary = 'Secondary';
export const Success = 'Success';
export const Pink = 'Pink';

export const Padding = 'Padding';
export const Float = 'Float';
export const Overflow = 'Overflow';
export const Position = 'Position';
export const Order = 'Order';
export const Timeline = 'Timeline';
export const LogOut = 'Log Out';
export const Ribbon = 'Ribbon';
export const Data = 'Data';
export const Bootstrap = 'Bootstrap';
export const Default = 'Default';
export const Icons = 'Icons';
export const Search = 'Search';
export const Vertical = 'Vertical';
export const Checked = 'Checked';

export const Login = 'Login';
export const YY = 'YY';
export const Id = 'Id';
export const thead = 'thead ';
export const Use = 'Use';
export const Game = 'Game';
export const classname = 'class Name';
export const Hours = 'Hours';
// pages
export const RememberPassword = 'Remember password';
export const ForgotPassword = 'Forgot password?';
export const SignIn = 'Sign In';
export const AUTH0 = 'AUTH0';
export const JWT = 'JWT';
export const LoginWithJWT = 'Sign in With Jwt';
export const BACK_TO_HOME_PAGE = 'BACK TO HOME PAGE';
export const WE_ARE_COMING_SOON = 'WE ARE COMING SOON';

export const SampleCard = 'Sample Card';
export const Language = 'Language';
export const Text = 'Text';
export const Image = 'Image';
export const Category = 'Category';
export const Post = 'Post';
export const Period = 'Period';
export const NewYork = 'New York';
export const Design = 'Design';
export const Management = 'Management';
export const Progress = 'Progress';

// faq anf knowledgebase
export const Articles = 'Articles';
export const Knowledgebase = 'Knowledgebase';
export const Support = 'Support';
export const Navigation = 'Navigation';
export const Tutorials = 'Tutorials';
export const HelpCenter = 'Help center';
export const VideoTutorials = 'Video Tutorials';

export const AskOurCommunity = 'Ask our community';
export const VictoriaWilson = 'Victoria Wilson';

// layout
export const Loading = 'Loading...';
export const Authentication = 'Authentication';

export const English = 'English';
export const Deutsch = 'Deutsch';
export const Español = 'Español';
export const Français = 'Français';
export const Português = 'Português';
export const 简体中文 = '简体中文';
export const DeliveryProcessing = 'Delivery processing';
export const OrderComplete = 'Order Complete';
export const TicketsGenerated = 'Tickets Generated';
export const DeliveryComplete = 'Delivery Complete';
export const CHECKALL = 'CHECK ALL';
export const Cart = 'Cart';
export const OrderTotal = 'Order Total';
export const GOTOYOURCART = 'GO TO YOUR CART';
export const Admin = 'Admin';
export const Profile = 'Profile';
export const ChangePassword = 'Change Password';
export const Account = 'Account';

export const QuickOption = 'Quick option';
export const Document = 'Document';
export const CheckFeatures = 'Check features';
export const UnlimitedColor = 'Unlimited Color';
export const Apply = 'Apply';
export const Customizer = 'Customizer';
export const Configuration = 'Configuration';
export const CopyText = 'Copy text';
export const LTR = 'LTR';
export const RTL = 'RTL';
export const Box = 'Box';
export const SidebarType = 'Sidebar Type';
export const SidebarSettings = 'Sidebar settings';
export const Border = 'Border';
export const IconColor = 'icon Color';

export const RouterAnimation = 'Router Animation';
export const ZoomFade = 'Zoom Fade';
export const SildeFade = 'Silde Fade';
export const FadeBottom = 'Fade Bottom';
export const Fade = 'Fade';
export const ZoomOut = 'Zoom Out';
export const None = 'None';
export const MixLayout = 'Mix Layout';
export const Bookmark = 'Bookmark';
export const AddNewBookmark = 'Add New Bookmark';
export const Back = 'Back';

export const ALLOWED_FINSVIX_ATS_MAIN_DOMAINS = ['login.bullsfx.co']
