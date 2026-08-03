import { useState, useEffect } from "react";
import { Plus, Search, Filter, FileText, Upload, Download, Edit, Trash2, Package, Calculator, BarChart3, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateHsnCodeDialog } from "@/components/hsn/CreateHsnCodeDialog";
import { EditHsnCodeDialog } from "@/components/hsn/EditHsnCodeDialog";
import { BulkImportDialog } from "@/components/hsn/BulkImportDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface HsnCode {
  id: string;
  hsnCode: string;
  description: string;
  gstRate: number;
  type: 'product' | 'service' | 'both';
  category: string;
  subCategory?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function HsnCodes() {
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [selectedHsnCode, setSelectedHsnCode] = useState<HsnCode | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchHsnCodes();
    fetchCategories();
  }, []);

  const fetchHsnCodes = async () => {
    try {
      const response = await apiClient.getHsnCodes();
      setHsnCodes(response.hsnCodes || []);
    } catch (error) {
      console.error('Error fetching HSN codes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch HSN codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getHsnCategories();
      setCategories(response || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredHsnCodes = (Array.isArray(hsnCodes) ? hsnCodes : []).filter(hsnCode => {
    const matchesSearch = 
      hsnCode.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hsnCode.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hsnCode.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hsnCode.subCategory && hsnCode.subCategory.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || hsnCode.category === categoryFilter;
    const matchesType = typeFilter === "all" || hsnCode.type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleEditHsnCode = (hsnCode: HsnCode) => {
    setSelectedHsnCode(hsnCode);
    setShowEditDialog(true);
  };

  const handleDeleteHsnCode = async (id: string) => {
    try {
      await apiClient.deleteHsnCode(id);
      toast({
        title: "Success",
        description: "HSN Code deleted successfully",
      });
      fetchHsnCodes();
    } catch (error) {
      console.error('Error deleting HSN code:', error);
      toast({
        title: "Error",
        description: "Failed to delete HSN code",
        variant: "destructive",
      });
    }
  };

  const getTypeConfig = (type: string) => {
    const configs = {
      "product": { variant: "default" as const, icon: Package, label: "Product" },
      "service": { variant: "secondary" as const, icon: Calculator, label: "Service" },
      "both": { variant: "outline" as const, icon: Tag, label: "Both" },
    };
    return configs[type as keyof typeof configs] || configs["product"];
  };

  const stats = {
    total: (Array.isArray(hsnCodes) ? hsnCodes : []).length,
    products: (Array.isArray(hsnCodes) ? hsnCodes : []).filter(h => h.type === 'product').length,
    services: (Array.isArray(hsnCodes) ? hsnCodes : []).filter(h => h.type === 'service').length,
    both: (Array.isArray(hsnCodes) ? hsnCodes : []).filter(h => h.type === 'both').length,
    active: (Array.isArray(hsnCodes) ? hsnCodes : []).filter(h => h.isActive).length,
    categories: (Array.isArray(categories) ? categories : []).length,
    avgGstRate: (Array.isArray(hsnCodes) ? hsnCodes : []).length > 0 ? 
      ((Array.isArray(hsnCodes) ? hsnCodes : []).reduce((sum, h) => sum + h.gstRate, 0) / (Array.isArray(hsnCodes) ? hsnCodes : []).length).toFixed(1) : 0
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HSN Code Management</h1>
          <p className="text-muted-foreground">
            Manage HSN codes for GST compliance and billing
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowBulkImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add HSN Code
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total HSN Codes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active codes
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Codes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.products / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Codes</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.services}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.services / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
            <p className="text-xs text-muted-foreground">
              Unique categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 flex-wrap gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by HSN code, description, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(Array.isArray(categories) ? categories : []).map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* HSN Codes List */}
      <div className="grid gap-4">
        {filteredHsnCodes.map((hsnCode, index) => {
          const typeConfig = getTypeConfig(hsnCode.type);
          
          return (
            <Card 
              key={hsnCode._id || hsnCode.id} 
              className="shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <typeConfig.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{hsnCode.hsnCode}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant={typeConfig.variant}>
                            {typeConfig.label}
                          </Badge>
                          {!hsnCode.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {hsnCode.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="font-medium">{hsnCode.category}</span>
                        {hsnCode.subCategory && (
                          <>
                            <span>•</span>
                            <span>{hsnCode.subCategory}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono">GST: {hsnCode.gstRate}%</span>
                      </div>
                      {hsnCode.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium">Notes:</span> {hsnCode.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="font-semibold">
                        {new Date(hsnCode.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditHsnCode(hsnCode)}
                        className="gap-2"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteHsnCode(hsnCode.id)}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredHsnCodes.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {(Array.isArray(hsnCodes) ? hsnCodes : []).length === 0 ? "No HSN codes yet" : "No HSN codes found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {(Array.isArray(hsnCodes) ? hsnCodes : []).length === 0 
                ? "Add your first HSN code to get started with GST compliance"
                : "Try adjusting your search or filter criteria"
              }
            </p>
            {(Array.isArray(hsnCodes) ? hsnCodes : []).length === 0 ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First HSN Code
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setTypeFilter("all");
              }}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Dialogs */}
      <CreateHsnCodeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onHsnCodeCreated={fetchHsnCodes}
      />
      
      <EditHsnCodeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        hsnCode={selectedHsnCode}
        onHsnCodeUpdated={fetchHsnCodes}
      />

      <BulkImportDialog
        open={showBulkImportDialog}
        onOpenChange={setShowBulkImportDialog}
        onImportCompleted={fetchHsnCodes}
      />
    </div>
  );
}
