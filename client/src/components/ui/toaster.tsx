import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, PackageX, CheckCircle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // Check if description contains stock check data
        let stockCheckDetails = null;
        let mainMessage = description;

        // Try to parse description if it's a JSON string with stock check
        if (typeof description === 'string' && description.includes('stockCheck')) {
          try {
            const parsed = JSON.parse(description);
            if (parsed.stockCheck && Array.isArray(parsed.stockCheck)) {
              stockCheckDetails = parsed.stockCheck;
              mainMessage = parsed.message || description;
            }
          } catch (e) {
            // Not JSON, use as is
          }
        }

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-2 w-full">
              {title && <ToastTitle className="flex items-center gap-2">
                {props.variant === "destructive" && <AlertCircle className="h-4 w-4" />}
                {title}
              </ToastTitle>}

              {mainMessage && !stockCheckDetails && (
                <ToastDescription>{mainMessage}</ToastDescription>
              )}

              {stockCheckDetails && (
                <div className="space-y-2">
                  <ToastDescription className="font-medium text-sm">
                    {mainMessage}
                  </ToastDescription>
                  <div className="space-y-1.5 text-sm mt-2">
                    {stockCheckDetails.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20"
                      >
                        <PackageX className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-destructive-foreground">
                            {item.itemName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.error || item.reason || `Required: ${item.requiredQuantity}, Available: ${item.availableQuantity || 0}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
