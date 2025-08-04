import { Request, Response, NextFunction, Express } from "express";
import { SpamDetectionController } from "../controllers/spamDetectorController";
import { Logger } from "../types";
import { CacheService } from "../services/cacheService";

export class Router {
  constructor(
    private spamController: SpamDetectionController,
    private logger: Logger,
    private cacheService: CacheService,
  ) {
    this.logger.log("info", "[Router] Router initialized with controllers");
  }

  setupRoutes(app: Express): void {
    app.post("/api/v1/detect", async (req: Request, res: Response, next: NextFunction) => {
      this.spamController.detect(req, res, next)
    },
    );

    app.get("/api/v1/health", (req, res) => {
      this.logger.log("info", "[Router] Health check requested");
      res.json({ status: "ok", timestamp: new Date() });
    });
    this.logger.log("info", "[Router] All routes configured");

    app.post("/admin/refresh-rules", async (req, res) => {
      this.logger.log("info", "[Router] Cache refresh request");
      await this.cacheService.del("spam:rules");
      res.json({ status: "Rules cache cleared" });
    });

  }
}
