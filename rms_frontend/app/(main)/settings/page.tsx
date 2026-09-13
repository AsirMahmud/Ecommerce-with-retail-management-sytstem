"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFlushDatabase } from "@/hooks/queries/use-settings";
import { useBismillah } from "@/contexts/bismillah-context";
import { Loader2, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CourierSettingsManager } from "@/components/settings/courier-settings-manager";

const databaseOptions = [
  { id: "sales", label: "Sales Database" },
  { id: "customers", label: "Customers Database" },
  { id: "expenses", label: "Expenses Database" },
  { id: "reports", label: "Reports Database" },
];

export default function SettingsPage() {
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const { mutate: flushDatabase, isPending } = useFlushDatabase();
  const { showBismillah, toggleBismillah } = useBismillah();

  const handleFlushDatabase = () => {
    if (selectedDatabase) {
      flushDatabase(selectedDatabase);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>
            Customize the appearance of your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Bismillah Logo</Label>
              <p className="text-sm text-muted-foreground">
                Show or hide the Bismillah logo in the navigation bar
              </p>
            </div>
            <Switch checked={showBismillah} onCheckedChange={toggleBismillah} />
          </div>
        </CardContent>
      </Card>

      {/* Delivery & Courier Partner Settings */}
      <CourierSettingsManager />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Management</CardTitle>
          <CardDescription>
            Clear specific databases. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {databaseOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{option.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    Clear all {option.label.toLowerCase()} records
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={() => setSelectedDatabase(option.id)}
                    >
                      Clear Database
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete all
                        {option.label.toLowerCase()} records from the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleFlushDatabase}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          "Continue"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Clear all databases except user accounts and admin settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <h3 className="font-medium text-destructive">
                Delete All Databases
              </h3>
              <p className="text-sm text-muted-foreground">
                This will clear all sales, customers, expenses, and reports data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  onClick={() => setSelectedDatabase("all")}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    Warning: This action cannot be undone
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all data from:
                    <ul className="list-disc list-inside mt-2">
                      <li>Sales Database</li>
                      <li>Customers Database</li>
                      <li>Expenses Database</li>
                      <li>Reports Database</li>
                    </ul>
                    <p className="mt-2">
                      User accounts and admin settings will be preserved.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleFlushDatabase}
                    disabled={isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete All Data"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
