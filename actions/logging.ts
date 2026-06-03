import { db } from "@/db";
import { activityLogs } from "@/db/schema";

export type EntityType = 'user' | 'seller_profile' | 'seller_document' | 'product' | 'quotation' | 'order' | 'inventory_transaction';

/**
 * Creates an audit log entry in the activity_logs table.
 * Supports passing a custom Drizzle transaction context (tx) or defaults to the global db client.
 */
export async function logActivity(
  txOrDb: any,
  userId: string,
  action: string,
  entityType: EntityType,
  entityId: string | null,
  metadata: Record<string, any> = {}
) {
  const client = txOrDb || db;
  await client.insert(activityLogs).values({
    userId,
    action,
    entityType,
    entityId,
    metadata,
  });
}
