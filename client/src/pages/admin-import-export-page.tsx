import { useState, useRef } from "react";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { FileDown, Download, Upload, Loader2 } from "lucide-react";
import { downloadCsv, TEMPLATES } from "@/lib/download-template";

function parseCSVText(text: string): any[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

async function parseFileToRows(file: File): Promise<any[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          resolve(parseCSVText(text));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        const headers: string[] = [];
        worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value ?? '');
        });
        const rows: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const obj: any = {};
          headers.forEach((h, i) => {
            const cell = row.getCell(i + 1);
            let val = cell.value;
            if (val && typeof val === 'object' && 'richText' in (val as any)) {
              val = (val as any).richText.map((rt: any) => rt.text).join('');
            }
            obj[h] = val ?? '';
          });
          rows.push(obj);
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function AdminImportExportPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<"idle" | "running" | "done">("idle");
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<any[]>([]);

  // Export all politicians
  const exportMutation = useMutation({
    mutationFn: async () => {
      setExportStatus("running");
      const res = await apiRequest("/api/admin/politicians/export", "GET");
      const data = await res.json();
      const csv = [
        Object.keys(data[0] || {}).join(","),
        ...data.map((row: any) => 
          Object.values(row).map((v: any) => 
            `"${String(v).replace(/"/g, '""')}"` 
          ).join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `politicians-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportProgress(100);
      setExportStatus("done");
    },
    onSuccess: () => {
      toast({ title: "Export complete", description: "CSV file downloaded successfully." });
      setTimeout(() => {
        setExportDialogOpen(false);
        setExportStatus("idle");
        setExportProgress(0);
      }, 1500);
    },
    onError: (error: any) => {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
      setExportStatus("idle");
    },
  });

  // Import profiles
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("No file selected");
      
      const rows = await parseFileToRows(importFile);
      setImportRows(rows);
      
      const res = await apiRequest("/api/admin/politicians/import-bulk", "POST", { profiles: rows });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/politician-profiles"] });
      toast({ 
        title: "Import complete", 
        description: `Created ${data.created || 0}, updated ${data.updated || 0}, skipped ${data.skipped || 0}` 
      });
      setImportDialogOpen(false);
      setImportFile(null);
      setImportRows([]);
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const rows = await parseFileToRows(file);
        setImportFile(file);
        setImportRows(rows);
      } catch (error: any) {
        toast({ title: "File read error", description: error.message, variant: "destructive" });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Import / Export</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Bulk import politician and candidate data, export backups, and manage state data
          </p>
        </div>

        <Tabs defaultValue="data" className="space-y-6">
          <TabsList>
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="templates">State Data Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Politician & Candidate Management</CardTitle>
                <CardDescription>
                  Download templates, import bulk data, or export backups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadCsv(TEMPLATES.candidates.filename, TEMPLATES.candidates.headers, TEMPLATES.candidates.sample)}
                    title="Download blank CSV template for import"
                  >
                    <FileDown className="w-3.5 h-3.5 mr-2" />
                    Download Template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setExportStatus("idle"); setExportProgress(0); setExportDialogOpen(true); }}
                    title="Export all politicians and candidates as CSV backup"
                  >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Export All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Upload className="w-3.5 h-3.5 mr-2" />
                    Import XLSX/CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {importFile && (
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-base">Import Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      File: <span className="text-blue-600 dark:text-blue-400">{importFile.name}</span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {importRows.length} rows ready to import
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => importMutation.mutate()}
                      disabled={importMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {importMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                      Confirm Import
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setImportFile(null);
                        setImportRows([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">State Data Templates</CardTitle>
                  <CardDescription>
                    Download templates for adding state-specific data like candidates, representatives, and special interest groups
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Visit the State Data portal to download and manage election data, representatives, and SIG profiles.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = "/admin/state-data"}
                  >
                    Go to State Data Portal
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Politicians & Candidates</DialogTitle>
            <DialogDescription>
              Downloads all profiles as a CSV with the exact same columns as the import template — perfect for backup and re-import.
            </DialogDescription>
          </DialogHeader>
          
          {exportStatus === "done" && (
            <div className="py-6 text-center">
              <p className="text-green-600 dark:text-green-400 font-medium">✓ Export complete!</p>
            </div>
          )}
          
          {exportStatus === "running" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exporting... {Math.round(exportProgress)}%</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={exportStatus === "running"}
            >
              {exportStatus === "done" ? "Close" : "Cancel"}
            </Button>
            {exportStatus !== "done" && (
              <Button
                onClick={() => exportMutation.mutate()}
                disabled={exportStatus === "running"}
              >
                {exportStatus === "running" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {exportStatus === "running" ? "Exporting..." : "Start Export"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
