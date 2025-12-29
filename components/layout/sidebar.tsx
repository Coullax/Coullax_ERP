"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  FileText,
  Clock,
  BarChart3,
  Calendar,
  Bell,
  HelpCircle,
  Settings,
  UserCircle,
  Shield,
  FolderOpen,
  UserCog,
  History,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Paperclip,
  Briefcase,
  DollarSign,
  UserSquare2,
  Package,
  Wrench,
  Megaphone,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { getPendingVerificationsCount } from "@/app/actions/verification-actions";
import { getPendingRequestsCount, getTeamLeadPendingRequestsCount, getAwaitingProofSubmissionCount, getPendingDocumentRequestsCount } from "@/app/actions/request-actions";

const employeeNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/employee" },
  // { icon: UserCircle, label: "Profile", href: "/profile" },
  { icon: FileCheck, label: "Verification", href: "/verification" },
  { icon: FileText, label: "Requests", href: "/requests" },
  { icon: Clock, label: "Attendance", href: "/attendance" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: FolderOpen, label: "Documents", href: "/documents" },
  { icon: DollarSign, label: "Salary", href: "/employee/salary" },
  { icon: Bell, label: "Notifications", href: "/notifications", badge: 0 },
  { icon: UserCircle, label: "Profile", href: "/profile" },
  { icon: HelpCircle, label: "Help Center", href: "/help" },
  { icon: Users, label: "My Team", href: "/my-team" },
  { icon: Users, label: "Coullax Family", href: "/coullax-family" },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Employees", href: "/admin/employees" },
  { icon: Paperclip, label: "Policies", href: "/admin/policies" },
  { icon: FileCheck, label: "Verifications", href: "/admin/verifications", badge: 0 },
  { icon: FileText, label: "Approvals", href: "/admin/approvals" },
  { icon: Briefcase, label: "Designations", href: "/admin/designations" },
  { icon: Clock, label: "Attendance", href: "/admin/attendance" },
  {
    icon: DollarSign,
    label: "Salary",
    isExpandable: true,
    subItems: [
      { icon: DollarSign, label: "Base Salary Setup", href: "/admin/salary/base-salary" },
      { icon: Settings, label: "Salary Setup", href: "/admin/salary/setup" },
      { icon: UserSquare2, label: "Employee Category Assign", href: "/admin/salary/category-assign" },
      { icon: DollarSign, label: "Salary Processing", href: "/admin/salary" },
    ],
  },
  {
    icon: FolderOpen,
    label: "Document Requests",
    href: "/admin/document-requests",
  },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: UserSquare2, label: "Visitors", href: "/admin/visitors" },
  { icon: Megaphone, label: "Announcements", href: "/admin/announcements" },
];

const superAdminSections = [
  {
    title: "Super Admin",
    items: [
      { icon: Shield, label: "Admins", href: "/super-admin/admins" },
      { icon: Building2, label: "Departments", href: "/super-admin/departments" },
      { icon: UserCog, label: "Roles", href: "/super-admin/roles" },
      { icon: History, label: "Audit Logs", href: "/super-admin/audit-logs" },
      { icon: Settings, label: "Settings", href: "/super-admin/settings" },
      {
        icon: Package,
        label: "Inventory",
        isExpandable: true,
        subItems: [
          { icon: Plus, label: "Inventory Categories", href: "/super-admin/inventory-categories" },
          { icon: Package, label: "General Inventory", href: "/super-admin/inventory" },
          { icon: Wrench, label: "Maintenance Inventory", href: "/super-admin/maintenance-inventory" },
          { icon: Package, label: "Bin Inventory", href: "/super-admin/bin-inventory" }
        ],
      },
    ],
  },
];

const teamLeadSections = [
  {
    title: "Team Lead",
    items: [
      { icon: FileText, label: "Approvals", href: "/team-lead/approvals", badge: 0 },
      { icon: Users, label: "Team Members", href: "/team-lead/team-members" },
      { icon: Users, label: "Team Members Attendance", href: "/team-lead/team-members-attendance" },
    ],
  },
];

const departmentHeadSections = [
  {
    title: "Department Head",
    items: [
      { icon: FileText, label: "Approvals", href: "/department-head/approvals" },
      { icon: Users, label: "Teams", href: "/department-head/teams" },
    ],
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [teamLeadPendingCount, setTeamLeadPendingCount] = useState(0);
  const [awaitingProofCount, setAwaitingProofCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingDocumentRequestsCount, setPendingDocumentRequestsCount] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ "Inventory": true, "Salary": true });
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin, isSuperAdmin, isTeamLead, isDepartmentHead, setUser, setProfile } =
    useAuthStore();

  // Fetch pending verifications and approvals count for admins and team leads
  useEffect(() => {
    const fetchPendingCounts = async () => {
      const isUserAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
      const userId = profile?.id;

      if (isUserAdmin) {
        try {
          const [verificationsCount, approvalsCount, documentRequestsCount] = await Promise.all([
            getPendingVerificationsCount(),
            getPendingRequestsCount(),
            getPendingDocumentRequestsCount()
          ]);
          setPendingVerificationsCount(verificationsCount);
          setPendingApprovalsCount(approvalsCount);
          setPendingDocumentRequestsCount(documentRequestsCount);
        } catch (error) {
          console.error('Sidebar: Failed to fetch pending counts:', error);
        }
      }

      // Fetch team lead pending count
      if (userId) {
        try {
          const teamLeadCount = await getTeamLeadPendingRequestsCount(userId);
          setTeamLeadPendingCount(teamLeadCount);
        } catch (error) {
          console.error('Sidebar: Failed to fetch team lead pending count:', error);
        }
      }

      // Fetch awaiting proof submission count for employees
      if (userId && !isUserAdmin) {
        try {
          const proofCount = await getAwaitingProofSubmissionCount(userId);
          setAwaitingProofCount(proofCount);
        } catch (error) {
          console.error('Sidebar: Failed to fetch awaiting proof count:', error);
        }
      }

      // Fetch unread notifications count for all users
      try {
        const response = await fetch('/api/notifications?unread_only=true');
        if (response.ok) {
          const data = await response.json();
          setUnreadNotificationsCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Sidebar: Failed to fetch unread notifications count:', error);
      }
    };

    fetchPendingCounts();

    // Refresh counts every 30 seconds
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, [profile?.role, profile?.id]);

  // Update admin nav items with pending counts
  const mainItems = isSuperAdmin() || isAdmin()
    ? adminNavItems.map(item => {
      if (item.href === '/admin/verifications') {
        return { ...item, badge: pendingVerificationsCount };
      } else if (item.href === '/admin/approvals') {
        return { ...item, badge: pendingApprovalsCount };
      } else if (item.href === '/admin/document-requests') {
        return { ...item, badge: pendingDocumentRequestsCount };
      }
      return item;
    })
    : employeeNavItems.map(item => {
      if (item.href === '/requests') {
        return { ...item, badge: awaitingProofCount, badgeColor: 'red' };
      } else if (item.href === '/notifications') {
        return { ...item, badge: unreadNotificationsCount };
      }
      return item;
    });

  // Update team lead sections with pending count
  const updatedTeamLeadSections = teamLeadSections.map(section => ({
    ...section,
    items: section.items.map(item =>
      item.href === '/team-lead/approvals'
        ? { ...item, badge: teamLeadPendingCount }
        : item
    )
  }));

  const sections = isSuperAdmin() ? superAdminSections : isTeamLead() ? updatedTeamLeadSections : isDepartmentHead() ? departmentHeadSections : [];

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      setUser(null);
      setProfile(null);

      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to logout");
    }
  };

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Filter function for search
  const matchesSearch = (item: any, query: string): boolean => {
    if (!query.trim()) return true;
    const lowerQuery = query.toLowerCase();

    // Check if label matches
    if (item.label.toLowerCase().includes(lowerQuery)) return true;

    // Check if any sub-items match
    if (item.subItems) {
      return item.subItems.some((subItem: any) =>
        subItem.label.toLowerCase().includes(lowerQuery)
      );
    }

    return false;
  };

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-gray-100 px-0.5 rounded">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  };

  // Filter items based on search
  const filteredMainItems = mainItems.filter(item => matchesSearch(item, searchQuery));
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => matchesSearch(item, searchQuery))
  })).filter(section => section.items.length > 0);

  const NavItem = ({ item, isCollapsed, isSubItem = false }: { item: any; isCollapsed: boolean; isSubItem?: boolean }) => {
    // Check if expandable (has subItems)
    if (item.isExpandable && item.subItems) {
      const isExpanded = expandedSections[item.label];
      const Icon = item.icon;
      const hasActiveSubItem = item.subItems.some((subItem: any) =>
        pathname === subItem.href || pathname.startsWith(subItem.href + "/")
      );

      // Filter sub-items based on search
      const filteredSubItems = item.subItems.filter((subItem: any) =>
        matchesSearch(subItem, searchQuery)
      );

      // Auto-expand if searching and has matching sub-items
      const shouldExpand = searchQuery.trim() ? filteredSubItems.length > 0 : isExpanded;

      return (
        <div>
          <button
            onClick={() => toggleSection(item.label)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
              hasActiveSubItem
                ? "bg-primary/10 text-gray-900 dark:text-primary"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
              isCollapsed && "justify-center px-2"
            )}
          >
            <Icon className={cn("w-5 h-5 flex-shrink-0")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{highlightText(item.label, searchQuery)}</span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  shouldExpand && "rotate-180"
                )} />
              </>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>
          {!isCollapsed && shouldExpand && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-800 pl-2">
              {filteredSubItems.map((subItem: any) => (
                <NavItem key={subItem.href} item={subItem} isCollapsed={isCollapsed} isSubItem={true} />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Regular nav item
    // For sub-items, use exact match to prevent false positives
    // For main items, allow startsWith for nested routes
    const isActive = isSubItem
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
          isCollapsed && "justify-center px-2",
          isSubItem && "py-2 text-xs"
        )}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0", isSubItem && "w-4 h-4")} />
        {!isCollapsed && (
          <>
            <span className="flex-1">{highlightText(item.label, searchQuery)}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge className={
                cn(
                  `h-5 min-w-5 flex items-center justify-center px-1.5 !bg-red-500 !text-white hover:bg-red-600`,
                  item.badgeColor === 'red'
                    ? ""
                    : isActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary text-primary-foreground"
                )
              }>
                {item.badge}
              </Badge>
            )}
          </>
        )
        }
        {
          isCollapsed && item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )
        }
        {
          isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500  rounded-full text-xs">
                  {item.badge}
                </span>
              )}
            </div>
          )
        }
      </Link >
    );
  };

  return (
    <motion.aside
      // initial={{ x: -280 }}
      // animate={{
      //   x: 0,
      //   width: isCollapsed ? 80 : 288
      // }}
      // transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-30 h-screen border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary-foreground">
                C
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-base truncate">COULLAX</h1>
                <p className="text-xs text-gray-500">Employee Management Portal</p>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 ml-2"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Search */}
        {/* {!isCollapsed && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            />
          </div>
        )} */}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-hide">
        {/* Main Items */}
        <div className="space-y-1">
          {filteredMainItems.map((item) => (
            <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Sections */}
        {filteredSections.map((section, idx) => (
          <div key={idx}>
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
            )}
            {isCollapsed && <div className="border-t border-gray-200 dark:border-gray-800 my-2" />}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {!isCollapsed && (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {profile ? getInitials(profile.full_name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.full_name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {profile?.email || ""}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56"
            side="top"
            sideOffset={5}
          >
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserCircle className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowLogoutDialog(true)}
              className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isCollapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex justify-center">
                <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {profile ? getInitials(profile.full_name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
              side="top"
              sideOffset={5}
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <UserCircle className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowLogoutDialog(true)}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page and will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.aside>
  );
}
