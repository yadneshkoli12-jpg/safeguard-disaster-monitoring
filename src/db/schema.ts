import { pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const sosIncidents = pgTable("sos_incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracyMeters: real("accuracy_meters"),
  status: varchar("status", { length: 24 }).default("initiated").notNull(),
  deliveryStatus: varchar("delivery_status", { length: 32 }).default("not_configured").notNull(),
  note: text("note"),
});
