var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activities: () => activities,
  curricularComponents: () => curricularComponents,
  holidays: () => holidays,
  insertActivitySchema: () => insertActivitySchema,
  insertCurricularComponentSchema: () => insertCurricularComponentSchema,
  insertHolidaySchema: () => insertHolidaySchema
});
import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var curricularComponents = pgTable("curricular_components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  color: text("color").notNull(),
  weekDays: text("week_days").array().notNull(),
  startTime: text("start_time"),
  endTime: text("end_time")
});
var holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull()
});
var activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  modality: text("modality").notNull(),
  componentId: integer("component_id").references(() => curricularComponents.id),
  deliveryDate: text("delivery_date").notNull(),
  realizationDate: text("realization_date").notNull(),
  status: text("status").notNull().default("pending"),
  observation: text("observation")
});
var insertCurricularComponentSchema = createInsertSchema(curricularComponents).omit({
  id: true
});
var insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true
});
var insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  status: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  // Curricular Components
  async getCurricularComponents() {
    return await db.select().from(curricularComponents);
  }
  async getCurricularComponent(id) {
    const [component] = await db.select().from(curricularComponents).where(eq(curricularComponents.id, id));
    return component || void 0;
  }
  async createCurricularComponent(component) {
    const [newComponent] = await db.insert(curricularComponents).values(component).returning();
    return newComponent;
  }
  async updateCurricularComponent(id, component) {
    const [updated] = await db.update(curricularComponents).set(component).where(eq(curricularComponents.id, id)).returning();
    return updated || void 0;
  }
  async deleteCurricularComponent(id) {
    const result = await db.delete(curricularComponents).where(eq(curricularComponents.id, id));
    return (result.rowCount || 0) > 0;
  }
  // Holidays
  async getHolidays() {
    return await db.select().from(holidays);
  }
  async createHoliday(holiday) {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }
  async deleteHoliday(id) {
    const result = await db.delete(holidays).where(eq(holidays.id, id));
    return (result.rowCount || 0) > 0;
  }
  // Activities
  async getActivities() {
    return await db.select().from(activities);
  }
  async getActivity(id) {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || void 0;
  }
  async createActivity(activity) {
    const [newActivity] = await db.insert(activities).values({ ...activity, status: "pending" }).returning();
    return newActivity;
  }
  async updateActivity(id, activity) {
    const [updated] = await db.update(activities).set(activity).where(eq(activities.id, id)).returning();
    return updated || void 0;
  }
  async deleteActivity(id) {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return (result.rowCount || 0) > 0;
  }
  async getActivitiesByDate(date) {
    return await db.select().from(activities).where(eq(activities.realizationDate, date));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/curricular-components", async (req, res) => {
    try {
      const components = await storage.getCurricularComponents();
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curricular components" });
    }
  });
  app2.post("/api/curricular-components", async (req, res) => {
    try {
      const component = insertCurricularComponentSchema.parse(req.body);
      const newComponent = await storage.createCurricularComponent(component);
      res.status(201).json(newComponent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid component data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create curricular component" });
      }
    }
  });
  app2.put("/api/curricular-components/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const component = insertCurricularComponentSchema.partial().parse(req.body);
      const updatedComponent = await storage.updateCurricularComponent(id, component);
      if (!updatedComponent) {
        return res.status(404).json({ message: "Component not found" });
      }
      res.json(updatedComponent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid component data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update curricular component" });
      }
    }
  });
  app2.delete("/api/curricular-components/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCurricularComponent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Component not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete curricular component" });
    }
  });
  app2.get("/api/holidays", async (req, res) => {
    try {
      const holidays2 = await storage.getHolidays();
      res.json(holidays2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });
  app2.post("/api/holidays", async (req, res) => {
    try {
      const holiday = insertHolidaySchema.parse(req.body);
      const newHoliday = await storage.createHoliday(holiday);
      res.status(201).json(newHoliday);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid holiday data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create holiday" });
      }
    }
  });
  app2.delete("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHoliday(id);
      if (!deleted) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });
  app2.get("/api/activities", async (req, res) => {
    try {
      const activities2 = await storage.getActivities();
      res.json(activities2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });
  app2.get("/api/activities/date/:date", async (req, res) => {
    try {
      const date = req.params.date;
      const activities2 = await storage.getActivitiesByDate(date);
      res.json(activities2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities by date" });
    }
  });
  app2.post("/api/activities", async (req, res) => {
    try {
      const activity = insertActivitySchema.parse(req.body);
      const newActivity = await storage.createActivity(activity);
      res.status(201).json(newActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create activity" });
      }
    }
  });
  app2.put("/api/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const activity = z.object({
        status: z.string().optional(),
        observation: z.string().optional()
      }).parse(req.body);
      const updatedActivity = await storage.updateActivity(id, activity);
      if (!updatedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update activity" });
      }
    }
  });
  app2.delete("/api/activities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteActivity(id);
      if (!deleted) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  base: "/cronograma/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
