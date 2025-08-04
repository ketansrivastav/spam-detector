import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Container } from "./container";
import 'dotenv/config'

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per window
});

export class App {
  private express: Express;
  constructor(private container: Container) {
    this.express = express();
    this.setupMiddleware();
    this.container.router.setupRoutes(this.express);
     this.setupErrorMiddleware();
  }
  private setupMiddleware(): void {
    this.express.use(helmet());
    this.express.use(limiter);
    this.express.use(express.json({ limit: "1mb" }));
    this.express.use(express.urlencoded({ extended: true }));

    //logging middleware
    this.express.use((req: Request, res: Response, next: NextFunction) => {
      this.container.logger.log("info", `${req.method} ${req.path}`);
      next();
    });

  }


  private setupErrorMiddleware() {
    //error middleware
    this.express.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {

        // Send clean response to client
        res.status(500).json({
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "development"
              ? err.message
              : "Something went wrong",
        });
         next();
      },
    );

  }
  listen(port: number): void {
    this.express.listen(port, () => {
      this.container.logger.log(
        "info",
        `[App] Spam Detection Service running on port ${port}`,
      );
    });
  }
}
