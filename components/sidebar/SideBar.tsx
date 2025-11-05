"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons — crisp, modern set
import {
  GaugeCircle,
  Eye,
  Building2,
  ActivitySquare,
  ShieldAlert,
  LineChart,
  UserCog,
  CreditCard,
  FileSpreadsheet,
  ArrowUpCircle,
  ArrowDownCircle,
  Grid3x3,
  BarChart2,
  Layers,
  XCircle,
  FileChartColumn,
  TrendingUpDown,
  LifeBuoy,
  BellRing,
  Notebook,
  Users,
  Scale,
  Clock,
  History,
  Image as ImageIcon,
  Megaphone,
  ChevronRight,
  LogOut,
  Bot,
  Shield,
  UserCheck,
  Bell,
  LayoutGrid,
} from "lucide-react";

import UserBadge from "@/hooks/userBadge";
import Link from "next/link";

/* ============================ Types ============================ */
interface SidebarProps {
  collapsed: boolean;
  onPageChange: (page: string) => void;
  currentPage: string;
  isMobile?: boolean;
}

type IconType = React.ComponentType<{ className?: string }>; // lucide-compatible

interface MenuItem {
  id: string;
  label: string;
  icon: IconType;
  visibleFor?: string[]; 
  children?: MenuItem[];
  link?: string;
}

/* ============================ Menu ============================ */
const ALL_MENU_ITEMS: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: GaugeCircle,
    link: "/",
  },
  { id: "watch-list", label: "Watch List", icon: Eye, link: "/watch-list" ,  },

  {
    id: "users",
    label: "User Management",
    icon: UserCog,
    children: [
      {
        id: "user-list",
        label: "User List",
        icon: UserCog,
        link: "/users",
      
      },
      {
        id: "DemoUL",
        label: "Demo User Lead",
        icon: GaugeCircle,
        link: "/users/demo-user",

      },
      {
        id: "negative-user",
        label: "Negative User",
        icon: XCircle,
        link: "/users/negative-user",
        visibleFor: ["Master"]
      },
      {
        id: "user-segments",
        label: "User Segments",
        icon: Users,
        link: "/users/segments",
      },
      {
        id: "bulk-operations",
        label: "Bulk Operations",
        icon: Layers,
        link: "/users/bulk",
      },
      {
        id: "user-timeline",
        label: "Activity Timeline",
        icon: History,
        link: "/users/timeline",
      },
    ],
  },
  {
    id: "ai",
    label: "AI Features",
    icon: Bot,
    children: [
      {
        id: "ai-dashboard",
        label: "AI Dashboard",
        icon: Bot,
        link: "/ai-dashboard",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    children: [
      {
        id: "mfa",
        label: "MFA Settings",
        icon: Shield,
        link: "/security/mfa",
      },
      {
        id: "impersonate",
        label: "User Impersonation",
        icon: UserCheck,
        link: "/security/impersonate",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: UserCog,
    children: [
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        link: "/settings/notifications",
      },
    ],
  },
  {
    id: "dashboard-v2",
    label: "Flexible Dashboard",
    icon: LayoutGrid,
    link: "/dashboard-v2",
  },
  {
    id: "payment",
    label: "Payment",
    icon: CreditCard,
    visibleFor: ["superAdmin","Master","Admin"],

    children: [
      {
        id: "d/w report",
        label: "D/W Report",
        icon: FileSpreadsheet,
        link: "/payment/dw-report",
       
      },
      {
        id: "depositReq",
        label: "Deposit Request",
        icon: ArrowUpCircle,
        link: "/payment",
      
      },
      {
        id: "withdrawReq",
        label: "Withdraw Request",
        icon: ArrowDownCircle,
        link: "/payment/withdraw-requests",

      },
    ],
  },
  {
    id: "view",
    label: "View",
    icon: Grid3x3,
    visibleFor: ["superAdmin","Master","Admin"],

    children: [
      {
        id: "pending-order",
        label: "Pending Orders",
        icon: Clock,
        link: "/view/pending-orders",
       
      },
      {
        id: "tradList",
        label: "Trade List",
        icon: BarChart2,
        link: "/view",
     
      },
      {
        id: "positions",
        label: "Positions",
        icon: Layers,
        link: "/view/positions",
     
      },
      {
        id: "manualTL",
        label: "Manual Trade List",
        icon: FileSpreadsheet,
        link: "/view/manual-trades",
        visibleFor: ["superAdmin","Admin"],
      },
      {
        id: "rejection-list",
        label: "Rejection List",
        icon: XCircle,
        link: "/view/rejection-log",
      
      },
      {
        id: "trade-log-list",
        label: "Trade Log",
        icon: History,
        link: "/view/trade-log",
        
      },
      {
        id: "position-log-list",
        label: "Position Log",
        icon: Notebook,
        link: "/view/position-log",
        
      },
      { id: "client", label: "Client", icon: Users, link: "/view/client", visibleFor: ["superAdmin","Admin"] },
      {
        id: "script-qty",
        label: "Script Quantity",
        icon: FileSpreadsheet,
        link: "/view/script-qty",
        visibleFor: ["Master"],

      },
      {
        id: "market-time",
        label: "Market Timing",
        icon: Clock,
        link: "/view/market-time",
        visibleFor: ["Master"],

      },
      {
        id: "download-bill",
        label: "Download Bill",
        icon: ArrowDownCircle,
        link: "/view/download-bill",
      
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileChartColumn,
    visibleFor: ["superAdmin","Master","Admin"],
    children: [
      {
        id: "account-report",
        label: "Account",
        icon: FileSpreadsheet,
        link: "/reports",
        
      },
      {
        id: "settlement",
        label: "Settlement",
        icon: Scale,
        link: "/reports/settlement",
       
      },
      {
        id: "profit-loss",
        label: "Profit Loss",
        icon: TrendingUpDown,
        link: "/reports/profit-loss",
        
      },
      {
        id: "ledger-account-report",
        label: "Ledger Account Report",
        icon: Notebook,
        link: "/reports/ledger-account",
       
      },
      {
        id: "user-auto-sq-alert",
        label: "User Auto SQ Alert",
        icon: BellRing,
        link: "/reports/auto-sq-alert",
        
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: ActivitySquare,
    visibleFor: ["superAdmin","Master","Admin"],
    children: [
      {
        id: "risk-analysis",
        label: "Risk Analysis",
        icon: ShieldAlert,
        link: "/analytics",

      },
      {
        id: "top-10-insights",
        label: "Top 10 Insights",
        icon: LineChart,
        link: "/analytics/top10-insights",
      },
    ],
  },
  {
    id: "announcement",
    label: "Announcement",
    icon: Megaphone,
    link: "/announcement",
    visibleFor: ["Master"],

  },
  {
    id: "rules&regulation",
    label: "Rules & Regulations",
    icon: Scale,
    link: "/rules",
    visibleFor: ["Master"],

  },
  {
    id: "create-group",
    label: "Create Groups",
    icon: Users,
    link: "/group",
    visibleFor: ["superAdmin"]
  },
  {
    id: "help-center",
    label: "Help Center",
    icon: LifeBuoy,
    link: "/help-center",
    visibleFor: ["superAdmin","Master"]

  },
];

/* ============================ Theme ============================ */
const BRAND_BG = "#181a20";
const BRAND_BORDER = "#1e2329";

function Caret({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={cn(
        "h-3 w-3 md:h-4 md:w-4 transition-transform duration-200",
        open && "rotate-90"
      )}
      aria-hidden
    />
  );
}

type MenuButtonProps = {
  item: MenuItem;
  depth: number;
  collapsed: boolean;
  active: boolean;
  expanded: boolean;
  hasChildren: boolean;
  onClick: () => void;
};

function MenuButton({
  item,
  depth,
  collapsed,
  active,
  expanded,
  hasChildren,
  onClick,
}: MenuButtonProps) {
  const baseSpacing =
    depth > 0
      ? "ml-3 md:ml-4 w-[calc(100%-0.75rem)] md:w-[calc(100%-1rem)]"
      : "";

  return (
    <Link
      href={`/admin/${item.link || "#"}`}
      className="flex gap-2 items-center"
    >
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2 md:gap-3 transition-all duration-200 group text-sm md:text-base h-9 md:h-10",
          baseSpacing,
          collapsed && "justify-center px-1 md:px-2",
          active
            ? "bg-[#1e2329] text-white border-r-2 border-[#fcd535] font-semibold"
            : "text-[#848E9C] hover:bg-[#fcd535]/20 hover:text-[#fcd535]"
        )}
        data-active={active ? "true" : "false"}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-haspopup={hasChildren ? "tree" : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <item.icon
          className={cn(
            "h-4 w-4 md:h-5 md:w-5 transition-colors",
            active ? "text-white" : "text-current"
          )}
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {hasChildren && <Caret open={expanded} />}
          </>
        )}
      </Button>
    </Link>
  );
}

/* ============================ Tree ============================ */
type ItemTreeProps = {
  items: MenuItem[];
  collapsed: boolean;
  expandedItems: string[];
  currentPage: string;
  onToggle: (id: string) => void;
  onLeafClick: (id: string) => void;
  depth?: number;
};

function ItemTree({
  items,
  collapsed,
  expandedItems,
  currentPage,
  onToggle,
  onLeafClick,
  depth = 0,
}: ItemTreeProps) {
  return (
    <>
      {items.map((item) => {
        const hasChildren = !!item.children?.length;
        const expanded = expandedItems.includes(item.id);
        const active = currentPage === item.id;

        const button = (
          <MenuButton
            key={item.id}
            item={item}
            depth={depth}
            collapsed={collapsed}
            active={active}
            expanded={expanded}
            hasChildren={hasChildren}
            onClick={() =>
              hasChildren ? onToggle(item.id) : onLeafClick(item.id)
            }
          />
        );

        return (
          <div key={item.id} className="space-y-1">
            {collapsed ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="px-2 py-1 bg-[#1e2329] text-[#fcd535]"
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              button
            )}

            {hasChildren && !collapsed && expanded && (
              <div
                className="space-y-1 animate-slide-in"
                role="group"
                aria-label={item.label}
              >
                <ItemTree
                  items={item.children!}
                  collapsed={collapsed}
                  expandedItems={expandedItems}
                  currentPage={currentPage}
                  onToggle={onToggle}
                  onLeafClick={onLeafClick}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ============================ Main Component ============================ */
export function DashboardSidebar({
  collapsed,
  onPageChange,
  currentPage,
  isMobile,
}: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(["dashboard"]);
  const { data: session } = useSession();
  const role = (session?.user as any)?.roleName || "";

  const username = (session?.user as any)?.user;


  function filterMenuByRole(menu: MenuItem[], userRole: string): MenuItem[] {
  return menu
    .filter(item => !item.visibleFor || item.visibleFor.includes(userRole))
    .map(item => ({
      ...item,
      children: item.children
        ? filterMenuByRole(item.children, userRole)
        : undefined,
    }));
}

const filteredMenu = useMemo(() => {
  return filterMenuByRole(ALL_MENU_ITEMS, role);
}, [role]);
  useEffect(() => {
    const ensureParentsExpanded = () => {
      const parentsToOpen: string[] = [];
      const walk = (items: MenuItem[], parentId?: string) => {
        for (const it of items) {
          if (it.id === currentPage && parentId) parentsToOpen.push(parentId);
          if (it.children?.length) walk(it.children, it.id);
        }
      };
      walk(filteredMenu);
      if (parentsToOpen.length) {
        setExpandedItems((prev) =>
          Array.from(new Set([...prev, ...parentsToOpen]))
        );
      }
    };
    ensureParentsExpanded();
  }, [currentPage, filteredMenu]);


  // Toggle expand (no-op when collapsed)
  const toggleExpanded = useCallback(
    (itemId: string) => {
      if (collapsed) return;
      setExpandedItems((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId]
      );
    },
    [collapsed]
  );

  // Leaf click: change page immediately
  const handleLeafClick = useCallback(
    (id: string) => {
      onPageChange(id);
    },
    [onPageChange]
  );

  const handleLogout = useCallback(async () => {
    try {
      localStorage.clear();
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (e) {
      console.error("Logout error:", e);
    }
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-r transition-all duration-300",
        isMobile && !collapsed && "fixed inset-y-0 left-0 z-50",
        collapsed ? "w-12 md:w-16" : "w-56 md:w-64"
      )}
      style={{ backgroundColor: BRAND_BG, borderColor: BRAND_BORDER }}
      aria-label="Primary"
      role="navigation"
    >
      <UserBadge
        role={session?.user ? (session.user as any).roleName : ""}
        username={session?.user ? (session.user as any).userName: ""}
        size={collapsed ? 24 : 36}
        collapsed={collapsed}
      />

      {/* Navigation */}
      <nav
        className="flex-1 p-2 md:p-4 space-y-1 md:space-y-2 custom-scrollbar overflow-y-auto"
        aria-label="Sidebar Menu"
      >
        <ItemTree
          items={filteredMenu}
          collapsed={collapsed}
          expandedItems={expandedItems}
          currentPage={currentPage}
          onToggle={toggleExpanded}
          onLeafClick={handleLeafClick}
        />
      </nav>

      {/* Sign Out */}
      <div
        className="p-2 md:p-4 border-t"
        style={{ borderColor: BRAND_BORDER }}
       >
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 md:gap-3 transition-all text-sm md:text-base h-9 md:h-10",
            collapsed && "justify-center px-1 md:px-2",
            "text-[#848E9C] hover:bg-[#fcd535]/20 hover:text-[#fcd535]"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 md:h-5 md:w-5" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
