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
    primary: "bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/30",
    secondary: "glass-card text-foreground",
  };

  const cardContent = (
    <div className={cn(
      "p-6 rounded-glass transition-all duration-300 hover:shadow-md hover:scale-[1.02] h-full cursor-help",
      variants[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-sm font-medium mb-1", variant === "primary" ? "text-white/80" : "text-muted-foreground")}>
            {title}
          </p>
          <h3 className="text-3xl font-bold font-display tracking-tight">{value}</h3>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          variant === "primary" ? "bg-white/15 text-white" : "bg-primary/8 text-primary"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className={cn(
            "font-medium px-2 py-0.5 rounded-full text-xs",
            variant === "primary"
              ? (trendUp ? "bg-white/20 text-white" : "bg-white/10 text-white/80")
              : (trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
          )}>
            {trend}
          </span>
          <span className={cn(variant === "primary" ? "text-white/60" : "text-muted-foreground")}>vs last month</span>
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
