import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Package,
  Building2,
  UserCog,
  Calendar,
  BarChart3,
  MessageSquare,
  Hash,
  Percent,
  DollarSign,
  Globe,
  UserPlus,
  ShieldCheck,
  History,
  Settings,
  Banknote,
  BookOpen,
  ClipboardList,
  BadgeIndianRupee,
  CalendarCheck,
  CalendarOff,
  Contact,
  ReceiptText,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
interface NavItem {
  title: string;
  href: string;
  icon: any;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AppSidebar() {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const navigationGroups: NavGroup[] = [
    {
      label: "Main",
      items: [
        { title: "Dashboard", href: "/", icon: LayoutDashboard, permission: "Dashboard" },
        { title: "Customers", href: "/customers", icon: Users, permission: "Customers" },
        { title: "Jobs", href: "/jobs", icon: Briefcase, permission: "Jobs" },
      ],
    },
    {
      label: "Invoicing",
      items: [
        { title: "Quotations", href: "/quotations", icon: ClipboardList, permission: "Quotations" },
        { title: "Invoice Management", href: "/invoices", icon: FileText, permission: "Invoicing" },
        // { title: "Invoice Management (View No GST)", href: "/invoices-no-gst", icon: FileText, permission: "Invoicing (View No GST)" },
      ],
    },
    {
      label: "Inventory & Vendors",
      items: [
        { title: "Inventory", href: "/inventory", icon: Package, permission: "Inventory" },
        { title: "Vendors", href: "/vendors", icon: Building2, permission: "Vendors" },
        { title: "Purchase Bills", href: "/purchase-bills", icon: ReceiptText, permission: "Purchase Bills" },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Staff & Tasks", href: "/staff", icon: UserCog, permission: "Staff & Tasks" },
        { title: "Calendar", href: "/calendar", icon: Calendar, permission: "Calendar" },
      ],
    },
    {
      label: "Finance",
      items: [
        // { title: "Payments", href: "/payments", icon: DollarSign, permission: "Payments" },
        { title: "Accounts", href: "/accounts", icon: Banknote, permission: "Accounts" },
      ],
    },
    {
      label: "Human Resources",
      items: [
        { title: "Employees", href: "/employees", icon: Contact, permission: "Human Resources" },
        { title: "Attendance", href: "/attendance", icon: CalendarCheck, permission: "Human Resources" },
        { title: "Leave Requests", href: "/leaves", icon: CalendarOff, permission: "Human Resources" },
        { title: "Payroll", href: "/payroll", icon: BadgeIndianRupee, permission: "Payroll" },
      ],
    },
    {
      label: "Configuration",
      items: [
        { title: "HSN Codes", href: "/hsn-codes", icon: Hash, permission: "HSN Codes" },
        { title: "SAC Codes", href: "/sac-codes", icon: Percent, permission: "SAC Codes" },
      ],
    },
    {
      label: "Communication",
      items: [
        { title: "Payment Reminders", href: "/payment-reminders", icon: Bell, permission: "Payment Reminders" },
        { title: "WhatsApp", href: "/whatsapp", icon: MessageSquare, permission: "WhatsApp" },
        // { title: "Customer Portal", href: "/portal", icon: Globe, permission: "Customer Portal" },
      ],
    },
    {
      label: "Staff Management",
      items: [
        { title: "Create Login", href: "/create-login", icon: UserPlus, permission: "User Management" },
        // { title: "Activity Log", href: "/activity-log", icon: History, permission: "Activity Log" },
      ],
    },
    {
      label: "Reports & Settings",
      items: [
        // { title: "Reports", href: "/reports", icon: BarChart3, permission: "Reports" },
        { title: "Settings", href: "/settings", icon: Settings, permission: "Settings" },
      ],
    },
  ];

  const filterItemsByPermission = (items: NavItem[]) => {
    return items.filter(item => !item.permission || hasPermission(item.permission));
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">
            <span className="text-orange-500">Serp</span>
            <span className="text-black">Y</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => {
          const visibleItems = filterItemsByPermission(group.items);

          // Don't render group if no items are visible
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="text-xs text-muted-foreground px-2 py-1">
          Version 1.0.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
