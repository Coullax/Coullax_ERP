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
  { icon: DollarSign, label: "Salary", href: "/admin/salary" },
  {
    icon: FolderOpen,
    label: "Document Requests",
    href: "/admin/document-requests",
  },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: UserSquare2, label: "Visitors", href: "/admin/visitors" },
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
      { icon: Package, label: "General Inventory", href: "/super-admin/inventory" },
      { icon: Package, label: "Bin Inventory", href: "/super-admin/bin-inventory" },
      { icon: Wrench, label: "Maintenance Inventory", href: "/super-admin/maintenance-inventory" },
    ],
  },
];

const teamLeadSections = [
  {
    title: "Team Lead",
    items: [
      { icon: FileText, label: "Approvals", href: "/team-lead/approvals" },
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
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin, isSuperAdmin, isTeamLead, isDepartmentHead, setUser, setProfile } =
    useAuthStore();

  // Fetch pending verifications count for admins
  useEffect(() => {
    const fetchPendingCount = async () => {
      const isUserAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

      if (isUserAdmin) {
        try {
          const count = await getPendingVerificationsCount();
          setPendingVerificationsCount(count);
        } catch (error) {
          console.error('Sidebar: Failed to fetch pending verifications count:', error);
        }
      }
    };

    fetchPendingCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [profile?.role]);

  // Update admin nav items with pending count
  const mainItems = isSuperAdmin() || isAdmin()
    ? adminNavItems.map(item => {
      const updatedItem = item.href === '/admin/verifications'
        ? { ...item, badge: pendingVerificationsCount }
        : item;
      return updatedItem;
    })
    : employeeNavItems;
  const sections = isSuperAdmin() ? superAdminSections : isTeamLead() ? teamLeadSections : isDepartmentHead() ? departmentHeadSections : [];

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

  const NavItem = ({ item, isCollapsed }: { item: any; isCollapsed: boolean }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
          isCollapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0")} />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge className={cn(
                "h-5 min-w-5 flex items-center justify-center px-1.5",
                isActive
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground"
              )}>
                {item.badge}
              </Badge>
            )}
          </>
        )}
        {isCollapsed && item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500  rounded-full text-xs">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{
        x: 0,
        width: isCollapsed ? 80 : 288
      }}
      // transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-30 h-screen border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
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
        {!isCollapsed && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-hide">
        {/* Main Items */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Sections */}
        {sections.map((section, idx) => (
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
