import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, FileUp, X } from "lucide-react";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCompleted: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    hsnCode: string;
    error: string;
  }>;
}

export function BulkImportDialog({ open, onOpenChange, onImportCompleted }: BulkImportDialogProps) {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleFileRead = async () => {
    if (!selectedFile) return;
    
    setParsing(true);
    try {
      const text = await selectedFile.text();
      
      const parsed = parseCSV(text);
      setParsedData(parsed);
      
      toast({
        title: "File Processed",
        description: `Successfully processed ${parsed.length} HSN codes from file`,
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "File Read Error",
        description: "Failed to read the selected file",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setParsedData([]);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const data = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handle quoted values)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      if (values.length >= 2) {
        const hsnCode = values[0].replace(/"/g, '');
        const description = values[1].replace(/"/g, '');
        
        // Determine category based on HSN code
        let category = "General";
        let type = "product";
        let gstRate = 18;
        
        if (hsnCode.startsWith('49')) {
          category = "Printed Materials";
        } else if (hsnCode.startsWith('48')) {
          category = "Paper & Paperboard";
        } else if (hsnCode.startsWith('9989')) {
          category = "Printing Services";
          type = "service";
        } else if (hsnCode.startsWith('61')) {
          category = "Textiles";
        } else if (hsnCode.startsWith('84')) {
          category = "Machinery";
        } else if (hsnCode.startsWith('32')) {
          category = "Inks & Chemicals";
        }
        
        // Determine GST rate based on category
        if (category === "Printed Materials" || category === "Paper & Paperboard") {
          gstRate = 12;
        } else if (category === "Printing Services") {
          gstRate = 18;
        } else if (category === "Textiles") {
          gstRate = 5;
        } else if (category === "Machinery") {
          gstRate = 18;
        }
        
        data.push({
          hsnCode: hsnCode,
          description: description,
          gstRate: gstRate,
          type: type,
          category: category,
          subCategory: "",
          notes: ""
        });
      }
    }
    
    return data;
  };


  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload and process a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.bulkImportHsnCodes(parsedData);
      console.log('📋 Bulk import result:', response);
      
      // Extract results from the response structure
      const results = response.data?.results || response.results || response;
      setImportResult(results);
      
      toast({
        title: "Import Completed",
        description: `Successfully imported ${results.success} HSN codes. ${results.failed} failed.`,
      });
      
      if (results.success > 0) {
        onImportCompleted();
      }
    } catch (error) {
      console.error('Error importing HSN codes:', error);
      toast({
        title: "Import Error",
        description: "Failed to import HSN codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParsedData([]);
    setImportResult(null);
    setSelectedFile(null);
  };

  const downloadTemplate = () => {
    const template = `HSN Code,Description
49011010,Printed books and brochures
48021010,Uncoated paper for printing
998912,Printing services
61091000,Cotton T-shirts`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hsn-codes-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import HSN Codes</DialogTitle>
          <DialogDescription>
            Import multiple HSN codes from CSV data. The system will automatically categorize and set GST rates.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                CSV Template
              </CardTitle>
              <CardDescription>
                Download the template to see the correct format for your CSV file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileUpload">Upload CSV File</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                <FileUp className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <input
                    type="file"
                    id="fileUpload"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".csv,text/csv"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    size="lg"
                    onClick={() => document.getElementById('fileUpload')?.click()}
                  >
                    <FileUp className="h-5 w-5 mr-2" />
                    Choose CSV File
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop your CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 5MB • Supported format: CSV
                  </p>
                </div>
              </div>
              
              {selectedFile && (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleFileRead}
                      disabled={parsing}
                    >
                      {parsing ? "Processing..." : "Process File"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={removeSelectedFile}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleReset} 
              variant="outline"
              disabled={loading}
            >
              Reset All
            </Button>
          </div>

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Preview ({parsedData.length} items)
                </CardTitle>
                <CardDescription>
                  Review the parsed data before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {parsedData.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{item.hsnCode}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.category}</Badge>
                        <Badge variant="secondary">{item.gstRate}%</Badge>
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground">
                      ... and {parsedData.length - 10} more items
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Success: {importResult.success}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Failed: {importResult.failed}</span>
                  </div>
                </div>
                
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Errors:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>{error.hsnCode}: {error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={loading || parsedData.length === 0}
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "Importing..." : `Import ${parsedData.length} Codes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}