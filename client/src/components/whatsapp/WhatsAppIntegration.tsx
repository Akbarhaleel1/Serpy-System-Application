import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, Settings, Phone, FileText, CheckCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppMessage {
  id: string;
  customer_phone: string;
  message_type: string;
  message_content: string;
  status: string;
  created_at: string;
  sent_at?: string;
}

interface WhatsAppIntegrationProps {
  jobId?: string;
  customerId?: string;
  invoiceId?: string;
}

export const WhatsAppIntegration = ({ jobId, customerId, invoiceId }: WhatsAppIntegrationProps) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    template_type: "",
    custom_message: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    fetchTemplates();
  }, [jobId, customerId, invoiceId]);

  const fetchMessages = async () => {
    console.log('🔧 API call from', 'src/components/whatsapp/WhatsAppIntegration.tsxwhatsapp_messages")
        ()
        ;

      if (jobId) {
        query = query;
      }

      const { data } = await query.limit(10);
      if (data) setMessages(data);
    }
    }
    }

    } catch (error) {
      console.error("Error fetching messages:whatsapp_templates")
        ()
        
        ;

      if (data) setTemplates(data);
    }
    }
    }

    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const sendWhatsAppMessage = async (phone: string, message: string, type: string) => {
    try {
      const { data: userData } = await apiClient.getCurrentUser();
      if (!userData.user) throw new Error("User not authenticated");

      const messageData = {
        user_id: userData.user.id,
        walk_in_job_id: jobId || null,
        customer_phone: phone,
        message_type: type,
        message_content: message,
        status: "sentwhatsapp_messages")

      // Note: In a real implementation, you would integrate with WhatsApp Business API
      // For now, we're just storing the message in the database
      toast({
        title: "Message Sent",
        description: "WhatsApp message has been queued for delivery",
      });

      return true;
    }
    }
    }

    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!formData.phone || (!formData.template_type && !formData.custom_message)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let message = formData.custom_message;
      
      if (formData.template_type && !formData.custom_message) {
        const template = templates.find(t => t.template_type === formData.template_type);
        if (template) {
          message = template.message_template;
          // In a real implementation, you would replace template variables with actual data
        }
      }

      const success = await sendWhatsAppMessage(
        formData.phone,
        message,
        formData.template_type || "custom"
      );

      if (success) {
        setFormData({
          phone: "",
          template_type: "",
          custom_message: "",
        });
        fetchMessages();
      }
    }

    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-green-100 text-green-800";
      case "delivered": return "bg-blue-100 text-blue-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "job_status": return <Settings className="h-4 w-4" />;
      case "invoice_send": return <FileText className="h-4 w-4" />;
      case "bill_approval": return <CheckCircle className="h-4 w-4" />;
      case "payment_reminder": return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Send Message Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send WhatsApp Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+91 9876543210"
                required
              />
            </div>

            <div>
              <Label htmlFor="template">Message Template</Label>
              <Select 
                value={formData.template_type} 
                onValueChange={(value) => setFormData({...formData, template_type: value, custom_message: ""})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.template_type}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="message">Custom Message</Label>
            <Textarea
              id="message"
              value={formData.custom_message}
              onChange={(e) => setFormData({...formData, custom_message: e.target.value, template_type: ""})}
              placeholder="Type your custom message here..."
              rows={3}
            />
          </div>

          <Button onClick={handleSendMessage} disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No messages sent yet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon(message.message_type)}
                      <span className="font-medium">{message.customer_phone}</span>
                      <Badge variant="outline" className="text-xs">
                        {message.message_type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(message.status)}>
                        {message.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {message.message_content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFormData({...formData, template_type: "job_status"})}
            >
              Job Status
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFormData({...formData, template_type: "invoice_send"})}
            >
              Send Invoice
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFormData({...formData, template_type: "bill_approval"})}
            >
              Bill Approval
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFormData({...formData, template_type: "payment_reminder"})}
            >
              Payment Reminder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};