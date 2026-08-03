import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background">
        <div className="flex h-screen">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-auto p-0">
              {children}
            </main>
            <footer className="bg-muted/50 border-t px-4 py-2">
              <p className="text-center text-xs text-muted-foreground">
                Created by Synx Automation
              </p>
            </footer>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}