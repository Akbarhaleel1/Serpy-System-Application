import { useState, useEffect } from "react";
import { Plus, Search, Filter, FileText, Upload, Download, Edit, Trash2, BarChart3, Tag } from "lucide-react";
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
import { CreateSacCodeDialog } from "@/components/sac/CreateSacCodeDialog";
import { EditSacCodeDialog } from "@/components/sac/EditSacCodeDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface SacCode {
  _id?: string;
  id?: string;
  sacCode: string;
  description: string;
  gstRate: number;
  category: string;
  subCategory?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SacCodes() {
  const [sacCodes, setSacCodes] = useState<SacCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSacCode, setSelectedSacCode] = useState<SacCode | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSacCodes();
    fetchCategories();
  }, []);

  const fetchSacCodes = async () => {
    try {
      const response = await apiClient.getSacCodes();
      setSacCodes(response.sacCodes || []);
    } catch (error) {
      console.error('Error fetching SAC codes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch SAC codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getSacCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredSacCodes = (Array.isArray(sacCodes) ? sacCodes : []).filter(sacCode => {
    const matchesSearch =
      sacCode.sacCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sacCode.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sacCode.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sacCode.subCategory && sacCode.subCategory.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || sacCode.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleEditSacCode = (sacCode: SacCode) => {
    setSelectedSacCode(sacCode);
    setShowEditDialog(true);
  };

  const handleDeleteSacCode = async (id: string) => {
    try {
      await apiClient.deleteSacCode(id);
      toast({
        title: "Success",
        description: "SAC Code deleted successfully",
      });
      fetchSacCodes();
    } catch (error) {
      console.error('Error deleting SAC code:', error);
      toast({
        title: "Error",
        description: "Failed to delete SAC code",
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: (Array.isArray(sacCodes) ? sacCodes : []).length,
    active: (Array.isArray(sacCodes) ? sacCodes : []).filter(s => s.isActive).length,
    categories: (Array.isArray(categories) ? categories : []).length,
    avgGstRate: (Array.isArray(sacCodes) ? sacCodes : []).length > 0 ?
      ((Array.isArray(sacCodes) ? sacCodes : []).reduce((sum, s) => sum + s.gstRate, 0) / (Array.isArray(sacCodes) ? sacCodes : []).length).toFixed(1) : 0
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
          <h1 className="text-3xl font-bold tracking-tight">SAC Code Management</h1>
          <p className="text-muted-foreground">
            Manage SAC codes for GST compliance and billing on design charges
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add SAC Code
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SAC Codes</CardTitle>
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
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total
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

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg GST Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgGstRate}%</div>
            <p className="text-xs text-muted-foreground">
              Average GST rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 flex-wrap gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by SAC code, description, or category..."
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
      </div>

      {/* SAC Codes List */}
      <div className="grid gap-4">
        {filteredSacCodes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No SAC Codes Found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || categoryFilter !== "all" ? "Try adjusting your search filters" : "Create your first SAC code to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSacCodes.map((sacCode, index) => (
            <Card
              key={sacCode._id || sacCode.id}
              className="shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{sacCode.sacCode}</h3>
                        <div className="flex items-center space-x-2">
                          {!sacCode.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {sacCode.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="font-medium">{sacCode.category}</span>
                        {sacCode.subCategory && (
                          <>
                            <span>•</span>
                            <span>{sacCode.subCategory}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono">GST: {sacCode.gstRate}%</span>
                      </div>
                      {sacCode.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium">Notes:</span> {sacCode.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="font-semibold">
                        {new Date(sacCode.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSacCode(sacCode)}
                        className="gap-2"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSacCode(sacCode._id || sacCode.id || '')}
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
          ))
        )}
      </div>

      {/* Create SAC Code Dialog */}
      <CreateSacCodeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSacCodeCreated={fetchSacCodes}
      />

      {/* Edit SAC Code Dialog */}
      {selectedSacCode && (
        <EditSacCodeDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          sacCode={selectedSacCode}
          onSacCodeUpdated={fetchSacCodes}
        />
      )}
    </div>
  );
}
