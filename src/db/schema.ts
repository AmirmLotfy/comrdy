import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
export const records = pgTable("comrdy_state", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
