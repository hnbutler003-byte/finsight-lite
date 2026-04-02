import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  variant?: "default" | "primary" | "secondary";
  description?: string;
}

export function StatCard({ title, value, trend, trendUp, icon: Icon, variant = "default", description }: StatCardProps) {
  const variants = {
    default: "glass-card text-foreground",
    primary: "glass-card ring-2 ring-violet-400/50 shadow-lg shadow-violet-500/20",
    secondary: "glass-card text-foreground",
  };

  const cardContent = (
    <div className={cn(
      "p-6 rounded-glass transition-all duration-300 hover:shadow-md hover:scale-[1.02] h-full cursor-help",
      variants[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1 text-muted-foreground">
            {title}
          </p>
          <h3 className="text-3xl font-bold font-display tracking-tight text-foreground">{value}</h3>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          variant === "primary" ? "bg-violet-100 text-violet-600" : "bg-primary/8 text-primary"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className={cn(
            "font-medium px-2 py-0.5 rounded-full text-xs",
            trendUp ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          )}>
            {trend}
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );

  if (!description) return cardContent;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
