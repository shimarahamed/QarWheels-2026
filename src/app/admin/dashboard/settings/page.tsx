'use client';

import { Shield, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase } from "@/firebase";

export default function AdminSettingsPage() {
  const { user } = useFirebase();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your admin account details</p>
      </header>

      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="icon-pill h-10 w-10 bg-rose-500/10 text-rose-600">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Admin Account</CardTitle>
              <CardDescription>Currently signed in as super admin</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Email</span>
              <span className="font-bold">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Display name</span>
              <span className="font-bold">{user?.displayName || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">UID</span>
              <span className="font-mono text-xs text-muted-foreground">{user?.uid}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Role</span>
              <span className="font-bold text-rose-600">Super Admin</span>
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
            <p>
              Admin roles are managed directly in Firestore under <code className="rounded bg-muted px-1 text-xs">/roles_admin/{"{uid}"}</code>.
              To grant or revoke admin access, add or remove a document with the user&apos;s UID as the document ID.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
