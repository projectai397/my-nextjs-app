
'use client'; 

import { useState, useEffect } from 'react';
import { DashboardHeader } from "@/components/sidebar/dashboard-header";
import { DashboardSidebar } from "@/components/sidebar/SideBar";
import  DashboardContent  from "@/components/sidebar/dashboard-content";

export default function HomePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This ensures that `window` is only accessed on the client side.
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) {
          setSidebarCollapsed(true);
        }
      };

      checkMobile(); // Initial check
      window.addEventListener('resize', checkMobile); // Add event listener

      // Cleanup the event listener
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []); // Empty dependency array ensures it runs only once after initial mount

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      {/* <DashboardSidebar
        collapsed={sidebarCollapsed}
        onPageChange={setCurrentPage}
        currentPage={currentPage}
        isMobile={isMobile}
      /> */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 ">
        {/* <DashboardHeader onMenuToggle={toggleSidebar} sidebarCollapsed={sidebarCollapsed}  /> */}
        <DashboardContent currentPage={currentPage} />
      </div>
    </div>
  );
}
