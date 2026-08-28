import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NewBadgeProps {
  className?: string;
}

export function NewBadge({ className }: NewBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: [1, 1.2, 1], opacity: 1 }}
      transition={{ 
        duration: 1.5,
        repeat: Infinity,
        repeatType: "reverse",
      }}
      className={cn(
        "absolute flex h-4 w-4 items-center justify-center rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-red-300",
        className
      )}
    >
      <span className="text-[10px] font-bold text-white leading-none">!</span>
    </motion.div>
  );
}
