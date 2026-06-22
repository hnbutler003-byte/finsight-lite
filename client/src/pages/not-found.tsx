import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500 shrink-0" />
            <h1 className="font-display font-bold text-2xl text-foreground">404: Page Not Found</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This page doesn't exist. Head back to the home screen to get started.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline">
            Go home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
