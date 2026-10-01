"use client";

import React, { useState, useRef, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Store,
  Globe,
  Users,
  Info,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";
import { useImportCustomersCSV } from "@/hooks/queries/use-customer";

export const SAMPLE_CSV_CONTENT = `email,email,email,phone,phone,phone,madid,fn,ln,zip,ct,st,country,dob,doby,gen,age,uid,value
elizabetho@fb.com,olsene@fb.com,eolsen@fb.com,1-(650)-561-5622,1-(650)-782-5622,1-(650)-888-5622,aece52e7-03ee-455a-b3c4-e57283966239,Elizabeth,Olsen,94046,Menlo Park,CA,US,10/21/68,1968,F,48,1234567890,20.1
andrewj@fb.com,jamisona@fb.com,ajamison@fb.com,1-(212) 736-3100,1-(212) 523-3100,1-(212) 123-3100,BEBE52E7-03EE-455A-B3C4-E57283966239,Andrew,Jamison,10118,New York,NY,US,10/17/78,1978,M,38,1443637309,1342.8
margaretj@fb.com,johnsonm@fb.com,mjohnson@fb.com,1-(323) 857-6000,1-(323) 617-6000,1-(323) 543-6000,adbe52e7-03ee-455a-b3c4-e57283966239,Margaret,Johnson,90001-4656,Los Angeles,CA,US,11/21/82,1982,F,33,1234567892,600
johnd@fb.com,doej@fb.com,jdoe@fb.com,1-(312) 443-3600,1-(312) 555-3600,1-(312) 321-3600,aebe52e7-03ee-455a-b3c4-e57283966239,John,Doe,60603,Chicago,IL,US,9/1/78,1978,M,38,1234567890,505
marks@fb.com,smithmark@fb.com,msmith@fb.com,+44 303 123 7300,+44 871 663 1678,+44 844 412 4653,AEBD52E7-03EE-455A-B3C4-E57283966239,Mark,Smith,SW1A 1AA,London,,GB,12/10/78,1978,M,38,1443637309,3123
jamesm@fb.com,mclaughlinj@fb.com,jmclaughlin@fb.com,+44 20 7219 4272,+44 844 482 5138,+44 343 222 1234,aece52e7-03ee-455a-b3c4-e57283966239,James,McLaughlin,SW1A 1AA,London,,GB,10/21/56,1978,M,50,1234567892,456.9
pauloa@fb.com,alessandrop@fb.com,palessandro@fb.com,+55 21 3938-6900,+55 11 3091-3116,+55 11 3113-3651,ACBE52E7-03EE-455A-B3C4-E57283966239,Paulo,Alessandro,01310-200,Sao Paulo,,BR,12/21/78,1976,M,40,1234567890,60
mariel@fb.com,laurentm@fb.com,mlaurent@fb.com,+33 892 70 12 39,+33 1 53 09 82 82,+33 1 40 20 53 17,AFCE52E7-03EE-455A-B3C4-E57283966239,Marie,Laurent,75007,Paris,,FR,10/10/65,1978,F,51,1443637309,77
thomasd@fb.com,duboist@fb.com,tdubois@fb.com,+33 892 70 12 39,+33 1 49 52 42 63,+33 1 42 96 70 00,aebe52e7-03ee-455a-b3c4-e57283966239,Thomas,Dubois,75007,Paris,,FR,11/19/72,1978,M,44,1234567892,590`;

export function downloadCustomerCsvTemplateFile() {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob(["\uFEFF" + SAMPLE_CSV_CONTENT], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "customer_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to download template:", err);
  }
}

interface CustomerCsvImportModalProps {
  defaultCustomerType?: "shop" | "online";
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ParsedPreviewRow {
  email: string;
  phone: string;
  name: string;
  location: string;
  gender: string;
  value: string;
  isValid: boolean;
}

export function CustomerCsvImportModal({
  defaultCustomerType = "shop",
  trigger,
  onImportComplete,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CustomerCsvImportModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [customerType, setCustomerType] = useState<"shop" | "online">(
    defaultCustomerType
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvTextContent, setCsvTextContent] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedPreviewRow[]>([]);
  const [columnSummary, setColumnSummary] = useState<{
    emails: number;
    phones: number;
    hasName: boolean;
    hasLocation: boolean;
    hasValue: boolean;
    totalColumns: number;
  }>({
    emails: 0,
    phones: 0,
    hasName: false,
    hasLocation: false,
    hasValue: false,
    totalColumns: 0,
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportCustomersCSV();
  const [importResult, setImportResult] = useState<{
    success: boolean;
    created_count: number;
    updated_count: number;
    skipped_count: number;
    total_rows: number;
    message: string;
    errors?: string[];
  } | null>(null);

  // Sync default customer type if changed from outside
  React.useEffect(() => {
    if (defaultCustomerType) {
      setCustomerType(defaultCustomerType);
    }
  }, [defaultCustomerType]);

  const parseCsvText = (text: string) => {
    try {
      setParseError(null);
      // Basic CSV parser that handles quotes
      const lines: string[][] = [];
      let currentRow: string[] = [];
      let currentField = "";
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          currentRow.push(currentField.trim());
          currentField = "";
        } else if ((char === "\r" || char === "\n") && !inQuotes) {
          if (char === "\r" && nextChar === "\n") i++;
          currentRow.push(currentField.trim());
          if (currentRow.some((c) => c !== "")) {
            lines.push(currentRow);
          }
          currentRow = [];
          currentField = "";
        } else {
          currentField += char;
        }
      }

      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c !== "")) {
          lines.push(currentRow);
        }
      }

      if (lines.length < 2) {
        setParseError("The CSV file must contain a header row and at least one data row.");
        return;
      }

      const headers = lines[0].map((h) => h.toLowerCase().trim());
      const emailIndices = headers
        .map((h, i) => (h === "email" ? i : -1))
        .filter((i) => i !== -1);
      const phoneIndices = headers
        .map((h, i) =>
          ["phone", "phone_number", "mobile", "cell"].includes(h) ? i : -1
        )
        .filter((i) => i !== -1);
      const fnIdx = headers.findIndex((h) =>
        ["fn", "first_name", "firstname", "name"].includes(h)
      );
      const lnIdx = headers.findIndex((h) =>
        ["ln", "last_name", "lastname"].includes(h)
      );
      const ctIdx = headers.findIndex((h) => ["ct", "city"].includes(h));
      const stIdx = headers.findIndex((h) => ["st", "state"].includes(h));
      const zipIdx = headers.findIndex((h) => ["zip", "postal_code"].includes(h));
      const countryIdx = headers.findIndex((h) =>
        ["country", "country_code"].includes(h)
      );
      const genIdx = headers.findIndex((h) => ["gen", "gender"].includes(h));
      const valIdx = headers.findIndex((h) =>
        ["value", "total_spent", "clv"].includes(h)
      );

      setColumnSummary({
        emails: emailIndices.length,
        phones: phoneIndices.length,
        hasName: fnIdx !== -1,
        hasLocation: ctIdx !== -1 || countryIdx !== -1,
        hasValue: valIdx !== -1,
        totalColumns: headers.length,
      });

      setParsedRows(lines);

      // Create preview for top 5 rows
      const previews: ParsedPreviewRow[] = lines.slice(1, 6).map((row) => {
        let email = "";
        for (const idx of emailIndices) {
          if (row[idx] && row[idx].includes("@")) {
            email = row[idx];
            break;
          }
        }

        let phone = "";
        for (const idx of phoneIndices) {
          if (row[idx]) {
            phone = row[idx];
            break;
          }
        }

        const fn = fnIdx !== -1 ? row[fnIdx] || "" : "";
        const ln = lnIdx !== -1 ? row[lnIdx] || "" : "";
        const name = `${fn} ${ln}`.trim() || "Customer";

        const locParts = [
          ctIdx !== -1 ? row[ctIdx] : "",
          stIdx !== -1 ? row[stIdx] : "",
          countryIdx !== -1 ? row[countryIdx] : "",
        ].filter(Boolean);
        const location = locParts.join(", ") || "-";

        const gender = genIdx !== -1 ? row[genIdx] || "-" : "-";
        const value = valIdx !== -1 && row[valIdx] ? `$${row[valIdx]}` : "-";

        return {
          email: email || "-",
          phone: phone || "-",
          name,
          location,
          gender,
          value,
          isValid: Boolean(phone || email),
        };
      });

      setPreviewRows(previews);
    } catch (err: any) {
      setParseError(err.message || "Failed to parse CSV file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseError("Please select a valid CSV file (.csv)");
      return;
    }
    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvTextContent(text);
      parseCsvText(text);
    };
    reader.onerror = () => {
      setParseError("Could not read file contents");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile && !csvTextContent) return;

    try {
      const res = await importMutation.mutateAsync({
        file: selectedFile || undefined,
        csvText: !selectedFile ? csvTextContent : undefined,
        rows: parsedRows.length > 0 ? parsedRows : undefined,
        customerType,
      });

      setImportResult(res);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      // Handled by mutation onError
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCsvTextContent("");
    setParsedRows([]);
    setPreviewRows([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Import Customers from CSV
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-500 mt-1">
                Upload customer records from Meta Ads Audience, POS spreadsheets, or standard CSV files.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCustomerCsvTemplateFile}
              className="shrink-0 h-8 gap-1.5 text-xs font-semibold bg-white border-slate-200 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shadow-sm rounded-xl"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Customer Channel Selector */}
            <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                1. Select Import Channel / Module
              </Label>
              <RadioGroup
                value={customerType}
                onValueChange={(val) => setCustomerType(val as "shop" | "online")}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div>
                  <RadioGroupItem
                    value="shop"
                    id="channel-shop"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-shop"
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      customerType === "shop"
                        ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-sm ring-1 ring-blue-600"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-100/60 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 shrink-0">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm block">Offline (Shop / In-Store POS)</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                        Import as in-store retail customers for POS registers and shop receipts.
                      </span>
                    </div>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    value="online"
                    id="channel-online"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="channel-online"
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      customerType === "online"
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-100/60 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 shrink-0">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm block">Online (Preorder & E-Commerce)</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                        Import as online shoppers for custom orders, marketing & Meta audiences.
                      </span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Upload Zone */}
            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? "border-indigo-500 bg-indigo-50/50 scale-[0.99]"
                    : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shadow-inner">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse or drag and drop your CSV file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports Meta Ads template (<code>email, phone, fn, ln, ct, country...</code>) or standard CSVs
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                    Multiple Emails (up to 3)
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                    Multiple Phones (up to 3)
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                    Auto-Clean Phones
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                    Existing Upsert
                  </Badge>
                </div>
              </div>
            ) : (
              /* Selected File & Preview State */
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {selectedFile.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                        {parsedRows.length > 1 ? `${parsedRows.length - 1} customer rows found` : "Parsing..."}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-rose-600"
                  >
                    Change File
                  </Button>
                </div>

                {/* Column Mapping Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-white dark:bg-slate-800/60 shadow-xs">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Email Columns</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {columnSummary.emails > 0 ? `${columnSummary.emails} detected` : "None"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-white dark:bg-slate-800/60 shadow-xs">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Phone Columns</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {columnSummary.phones > 0 ? `${columnSummary.phones} detected` : "None"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-white dark:bg-slate-800/60 shadow-xs">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Name Columns</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {columnSummary.hasName ? "Detected (fn/ln)" : "Fallback"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-white dark:bg-slate-800/60 shadow-xs">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Location Columns</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {columnSummary.hasLocation ? "City / State / Zip" : "None"}
                    </span>
                  </div>
                </div>

                {/* Preview Table */}
                {previewRows.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100/70 dark:bg-slate-800/70 px-4 py-2 border-b text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Preview (First 5 Rows)</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Total {parsedRows.length - 1} records to import
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b text-slate-600 dark:text-slate-400">
                          <tr>
                            <th className="py-2 px-3 font-semibold">Name</th>
                            <th className="py-2 px-3 font-semibold">Primary Phone</th>
                            <th className="py-2 px-3 font-semibold">Primary Email</th>
                            <th className="py-2 px-3 font-semibold">Location</th>
                            <th className="py-2 px-3 font-semibold">Gen</th>
                            <th className="py-2 px-3 font-semibold">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                                {row.name}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                                {row.phone}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                {row.email}
                              </td>
                              <td className="py-2 px-3 text-slate-500">
                                {row.location}
                              </td>
                              <td className="py-2 px-3 text-slate-500">
                                {row.gender}
                              </td>
                              <td className="py-2 px-3 font-semibold text-emerald-600">
                                {row.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parse Error Alert */}
            {parseError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error reading CSV:</span> {parseError}
                </div>
              </div>
            )}

            {/* Import Result Alert */}
            {importResult && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Import Completed Successfully
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-slate-500 block">Created</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                      {importResult.created_count}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-slate-500 block">Updated / Merged</span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-300">
                      {importResult.updated_count}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-slate-500 block">Skipped</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                      {importResult.skipped_count}
                    </span>
                  </div>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span className="font-semibold block mb-1">Warnings ({importResult.errors.length}):</span>
                    <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Existing records with matching phone will be merged into channel "{customerType === "shop" ? "Offline" : "Online"}"
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleReset();
                setIsOpen(false);
              }}
              className="flex-1 sm:flex-initial"
            >
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                size="sm"
                onClick={handleStartImport}
                disabled={!selectedFile || parsedRows.length < 2 || importMutation.isPending}
                className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1.5" />
                    Import {parsedRows.length > 1 ? `${parsedRows.length - 1} Customers` : "Customers"}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
