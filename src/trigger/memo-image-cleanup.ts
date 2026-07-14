import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const memoImageCleanupCron = schedules.task({
  id: "memo-image-cleanup-cron",
  // 15:00 UTC is exactly 00:00 KST (Midnight in Korea)
  cron: "0 15 * * *", 
  maxDuration: 300, // 5 minutes
  run: async (payload, { ctx }) => {
    logger.info("Starting Memo Image Cleanup cron job");

    // Calculate the threshold date: 3 days ago from now
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 3);
    const thresholdIso = thresholdDate.toISOString();

    logger.info(`Searching for completed orders updated before ${thresholdIso}`);

    // Fetch orders that have been completed for more than 3 days and have a memo image
    const { data: targetOrders, error } = await supabase
      .from("orders")
      .select("id, memo_image_path")
      .eq("status", "completed")
      .not("memo_image_path", "is", null)
      .lt("updated_at", thresholdIso);

    if (error) {
      logger.error("Failed to fetch target orders", { error });
      throw error;
    }

    if (!targetOrders || targetOrders.length === 0) {
      logger.info("No memo images found to clean up.");
      return { processed: 0 };
    }

    logger.info(`Found ${targetOrders.length} images to clean up.`);

    const pathsToDelete = targetOrders.map(order => order.memo_image_path).filter(Boolean) as string[];

    if (pathsToDelete.length > 0) {
      // 1. Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("order-memos")
        .remove(pathsToDelete);

      if (storageError) {
        logger.error("Failed to delete images from storage", { error: storageError });
      } else {
        logger.info(`Successfully deleted ${pathsToDelete.length} files from storage.`);
      }
    }

    // 2. Clear the database fields
    const orderIds = targetOrders.map(o => o.id);
    
    // Supabase JS doesn't have an 'in' update out of the box for multiple, but we can update in bulk using 'in' filter
    const { error: dbError } = await supabase
      .from("orders")
      .update({ 
        memo_image_url: null, 
        memo_image_path: null 
      })
      .in("id", orderIds);

    if (dbError) {
      logger.error("Failed to clear memo image fields in DB", { error: dbError });
      throw dbError;
    }

    logger.info("Memo Image Cleanup completed successfully.", { count: orderIds.length });
    
    return {
      processed: orderIds.length,
      deletedFiles: pathsToDelete.length
    };
  },
});
