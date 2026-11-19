import {
  bigint,
  boolean,
  integer,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inquiriesTable = pgTable(
  "contact_inquiries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    requestId: varchar("request_id", { length: 36 }).notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    support: varchar("support", { length: 64 }).notNull(),
    message: varchar("message", { length: 2000 }).notNull().default(""),
    consent: boolean("consent").notNull(),
    startedAt: bigint("started_at", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("contact_inquiries_request_id_unique").on(table.requestId)],
);

export const insertInquirySchema = createInsertSchema(inquiriesTable).omit({
  createdAt: true,
});
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiriesTable.$inferSelect;

export const contactRateLimitsTable = pgTable("contact_rate_limits", {
  ipHash: varchar("ip_hash", { length: 64 }).primaryKey(),
  minuteStart: timestamp("minute_start", { withTimezone: true }).notNull(),
  minuteCount: integer("minute_count").notNull(),
  hourStart: timestamp("hour_start", { withTimezone: true }).notNull(),
  hourCount: integer("hour_count").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertContactRateLimitSchema = createInsertSchema(
  contactRateLimitsTable,
).omit({ updatedAt: true });
export type InsertContactRateLimit = z.infer<typeof insertContactRateLimitSchema>;
export type ContactRateLimit = typeof contactRateLimitsTable.$inferSelect;